import subprocess

from detectors import semgrep_runner
from detectors.semgrep_runner import _map_to_owasp, run_semgrep


def test_map_to_owasp_prefers_rule_metadata_tag():
    owasp_id = _map_to_owasp("some.sql-injection.rule", {"owasp": ["A05:2025 - Injection"]})
    assert owasp_id == "A05:2025"


def test_map_to_owasp_accepts_single_string_tag_not_just_list():
    owasp_id = _map_to_owasp("some.rule", {"owasp": "A02:2025 - Misconfig"})
    assert owasp_id == "A02:2025"


def test_map_to_owasp_falls_back_to_check_id_substring():
    owasp_id = _map_to_owasp("javascript.express.sql-injection.rule", {})
    assert owasp_id == "A05:2025"


def test_map_to_owasp_unmapped_when_no_tag_and_no_fallback_hit():
    owasp_id = _map_to_owasp("some.totally-unrelated.rule", {})
    assert owasp_id == "UNMAPPED"


def test_run_semgrep_fails_soft_when_binary_missing(monkeypatch):
    def fake_run(*args, **kwargs):
        raise FileNotFoundError("semgrep not found")

    monkeypatch.setattr(semgrep_runner.subprocess, "run", fake_run)
    assert run_semgrep("/some/target") == []


def test_run_semgrep_fails_soft_on_timeout(monkeypatch):
    def fake_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="semgrep", timeout=300)

    monkeypatch.setattr(semgrep_runner.subprocess, "run", fake_run)
    assert run_semgrep("/some/target") == []


def test_run_semgrep_fails_soft_on_invalid_json(monkeypatch):
    class FakeResult:
        stdout = "not json"

    monkeypatch.setattr(semgrep_runner.subprocess, "run", lambda *a, **k: FakeResult())
    assert run_semgrep("/some/target") == []


def test_run_semgrep_normalizes_result_shape(monkeypatch):
    class FakeResult:
        stdout = (
            '{"results": [{"path": "app.py", "start": {"line": 10}, '
            '"check_id": "python.sql-injection.rule", '
            '"extra": {"severity": "ERROR", "message": "sqli", '
            '"metadata": {"owasp": ["A05:2025"]}}}]}'
        )

    monkeypatch.setattr(semgrep_runner.subprocess, "run", lambda *a, **k: FakeResult())
    findings = run_semgrep("/some/target")
    assert findings == [{
        "file": "app.py",
        "line": 10,
        "check_id": "python.sql-injection.rule",
        "owasp_id": "A05:2025",
        "tool": "semgrep",
        "severity": "ERROR",
        "message": "sqli",
    }]
