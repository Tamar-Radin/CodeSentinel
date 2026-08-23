import json

import pytest

from agents import confidence_agent
from agents.confidence_agent import ConfidenceAgent, _parse_response


def _valid_response_text():
    return json.dumps({
        "supporting_evidence": "evidence", "counter_evidence": "counter",
        "confidence": 0.8, "confidence_reasoning": "reasoning",
        "prompt_injection_detected": False,
    })


def test_parse_response_strips_fences_and_returns_required_keys():
    text = "```json\n" + _valid_response_text() + "\n```"
    result = _parse_response(text)
    assert result["confidence"] == 0.8
    assert set(result) == confidence_agent.REQUIRED_RESPONSE_KEYS


def test_parse_response_raises_on_missing_key():
    payload = json.loads(_valid_response_text())
    del payload["confidence"]
    with pytest.raises(ValueError):
        _parse_response(json.dumps(payload))


def test_annotate_merges_result_into_each_finding_and_keeps_original_fields(fake_client, tmp_path):
    client = fake_client(responses=[_valid_response_text()])
    agent = ConfidenceAgent(client=client)

    result = agent.annotate([{"file": "app.py", "line": 1, "message": "sqli"}], str(tmp_path))

    assert result[0]["confidence"] == 0.8
    assert result[0]["message"] == "sqli"


def test_annotate_respects_max_findings_per_run_bound(fake_client, tmp_path, monkeypatch):
    monkeypatch.setattr(confidence_agent, "MAX_FINDINGS_PER_RUN", 2)
    client = fake_client(responses=[_valid_response_text(), _valid_response_text()])
    agent = ConfidenceAgent(client=client)
    findings = [{"file": "app.py", "line": i} for i in range(4)]

    result = agent.annotate(findings, str(tmp_path))

    assert "confidence" in result[0]
    assert "confidence" in result[1]
    assert "confidence" not in result[2]  # past the bound — passed through unannotated
    assert "confidence" not in result[3]
    assert len(client.calls) == 2


def test_call_model_returns_safe_fallback_when_client_raises(fake_client):
    client = fake_client(error=RuntimeError("api down"))
    agent = ConfidenceAgent(client=client)

    result = agent._call_model("some content")

    assert result["confidence"] is None
    assert result["prompt_injection_detected"] is False
    assert "api down" in result["confidence_reasoning"]
