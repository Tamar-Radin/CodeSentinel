"""Layer 1 — Software Composition Analysis (A03:2025 Software Supply Chain Failures)."""
import json
import subprocess


def run_sca(target_path: str) -> list[dict]:
    findings = []
    findings += _run_pip_audit(target_path)
    # TODO: add npm audit / osv-scanner for JS/TS targets
    return findings


def _run_pip_audit(target_path: str) -> list[dict]:
    try:
        result = subprocess.run(
            ["pip-audit", "--path", target_path, "--format", "json"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=180,
        )
        raw = json.loads(result.stdout or "{}")
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return []

    findings = []
    for dep in raw.get("dependencies", []):
        for vuln in dep.get("vulns", []):
            findings.append({
                "file": "requirements.txt",
                "line": None,
                "check_id": vuln.get("id"),
                "owasp_id": "A03:2025",
                "tool": "pip-audit",
                "severity": "unknown",
                "message": f"{dep.get('name')}=={dep.get('version')}: {vuln.get('id')}",
            })
    return findings
