"""Orchestration tests for RuntimeVerifier.verify_all() — these stub out the adapter registry
and the sandbox launcher (via monkeypatch, same style as tests/test_orchestrator.py stubbing
each pipeline layer) so the funnel/selection/failure-handling logic is tested in isolation from
any real subprocess or HTTP call. The two real Phase-1 recipes get their own coverage via
test_verification_oracles.py (pure oracle logic) and a manual/live check (see the plan doc) —
mocking their actual HTTP behavior here would defeat the point of a runtime check."""
import contextlib

import verification.runtime_verifier as runtime_verifier_module
from verification import oracles, recipes, sandbox
from verification.registry import REGISTERED_ADAPTERS
from verification.runtime_verifier import RuntimeVerifier
from verification.types import Evidence, VerificationStatus


class _FakeAdapter:
    name = "fake_adapter"
    recognized_path = "RECOGNIZED"

    def __init__(self, target_path):
        self.target_path = target_path

    @classmethod
    def identify(cls, target_path):
        return target_path == cls.recognized_path

    def start(self, sandbox_dir, startup_timeout_s):
        return "http://fake"

    def stop(self):
        pass

    def resolve_endpoint(self, file, line):
        return None


class _FailingStartAdapter(_FakeAdapter):
    name = "failing_start_adapter"

    def start(self, sandbox_dir, startup_timeout_s):
        raise TimeoutError("did not become ready")


@contextlib.contextmanager
def _fake_launch_ok(adapter, target_path, startup_timeout_s, total_timeout_s):
    yield adapter.start("sandbox", startup_timeout_s), "sandbox_dir"


@contextlib.contextmanager
def _fake_launch_raises(adapter, target_path, startup_timeout_s, total_timeout_s):
    adapter.start("sandbox", startup_timeout_s)  # raises before ever yielding
    yield "unreachable", "unreachable"  # pragma: no cover


def _register_fake_recipe_and_oracle(monkeypatch, pattern_name, recipe_fn, oracle_fn):
    monkeypatch.setitem(recipes.RECIPE_REGISTRY, pattern_name, recipe_fn)
    monkeypatch.setitem(oracles.ORACLE_REGISTRY, pattern_name, oracle_fn)


def test_verify_all_returns_findings_completely_unmodified_when_target_not_recognized(monkeypatch):
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FakeAdapter])
    findings = [{"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": 1}]

    result = RuntimeVerifier().verify_all(findings, target_path="UNRECOGNIZED")

    assert result == findings
    assert result[0] is findings[0]
    assert "runtime_verification" not in result[0]


def test_verify_all_leaves_ineligible_pattern_findings_untouched(monkeypatch):
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FakeAdapter])
    findings = [{"pattern": "weak_password_hashing", "confidence": 0.9, "file": "a.py", "line": 1}]

    result = RuntimeVerifier().verify_all(findings, target_path=_FakeAdapter.recognized_path)

    assert "runtime_verification" not in result[0]


def test_verify_all_marks_findings_beyond_capacity_as_not_attempted(monkeypatch):
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FakeAdapter])
    monkeypatch.setattr(sandbox, "launch", _fake_launch_ok)

    def fake_recipe(adapter, finding, base_url, sandbox_dir):
        return Evidence(attack={"status": 200, "readback_status": 404})

    def fake_oracle(evidence):
        return VerificationStatus.CONFIRMED

    _register_fake_recipe_and_oracle(monkeypatch, "stubbed_auth_check", fake_recipe, fake_oracle)

    findings = [
        {"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": 1},
        {"pattern": "stubbed_auth_check", "confidence": 0.8, "file": "b.py", "line": 1},
    ]

    verifier = RuntimeVerifier(max_verifications_per_run=1)
    result = verifier.verify_all(findings, target_path=_FakeAdapter.recognized_path)

    assert result[0]["runtime_verification"]["status"] == "confirmed"
    deferred = result[1]["runtime_verification"]
    assert deferred["status"] == "not_attempted"
    assert deferred["reason"] == "capacity_exceeded"


