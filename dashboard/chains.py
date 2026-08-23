"""Pure helpers for rendering Layer 4 (agents/chain_correlator.py) chain data in the dashboard.
Kept free of the streamlit import so this logic is testable without a Streamlit runtime — see
dashboard/app.py, which is the only caller."""

_NARRATIVE_TRUNCATE = 80


def pairwise_edges(findings: list[dict]) -> list[dict]:
    """One row per sequential/amplifying edge, read off each finding's own "enables" list (its
    mirror "enabled_by" on the target is skipped so each edge isn't rendered twice)."""
    return [
        {
            "From": f"{f.get('file')}:{f.get('line')}",
            "To": f"{e.get('file')}:{e.get('line')}",
            "Relationship": e.get("relationship", "sequential"),
            "Narrative": e.get("narrative"),
        }
        for f in findings
        for e in f.get("enables", [])
    ]


def _dedup_combined_chains(findings: list[dict]) -> list[dict]:
    """The raw chain dicts (as attached by _attach_chains), deduped. A chain is attached to
    every finding it involves, so the same chain dict shows up once per participant — dedup by
    the set of finding indices + target index + narrative."""
    seen = set()
    chains = []
    for f in findings:
        for chain in f.get("attack_chains", []):
            key = (
                tuple(sorted(ref["index"] for ref in chain["findings"])),
                chain["target"]["index"],
                chain["narrative"],
            )
            if key in seen:
                continue
            seen.add(key)
            chains.append(chain)
    return chains


def combined_chains(findings: list[dict]) -> list[dict]:
    """One display row per combined (multi-finding) chain."""
    return [
        {
            "Findings": ", ".join(f"{ref['file']}:{ref['line']}" for ref in chain["findings"]),
            "Target": f"{chain['target']['file']}:{chain['target']['line']}",
            "Narrative": chain["narrative"],
        }
        for chain in _dedup_combined_chains(findings)
    ]


def build_graph_dot(findings: list[dict]) -> str | None:
    """Graphviz DOT source for st.graphviz_chart — a visual node/edge diagram of every
    sequential/amplifying edge and combined chain. Returns None when there's nothing to draw
    (chains are optional enrichment; an empty graph is a valid, common state).

    DOT edges are strictly pairwise, so a combined chain (A + B -> C) is drawn with a small
    diamond junction node that every contributor points into, which then points at the target —
    this keeps the picture honest that A and B are joint prerequisites, not two independent
    edges into C (see agents/chain_correlator.py's system prompt for why that distinction
    matters)."""
    edges = pairwise_edges(findings)
    chains = _dedup_combined_chains(findings)
    if not edges and not chains:
        return None

    lines = [
        "digraph attack_chains {",
        "  rankdir=LR;",
        '  node [shape=box, style=filled, fillcolor="#e0e7ff", fontname="Helvetica", fontsize=11];',
        '  edge [fontname="Helvetica", fontsize=10];',
    ]

    for e in edges:
        style = "dashed" if e["Relationship"] == "amplifies" else "solid"
        lines.append(
            f"  {_dot_id(e['From'])} -> {_dot_id(e['To'])} "
            f"[label={_dot_str(e['Relationship'])}, style={style}];"
        )

    for i, chain in enumerate(chains):
        junction = f"_combined_{i}"
        target_key = f"{chain['target']['file']}:{chain['target']['line']}"
        lines.append(
            f'  {junction} [shape=diamond, width=0.12, height=0.12, label="", '
            'fillcolor="#fca5a5"];'
        )
        for ref in chain["findings"]:
            contributor_key = f"{ref['file']}:{ref['line']}"
            lines.append(f"  {_dot_id(contributor_key)} -> {junction} [arrowhead=none, style=dotted];")
        label = "combined: " + _truncate(str(chain["narrative"]))
        lines.append(
            f"  {junction} -> {_dot_id(target_key)} "
            f'[label={_dot_str(label)}, color="#dc2626", penwidth=1.5];'
        )

    lines.append("}")
    return "\n".join(lines)


def _truncate(text: str, limit: int = _NARRATIVE_TRUNCATE) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _dot_str(text: str) -> str:
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _dot_id(key: str) -> str:
    # Quoted DOT identifiers can hold arbitrary text (file paths, colons), so the node's own
    # display key doubles as both its id and its default label.
    return _dot_str(key)
