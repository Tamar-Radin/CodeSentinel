"""Wiring tests for Orchestrator.run() — every layer here is stubbed out, so this asserts the
*order and composition* the layers are called in, not any layer's own logic (each has its own
test module for that)."""
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

    # Layer 2 (confidence) must only see layer-1 (semgrep/SCA) findings — layer-3 (AI-pattern)
    # findings don't exist yet at that point in the pipeline (see core/orchestrator.py).
    assert calls[0] == ("confidence", ["semgrep", "pip-audit"])
    # Layer 4/5 (correlate/patch) must see the full set, including the layer-3 finding added after.
    assert calls[1] == ("ai-pattern", None)
    assert calls[2] == ("correlate", ["semgrep", "pip-audit", "ai-pattern-agent"])
    assert calls[3] == ("patch", ["semgrep", "pip-audit", "ai-pattern-agent"])

    # LLM02 — secret masking is applied last, to every finding regardless of which layer produced it.
    ai_pattern_finding = next(f for f in findings if f["tool"] == "ai-pattern-agent")
    assert "hunter2" not in ai_pattern_finding["message"]
