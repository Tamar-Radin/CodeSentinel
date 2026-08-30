#!/usr/bin/env python3
"""CI helper: turn a findings.json produced by scan.py into a Markdown PR-comment body.

Usage: python ci/format_pr_comment.py findings.json pr_comment.md [artifact_url]

artifact_url, when given, is the download link for the uploaded findings.json artifact
(actions/upload-artifact@v4's `artifact-url` output) — used to link to the full findings list
when there are more than MAX_ROWS_IN_COMMENT of them. Omitted for local/manual runs, where the
comment falls back to naming the artifact instead of linking it.

Writes the output file itself (rather than relying on `> pr_comment.md` shell redirection)
so the encoding is always explicit UTF-8 — stdout redirection picks up the console's/locale's
encoding instead, which silently mangles non-ASCII text on Windows.

Kept as a separate, pure-Python step (no GitHub API calls here) so the formatting logic is
testable on its own — the workflow step that actually talks to GitHub only reads the file this
script writes. See ci/github-action.yml.
"""
import json
import sys

# Prepended to the comment body and used to find-and-update the same comment on later pushes to
# the same PR, instead of leaving a new comment behind on every run.
COMMENT_MARKER = "<!-- security-agent-scan -->"

SEVERITY_ORDER = ["critical", "high", "medium", "low", "unknown"]

# detectors/semgrep_runner.py passes through Semgrep's own severity vocabulary (ERROR/WARNING/
# INFO) unchanged, rather than the critical/high/medium/low scale the other layers use — without
# this, every Semgrep-sourced finding (the majority of layer-1 output) would fall into
# "unknown" in the summary counts below, even though the per-row table still shows a severity.
_SEMGREP_SEVERITY_MAP = {"error": "high", "warning": "medium", "info": "low"}

# Keep the comment well under GitHub's ~65k character limit per comment, and readable — link to
# the uploaded findings.json artifact for the rest rather than dumping everything inline.
MAX_ROWS_IN_COMMENT = 20

# Diffs are the most char-expensive thing in the comment (Layer 5) — cap how many are inlined,
# separately from MAX_ROWS_IN_COMMENT, so a run with many patchable findings can't blow the
# comment size budget on its own.
MAX_PATCHES_IN_COMMENT = 5


def format_comment(findings: list[dict], artifact_url: str | None = None) -> str:
    if not findings:
        return f"{COMMENT_MARKER}\n### Security Agent scan\n\nNo findings.\n"

    counts_by_severity: dict[str, int] = {}
    for f in findings:
        sev = _severity_key(f)
        counts_by_severity[sev] = counts_by_severity.get(sev, 0) + 1
    counts_line = ", ".join(
        f"{sev}: {counts_by_severity[sev]}" for sev in SEVERITY_ORDER if sev in counts_by_severity
    )

    ranked = sorted(findings, key=lambda f: SEVERITY_ORDER.index(_severity_key(f)))

    lines = [
        COMMENT_MARKER,
        "### Security Agent scan",
        "",
        f"**{len(findings)} finding(s)** — {counts_line}",
        "",
        "| Severity | OWASP | File | Line | Message |",
        "|---|---|---|---|---|",
    ]
    for f in ranked[:MAX_ROWS_IN_COMMENT]:
        # Escape "|" so a finding's message/reasoning (which can echo attacker-controlled text
        # from the scanned repo — see prompt_injection_attempt findings) can't break the table
        # structure; truncate so one long message can't push everything else out of view.
        message = str(f.get("message") or f.get("reasoning") or "").replace("|", "\\|")
        message = " ".join(message.split())[:150]
        lines.append(
            f"| {f.get('severity') or 'unknown'} | {f.get('owasp_id') or '?'} "
            f"| `{f.get('file') or '?'}` | {f.get('line') or '?'} | {message} |"
        )

    if len(findings) > MAX_ROWS_IN_COMMENT:
        lines.append("")
        remaining = len(findings) - MAX_ROWS_IN_COMMENT
        if artifact_url:
            lines.append(f"...and {remaining} more. See the [full findings.json]({artifact_url}) for the complete list.")
        else:
            lines.append(
                f"...and {remaining} more. See the `security-agent-findings` workflow artifact "
                "for the full list."
            )

    chains = _combined_chains(findings)
    if chains:
        lines.append("")
        lines.append("**Attack chains (multi-finding)** — findings that only matter combined:")
        for chain in chains:
            contributors = ", ".join(f"`{ref.get('file')}:{ref.get('line')}`" for ref in chain["findings"])
            target = f"`{chain['target'].get('file')}:{chain['target'].get('line')}`"
            narrative = " ".join(str(chain["narrative"]).split()).replace("|", "\\|")
            lines.append(f"- {contributors} → {target}: {narrative}")

    patched = [f for f in findings if f.get("proposed_patch", {}).get("patchable")]
    if patched:
        lines.append("")
        lines.append(
            "**Proposed patches (Layer 5)** — for human review only, never auto-applied:"
        )
        for f in patched[:MAX_PATCHES_IN_COMMENT]:
            patch = f["proposed_patch"]
            location = f"`{f.get('file') or '?'}:{f.get('line') or '?'}`"
            explanation = " ".join(str(patch.get("explanation") or "").split())
            lines.append("")
            lines.append(f"<details><summary>{location} — {explanation}</summary>")
            lines.append("")
            lines.append("```diff")
            lines.append(str(patch.get("diff") or ""))
            lines.append("```")
            lines.append("</details>")
        if len(patched) > MAX_PATCHES_IN_COMMENT:
            lines.append("")
            lines.append(
                f"...and {len(patched) - MAX_PATCHES_IN_COMMENT} more proposed patch(es) in the findings artifact."
            )

    return "\n".join(lines) + "\n"


def _combined_chains(findings: list[dict]) -> list[dict]:
    """Combined (multi-finding) chains are attached to every finding they involve (see
    agents/chain_correlator.py::_attach_chains) — dedup here by the set of finding indices +
    target index + narrative so each chain is only listed once."""
    seen = set()
    chains = []
    for f in findings:
        for chain in f.get("attack_chains", []):
            if chain.get("relationship") != "combined":
                continue
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


def _severity_key(finding: dict) -> str:
    severity = str(finding.get("severity") or "unknown").lower()
    severity = _SEMGREP_SEVERITY_MAP.get(severity, severity)
    return severity if severity in SEVERITY_ORDER else "unknown"


def main():
    in_path = sys.argv[1] if len(sys.argv) > 1 else "findings.json"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "pr_comment.md"
    artifact_url = sys.argv[3] if len(sys.argv) > 3 else None
    with open(in_path, encoding="utf-8") as f:
        findings = json.load(f)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(format_comment(findings, artifact_url))


if __name__ == "__main__":
    main()
