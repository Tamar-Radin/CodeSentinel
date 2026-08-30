"""Wiring tests for Orchestrator.run() — every layer here is stubbed out, so this asserts the
*order and composition* the layers are called in, not any layer's own logic (each has its own
test module for that)."""
import json

from agents.ai_pattern_agent import AIPatternAgent
from agents.confidence_agent import ConfidenceAgent
from core import orchestrator
from core.orchestrator import Orchestrator


def test_run_wires_layers_in_documented_order_and_masks_final_output(monkeypatch):
    calls = []

    monkeypatch.setattr(orchestrator, "run_semgrep", lambda path: [{"tool": "semgrep", "message": "m"}])
    monkeypatch.setattr(orchestrator, "run_sca", lambda path: [{"tool": "pip-audit", "message": "m"}])

    class FakeConfidenceAgent:
        def annotate(self, findings, target_path):
            calls.append(("confidence", [f["tool"] for f in findings]))
            return [{**f, "confidence": 0.9} for f in findings]

    class FakeAIPatternAgent:
        def scan(self, target_path):
            calls.append(("ai-pattern", None))
            return [{"tool": "ai-pattern-agent", "message": 'password="hunter2"'}]

    class FakeChainCorrelator:
        def correlate(self, findings):
            calls.append(("correlate", [f["tool"] for f in findings]))
            return findings

    class FakePatchGenerator:
        def generate_all(self, findings, target_path):
            calls.append(("patch", [f["tool"] for f in findings]))
            return findings

    monkeypatch.setattr(orchestrator, "ConfidenceAgent", FakeConfidenceAgent)
    monkeypatch.setattr(orchestrator, "AIPatternAgent", FakeAIPatternAgent)
    monkeypatch.setattr(orchestrator, "ChainCorrelator", FakeChainCorrelator)
    monkeypatch.setattr(orchestrator, "PatchGenerator", FakePatchGenerator)

    findings = Orchestrator("/target").run()

    # Layer 2 (confidence) runs twice: first pass sees only layer-1 (semgrep/SCA) findings —
    # layer-3 (AI-pattern) findings don't exist yet at that point in the pipeline — then a
    # second, independent pass annotates the layer-3 finding right after Layer 3 produces it
    # (see core/orchestrator.py). Layer-1 findings must never appear in the second pass, i.e.
    # they're annotated exactly once.
    assert calls[0] == ("confidence", ["semgrep", "pip-audit"])
    assert calls[1] == ("ai-pattern", None)
    assert calls[2] == ("confidence", ["ai-pattern-agent"])
    # Layer 4/5 (correlate/patch) must see the full set, including the layer-3 finding added after.
    assert calls[3] == ("correlate", ["semgrep", "pip-audit", "ai-pattern-agent"])
    assert calls[4] == ("patch", ["semgrep", "pip-audit", "ai-pattern-agent"])

    # LLM02 — secret masking is applied last, to every finding regardless of which layer produced it.
    ai_pattern_finding = next(f for f in findings if f["tool"] == "ai-pattern-agent")
    assert "hunter2" not in ai_pattern_finding["message"]


def test_ai_pattern_findings_get_annotated_with_confidence_fields(monkeypatch, tmp_path, fake_client):
    # Layer-1 findings are left empty here so only the AIPatternAgent finding's confidence pass
    # needs a configured fake response — the reordering/no-double-annotation behavior for
    # layer-1 findings is already covered by the wiring test above.
    monkeypatch.setattr(orchestrator, "run_semgrep", lambda path: [])
    monkeypatch.setattr(orchestrator, "run_sca", lambda path: [])

    (tmp_path / "app.py").write_text("def f():\n    pass\n")

    ai_pattern_response = json.dumps([{
        "file": "app.py", "line": 1, "pattern": "hardcoded_demo_credentials",
        "owasp_id": "A04:2025", "severity": "high", "reasoning": "why",
    }])
    confidence_response = json.dumps({
        "supporting_evidence": "se", "counter_evidence": "ce",
        "confidence": 0.7, "confidence_reasoning": "cr", "prompt_injection_detected": False,
    })

    ai_agent = AIPatternAgent(client=fake_client(responses=[ai_pattern_response]))
    confidence_agent = ConfidenceAgent(client=fake_client(responses=[confidence_response]))

    class PassthroughChainCorrelator:
        def correlate(self, findings):
            return findings

    class PassthroughPatchGenerator:
        def generate_all(self, findings, target_path):
            return findings

    monkeypatch.setattr(orchestrator, "AIPatternAgent", lambda: ai_agent)
    monkeypatch.setattr(orchestrator, "ConfidenceAgent", lambda: confidence_agent)
    monkeypatch.setattr(orchestrator, "ChainCorrelator", PassthroughChainCorrelator)
    monkeypatch.setattr(orchestrator, "PatchGenerator", PassthroughPatchGenerator)

    findings = Orchestrator(str(tmp_path)).run()

    ai_finding = next(f for f in findings if f["tool"] == "ai-pattern-agent")
    for key in ("confidence", "confidence_reasoning", "supporting_evidence", "counter_evidence"):
        assert key in ai_finding
    assert ai_finding["confidence"] == 0.7


def _stub_layers_1_through_5(monkeypatch):
    monkeypatch.setattr(orchestrator, "run_semgrep", lambda path: [])
    monkeypatch.setattr(orchestrator, "run_sca", lambda path: [])

    class PassthroughConfidenceAgent:
        def annotate(self, findings, target_path):
            return findings

    class EmptyAIPatternAgent:
        def scan(self, target_path):
            return []

    class PassthroughChainCorrelator:
        def correlate(self, findings):
            return findings

    class PassthroughPatchGenerator:
        def generate_all(self, findings, target_path):
            return findings

    monkeypatch.setattr(orchestrator, "ConfidenceAgent", PassthroughConfidenceAgent)
    monkeypatch.setattr(orchestrator, "AIPatternAgent", EmptyAIPatternAgent)
    monkeypatch.setattr(orchestrator, "ChainCorrelator", PassthroughChainCorrelator)
    monkeypatch.setattr(orchestrator, "PatchGenerator", PassthroughPatchGenerator)


def test_run_never_calls_runtime_verifier_by_default(monkeypatch):
    # Layer 6 is additive/opt-in only — the static scan must behave exactly as it did before
    # RuntimeVerifier existed unless verify_runtime=True is explicitly passed.
    _stub_layers_1_through_5(monkeypatch)
    calls = []

    class ExplodingRuntimeVerifier:
        def verify_all(self, findings, target_path):
            calls.append("called")
            raise AssertionError("must not be called when verify_runtime is not set")

    monkeypatch.setattr(orchestrator, "RuntimeVerifier", ExplodingRuntimeVerifier)

    findings = Orchestrator("/target").run()

    assert calls == []
    assert findings == []


def test_run_calls_runtime_verifier_only_when_opted_in(monkeypatch):
    _stub_layers_1_through_5(monkeypatch)
    calls = []

    class FakeRuntimeVerifier:
        def verify_all(self, findings, target_path):
            calls.append(target_path)
            return [{**f, "runtime_verification": {"status": "confirmed"}} for f in findings]

    monkeypatch.setattr(orchestrator, "RuntimeVerifier", lambda: FakeRuntimeVerifier())
    monkeypatch.setattr(orchestrator, "run_semgrep", lambda path: [{"tool": "semgrep", "message": "m"}])

    findings = Orchestrator("/target", verify_runtime=True).run()

    assert calls == ["/target"]
    assert findings[0]["runtime_verification"]["status"] == "confirmed"
