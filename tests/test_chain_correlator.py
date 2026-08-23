import json

import pytest

from agents import chain_correlator
from agents.chain_correlator import (
    ChainCorrelator,
    MAX_CHAIN_LENGTH,
    MAX_CHAINS,
    _parse_response,
    _select_candidates,
)


def test_select_candidates_includes_findings_without_a_confidence_score():
    # confidence None (e.g. layer-3 AI-pattern findings, which aren't confidence-scored) must
    # not be excluded by the MIN_CONFIDENCE_FOR_CORRELATION gate — only a low *known* score should be.
    findings = [{"confidence": None}, {"confidence": 0.9}, {"confidence": 0.1}]
    selected = _select_candidates(findings)
    assert [i for i, _ in selected] == [0, 1]


def test_select_candidates_respects_cap(monkeypatch):
    monkeypatch.setattr(chain_correlator, "MAX_FINDINGS_FOR_CORRELATION", 2)
    findings = [{"confidence": None}] * 5
    assert len(_select_candidates(findings)) == 2


def test_parse_response_drops_malformed_edges_but_keeps_valid_ones():
    text = json.dumps({"edges": [
        {"source": 0, "target": 1, "narrative": "ok"},
        {"source": "not-an-int", "target": 1, "narrative": "bad type"},
        {"source": 0, "narrative": "missing target"},
    ]})
    result = _parse_response(text)
    assert result["edges"] == [
        {"source": 0, "target": 1, "narrative": "ok", "relationship": "sequential"}
    ]
    assert result["chains"] == []


def test_parse_response_raises_when_edges_key_missing():
    with pytest.raises(ValueError):
        _parse_response(json.dumps({"unexpected": []}))


def test_parse_response_defaults_edge_relationship_to_sequential():
    text = json.dumps({"edges": [{"source": 0, "target": 1, "narrative": "chains"}]})
    assert _parse_response(text)["edges"][0]["relationship"] == "sequential"


def test_parse_response_keeps_amplifies_relationship():
    text = json.dumps({"edges": [
        {"source": 0, "target": 1, "narrative": "worse together", "relationship": "amplifies"}
    ]})
    assert _parse_response(text)["edges"][0]["relationship"] == "amplifies"


def test_parse_response_drops_edge_with_invalid_relationship():
    text = json.dumps({"edges": [
        {"source": 0, "target": 1, "narrative": "bad", "relationship": "causes"}
    ]})
    assert _parse_response(text)["edges"] == []


def test_parse_response_keeps_valid_combined_chain():
    text = json.dumps({"edges": [], "chains": [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": "joint impact"}
    ]})
    result = _parse_response(text)
    assert result["chains"] == [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": "joint impact"}
    ]


def test_parse_response_rejects_chain_longer_than_max_length():
    too_long = list(range(MAX_CHAIN_LENGTH + 1))
    text = json.dumps({"edges": [], "chains": [
        {"findings": too_long, "target": 99, "relationship": "combined", "narrative": "too many"}
    ]})
    assert _parse_response(text)["chains"] == []


def test_parse_response_rejects_chain_where_target_is_also_a_contributor():
    text = json.dumps({"edges": [], "chains": [
        {"findings": [0, 1], "target": 1, "relationship": "combined", "narrative": "bad target"}
    ]})
    assert _parse_response(text)["chains"] == []


def test_parse_response_rejects_malformed_chain_without_failing_others():
    text = json.dumps({"edges": [], "chains": [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": "ok"},
        {"findings": [0], "target": 2, "relationship": "combined", "narrative": "too few findings"},
        {"findings": [0, 1], "relationship": "combined", "narrative": "missing target"},
        {"findings": [0, 1], "target": 2, "relationship": "sequential", "narrative": "wrong relationship"},
        "not-a-dict",
    ]})
    result = _parse_response(text)
    assert result["chains"] == [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": "ok"}
    ]


def test_parse_response_truncates_to_max_chains():
    chains = [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": f"chain {i}"}
        for i in range(MAX_CHAINS + 5)
    ]
    result = _parse_response(json.dumps({"edges": [], "chains": chains}))
    assert len(result["chains"]) == MAX_CHAINS


