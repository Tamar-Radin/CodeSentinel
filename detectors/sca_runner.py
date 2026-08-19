"""Layer 1 — Software Composition Analysis (A03:2025 Software Supply Chain Failures)."""
import json
import shutil
import subprocess


def run_sca(target_path: str) -> list[dict]:
    findings = []
    findings += _run_pip_audit(target_path)
    findings += _run_npm_audit(target_path)
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


def _run_npm_audit(target_path: str) -> list[dict]:
    # On Windows, npm is a .CMD shim — subprocess.run(["npm", ...]) raises FileNotFoundError
    # even when npm is installed and on PATH, because CreateProcess doesn't resolve PATHEXT the
    # way a shell would. shutil.which() does that resolution (cross-platform, no-op on
    # POSIX where "npm" is directly executable), so use it instead of the bare command name.
    npm = shutil.which("npm")
    if npm is None:
        return []
    try:
        result = subprocess.run(
            [npm, "audit", "--json"],
            cwd=target_path,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=180,
        )
        raw = json.loads(result.stdout or "{}")
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        # target has no package.json/package-lock.json, or npm couldn't resolve the tree —
        # return empty so the pipeline still runs end-to-end, same policy as pip-audit above.
        # (npm exits non-zero when vulnerabilities are found, which is expected here — we only
        # care whether stdout parsed as JSON.)
        return []

    findings = []
    for pkg_name, vuln in raw.get("vulnerabilities", {}).items():
        # "via" mixes plain package-name strings (transitive references) with advisory objects
        # ({title, url, severity, ...}) — only the objects carry a human-readable description.
        advisories = [v for v in vuln.get("via", []) if isinstance(v, dict)]
        titles = ", ".join(a["title"] for a in advisories if a.get("title")) or pkg_name
        check_id = advisories[0].get("url") if advisories else pkg_name
        findings.append({
            "file": "package-lock.json",
            "line": None,
            "check_id": check_id,
            "owasp_id": "A03:2025",
            "tool": "npm-audit",
            "severity": vuln.get("severity", "unknown"),
            "message": f"{pkg_name}: {titles}",
        })
    return findings
