"""Pure helpers for rendering Layer 4 (agents/chain_correlator.py) chain data in the dashboard.
Kept free of the streamlit import so this logic is testable without a Streamlit runtime — see
dashboard/app.py, which is the only caller."""


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


def combined_chains(findings: list[dict]) -> list[dict]:
    """One row per combined (multi-finding) chain. A chain is attached to every finding it
    involves (see agents/chain_correlator.py::_attach_chains), so entries are deduped here by
    the set of finding indices + target index + narrative."""
    seen = set()
    rows = []
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
            rows.append(
                {
                    "Findings": ", ".join(f"{ref['file']}:{ref['line']}" for ref in chain["findings"]),
                    "Target": f"{chain['target']['file']}:{chain['target']['line']}",
                    "Narrative": chain["narrative"],
                }
            )
    return rows