def test_correlate_skips_model_call_when_fewer_than_two_candidates(fake_client):
    client = fake_client(responses=[])  # any call would fail the fake's own bound check
    correlator = ChainCorrelator(client=client)
    findings = [{"file": "a.py", "line": 1, "confidence": 0.9}]

    result = correlator.correlate(findings)

    assert result == findings
    assert len(client.calls) == 0


def test_correlate_attaches_enables_and_enabled_by(fake_client):
    edges = json.dumps({"edges": [{"source": 0, "target": 1, "narrative": "chains together"}]})
    client = fake_client(responses=[edges])
    correlator = ChainCorrelator(client=client)
    findings = [
        {"file": "a.py", "line": 1, "confidence": 0.9},
        {"file": "b.py", "line": 2, "confidence": 0.9},
    ]

    result = correlator.correlate(findings)

    assert result[0]["enables"][0]["file"] == "b.py"
    assert result[1]["enabled_by"][0]["file"] == "a.py"


def test_correlate_drops_self_loop_edge(fake_client):
    edges = json.dumps({"edges": [{"source": 0, "target": 0, "narrative": "self"}]})
    client = fake_client(responses=[edges])
    correlator = ChainCorrelator(client=client)
    findings = [
        {"file": "a.py", "line": 1, "confidence": 0.9},
        {"file": "b.py", "line": 2, "confidence": 0.9},
    ]

    result = correlator.correlate(findings)

    assert "enables" not in result[0]
    assert "enabled_by" not in result[0]


def test_correlate_fails_soft_when_model_call_errors(fake_client):
    client = fake_client(error=RuntimeError("down"))
    correlator = ChainCorrelator(client=client)
    findings = [
        {"file": "a.py", "line": 1, "confidence": 0.9},
        {"file": "b.py", "line": 2, "confidence": 0.9},
    ]

    result = correlator.correlate(findings)

    assert result == findings


def test_correlate_supports_a_to_b_to_c_sequential_chain(fake_client):
    edges = json.dumps({"edges": [
        {"source": 0, "target": 1, "narrative": "A enables B"},
        {"source": 1, "target": 2, "narrative": "B enables C"},
    ]})
    client = fake_client(responses=[edges])
    correlator = ChainCorrelator(client=client)
    findings = [
        {"file": "a.py", "line": 1, "confidence": 0.9},
        {"file": "b.py", "line": 2, "confidence": 0.9},
        {"file": "c.py", "line": 3, "confidence": 0.9},
    ]

    result = correlator.correlate(findings)

    assert result[0]["enables"][0]["file"] == "b.py"
    assert result[1]["enabled_by"][0]["file"] == "a.py"
    assert result[1]["enables"][0]["file"] == "c.py"
    assert result[2]["enabled_by"][0]["file"] == "b.py"


def test_correlate_represents_combined_chain_and_attaches_to_all_participants(fake_client):
    response = json.dumps({"edges": [], "chains": [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": "A+B enable C"}
    ]})
    client = fake_client(responses=[response])
    correlator = ChainCorrelator(client=client)
    findings = [
        {"file": "a.py", "line": 1, "confidence": 0.9},
        {"file": "b.py", "line": 2, "confidence": 0.9},
        {"file": "c.py", "line": 3, "confidence": 0.9},
    ]

    result = correlator.correlate(findings)

    for i in (0, 1, 2):
        chains = result[i]["attack_chains"]
        assert len(chains) == 1
        assert chains[0]["relationship"] == "combined"
        assert chains[0]["narrative"] == "A+B enable C"
        assert [ref["index"] for ref in chains[0]["findings"]] == [0, 1]
        assert chains[0]["target"]["index"] == 2


def test_correlate_does_not_decompose_combined_chain_into_pairwise_edges(fake_client):
    response = json.dumps({"edges": [], "chains": [
        {"findings": [0, 1], "target": 2, "relationship": "combined", "narrative": "A+B enable C"}
    ]})
    client = fake_client(responses=[response])
    correlator = ChainCorrelator(client=client)
    findings = [
        {"file": "a.py", "line": 1, "confidence": 0.9},
        {"file": "b.py", "line": 2, "confidence": 0.9},
        {"file": "c.py", "line": 3, "confidence": 0.9},
    ]

    result = correlator.correlate(findings)

    for finding in result:
        assert "enables" not in finding
        assert "enabled_by" not in finding
