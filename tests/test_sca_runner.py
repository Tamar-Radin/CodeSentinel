import json

from detectors import sca_runner


def test_run_pip_audit_fails_soft_when_binary_missing(monkeypatch):
    def fake_run(*args, **kwargs):
        raise FileNotFoundError("pip-audit not found")

    monkeypatch.setattr(sca_runner.subprocess, "run", fake_run)
    assert sca_runner._run_pip_audit("/target") == []


def test_run_pip_audit_normalizes_result_shape(monkeypatch):
    class FakeResult:
        stdout = json.dumps({
            "dependencies": [
                {"name": "flask", "version": "1.0", "vulns": [{"id": "PYSEC-2021-1"}]},
            ]
        })

    monkeypatch.setattr(sca_runner.subprocess, "run", lambda *a, **k: FakeResult())
    findings = sca_runner._run_pip_audit("/target")
    assert findings == [{
        "file": "requirements.txt",
        "line": None,
        "check_id": "PYSEC-2021-1",
        "owasp_id": "A03:2025",
        "tool": "pip-audit",
        "severity": "unknown",
        "message": "flask==1.0: PYSEC-2021-1",
    }]


def test_run_npm_audit_returns_empty_when_npm_not_on_path(monkeypatch):
    monkeypatch.setattr(sca_runner.shutil, "which", lambda name: None)
    assert sca_runner._run_npm_audit("/target") == []


def test_run_osv_scanner_returns_empty_when_binary_not_on_path(monkeypatch):
    monkeypatch.setattr(sca_runner.shutil, "which", lambda name: None)
    assert sca_runner._run_osv_scanner("/target") == []


def test_run_osv_scanner_fails_soft_on_invalid_json(monkeypatch):
    monkeypatch.setattr(sca_runner.shutil, "which", lambda name: "/usr/bin/osv-scanner")

    class FakeResult:
        stdout = "not json"

    monkeypatch.setattr(sca_runner.subprocess, "run", lambda *a, **k: FakeResult())
    assert sca_runner._run_osv_scanner("/target") == []


def test_run_osv_scanner_skips_ecosystems_already_covered_by_dedicated_tools(monkeypatch, tmp_path):
    # PyPI/npm findings should be dropped here since pip-audit/npm-audit already report them —
    # only ecosystems with no dedicated tool (e.g. Go) should come through osv-scanner.
    monkeypatch.setattr(sca_runner.shutil, "which", lambda name: "/usr/bin/osv-scanner")
    raw = {
        "results": [{
            "source": {"path": str(tmp_path / "go.sum")},
            "packages": [
                {
                    "package": {"name": "golang.org/x/text", "version": "0.3.0", "ecosystem": "Go"},
                    "vulnerabilities": [{
                        "id": "GHSA-xxxx", "summary": "bad text package",
                        "database_specific": {"severity": "HIGH"},
                    }],
                },
                {
                    "package": {"name": "flask", "version": "1.0", "ecosystem": "PyPI"},
                    "vulnerabilities": [{"id": "PYSEC-1"}],
                },
            ],
        }]
    }

    class FakeResult:
        stdout = json.dumps(raw)

    monkeypatch.setattr(sca_runner.subprocess, "run", lambda *a, **k: FakeResult())
    findings = sca_runner._run_osv_scanner(str(tmp_path))
    assert len(findings) == 1
    finding = findings[0]
    assert finding["tool"] == "osv-scanner"
    assert finding["owasp_id"] == "A03:2025"
    assert finding["severity"] == "HIGH"
    assert finding["check_id"] == "GHSA-xxxx"
    assert finding["file"] == "go.sum"
    assert "golang.org/x/text==0.3.0 (Go)" in finding["message"]


def test_run_sca_combines_all_three_sources(monkeypatch):
    monkeypatch.setattr(sca_runner, "_run_pip_audit", lambda t: [{"tool": "pip-audit"}])
    monkeypatch.setattr(sca_runner, "_run_npm_audit", lambda t: [{"tool": "npm-audit"}])
    monkeypatch.setattr(sca_runner, "_run_osv_scanner", lambda t: [{"tool": "osv-scanner"}])
    findings = sca_runner.run_sca("/target")
    assert {f["tool"] for f in findings} == {"pip-audit", "npm-audit", "osv-scanner"}
