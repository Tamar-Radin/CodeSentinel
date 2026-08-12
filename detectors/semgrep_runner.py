"""Layer 1 — Semgrep runner. Produces normalized findings: {file, line, owasp_id, tool, severity}."""
import json
import re
import subprocess

RULESETS = ["p/owasp-top-ten", "p/security-audit", "p/secrets"]

_OWASP_2025_RE = re.compile(r"(A\d{2}:2025)")

# Fallback only: used when a rule's own metadata carries no OWASP tag at all. Most rules in
# p/owasp-top-ten and p/security-audit already tag themselves (extra.metadata.owasp, e.g.
# "A05:2025 - Injection"), which is preferred below since it's Semgrep's own classification
# rather than a guess from the check_id string.
CHECK_ID_FALLBACK = {
    "sql-injection": "A05:2025",
    "command-injection": "A05:2025",
    "hardcoded-secret": "A04:2025",
    "cors": "A02:2025",
}


def _map_to_owasp(check_id: str, metadata: dict) -> str:
    owasp_tags = metadata.get("owasp") or []
    if isinstance(owasp_tags, str):
        owasp_tags = [owasp_tags]
    for tag in owasp_tags:
        match = _OWASP_2025_RE.match(tag.strip())
        if match:
            return match.group(1)

    for key, owasp_id in CHECK_ID_FALLBACK.items():
        if key in check_id:
            return owasp_id
    return "UNMAPPED"


def run_semgrep(target_path: str) -> list[dict]:
    try:
        result = subprocess.run(
            ["semgrep", "scan", "--json", *[f"--config={r}" for r in RULESETS], target_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=300,
        )
        raw = json.loads(result.stdout or "{}")
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        # Semgrep not installed yet / scan failed — return empty so the pipeline still runs end-to-end.
        return []

    findings = []
    for r in raw.get("results", []):
        check_id = r.get("check_id", "")
        metadata = r.get("extra", {}).get("metadata", {})
        findings.append({
            "file": r.get("path"),
            "line": r.get("start", {}).get("line"),
            "check_id": check_id,
            "owasp_id": _map_to_owasp(check_id, metadata),
            "tool": "semgrep",
            "severity": r.get("extra", {}).get("severity"),
            "message": r.get("extra", {}).get("message"),
        })
    return findings