def test_not_attempted_is_never_confused_with_a_negative_verdict(monkeypatch):
    # Regression guard for the metrics contract in the design doc: not_attempted must remain a
    # status distinct from not_confirmed/inconclusive, never silently treated as either.
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FakeAdapter])
    monkeypatch.setattr(sandbox, "launch", _fake_launch_ok)

    def fake_recipe(adapter, finding, base_url, sandbox_dir):
        return Evidence()

    def fake_oracle(evidence):
        return VerificationStatus.CONFIRMED

    _register_fake_recipe_and_oracle(monkeypatch, "stubbed_auth_check", fake_recipe, fake_oracle)

    findings = [{"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": i} for i in range(3)]
    verifier = RuntimeVerifier(max_verifications_per_run=0)
    result = verifier.verify_all(findings, target_path=_FakeAdapter.recognized_path)

    statuses = {f["runtime_verification"]["status"] for f in result}
    assert statuses == {"not_attempted"}
    assert all(f["runtime_verification"]["status"] != "not_confirmed" for f in result)
    assert all(f["runtime_verification"]["status"] != "inconclusive" for f in result)


def test_verify_all_marks_inconclusive_when_target_fails_to_start(monkeypatch):
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FailingStartAdapter])
    monkeypatch.setattr(sandbox, "launch", _fake_launch_raises)

    def fake_recipe(adapter, finding, base_url, sandbox_dir):
        raise AssertionError("must never be called if the target never started")

    _register_fake_recipe_and_oracle(monkeypatch, "stubbed_auth_check", fake_recipe, lambda e: VerificationStatus.CONFIRMED)

    findings = [{"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": 1}]

    result = RuntimeVerifier().verify_all(findings, target_path=_FailingStartAdapter.recognized_path)

    outcome = result[0]["runtime_verification"]
    assert outcome["status"] == "inconclusive"
    assert "target_start_failed" in outcome["reason"]


def test_verify_all_marks_inconclusive_when_recipe_itself_raises(monkeypatch):
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FakeAdapter])
    monkeypatch.setattr(sandbox, "launch", _fake_launch_ok)

    def broken_recipe(adapter, finding, base_url, sandbox_dir):
        raise RuntimeError("connection reset")

    _register_fake_recipe_and_oracle(monkeypatch, "stubbed_auth_check", broken_recipe, lambda e: VerificationStatus.CONFIRMED)

    findings = [{"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": 1}]

    result = RuntimeVerifier().verify_all(findings, target_path=_FakeAdapter.recognized_path)

    outcome = result[0]["runtime_verification"]
    assert outcome["status"] == "inconclusive"
    assert "recipe_error" in outcome["reason"]


def test_verify_all_calls_narrative_after_status_is_already_decided_and_cannot_override_it(monkeypatch, fake_client):
    monkeypatch.setattr(runtime_verifier_module.registry, "REGISTERED_ADAPTERS", [_FakeAdapter])
    monkeypatch.setattr(sandbox, "launch", _fake_launch_ok)

    def fake_recipe(adapter, finding, base_url, sandbox_dir):
        return Evidence(attack={"status": 401, "readback_status": 200})

    _register_fake_recipe_and_oracle(monkeypatch, "stubbed_auth_check", fake_recipe, oracles.decide_stubbed_auth_check)

    import json
    # The model tries to smuggle a "confirmed" verdict alongside the narrative — must be ignored.
    bogus_response = json.dumps({"narrative": "looked safe", "status": "confirmed"})
    client = fake_client(responses=[bogus_response])

    findings = [{"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": 1}]
    result = RuntimeVerifier(client=client).verify_all(findings, target_path=_FakeAdapter.recognized_path)

    outcome = result[0]["runtime_verification"]
    assert outcome["status"] == "not_confirmed"  # decided by the oracle from the 401, not the LLM
    assert outcome["narrative"] == "looked safe"


def test_registered_adapters_module_default_includes_flask_crud_adapter():
    from verification.adapters.flask_crud_adapter import FlaskCrudAdapter

    assert FlaskCrudAdapter in REGISTERED_ADAPTERS
