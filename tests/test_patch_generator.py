import json

import pytest

from remediation import patch_generator
from remediation.patch_generator import PatchGenerator, _is_candidate, _match_pattern, _parse_response


def test_match_pattern_matches_known_needle_in_pattern_or_check_id():
    assert _match_pattern({"pattern": "string_built_sql"}) == "sql_injection"
    assert _match_pattern({"check_id": "javascript.express.sql-injection.rule"}) == "sql_injection"


def test_match_pattern_returns_none_for_unsupported_pattern():
    assert _match_pattern({"pattern": "missing_rate_limiting"}) is None


def test_is_candidate_rejects_low_confidence_even_if_pattern_matches():
    assert _is_candidate({"pattern": "string_built_sql", "confidence": 0.5}) is False


def test_is_candidate_accepts_missing_confidence_score():
    # Layer-3 AI-pattern findings aren't confidence-scored today — must not be gated out here.
    assert _is_candidate({"pattern": "string_built_sql", "confidence": None}) is True


def test_is_candidate_rejects_unsupported_pattern_regardless_of_confidence():
    assert _is_candidate({"pattern": "missing_csrf_protection", "confidence": 0.99}) is False


def test_parse_response_forces_diff_none_when_not_patchable():
    text = json.dumps({"patchable": False, "diff": "should be dropped", "explanation": "can't fix"})
    assert _parse_response(text)["diff"] is None


def test_parse_response_raises_when_patchable_true_without_diff_string():
    text = json.dumps({"patchable": True, "diff": None, "explanation": "oops"})
    with pytest.raises(ValueError):
        _parse_response(text)


def test_generate_returns_none_for_non_candidate_finding_without_calling_model(fake_client, tmp_path):
    client = fake_client(responses=[])
    generator = PatchGenerator(client=client)
    finding = {"pattern": "missing_rate_limiting", "confidence": 0.9, "file": "app.py", "line": 1}

    result = generator.generate(finding, str(tmp_path))

    assert result is None
    assert len(client.calls) == 0


def test_generate_returns_none_when_no_source_context_available(fake_client, tmp_path):
    client = fake_client(responses=[])
    generator = PatchGenerator(client=client)
    finding = {"pattern": "string_built_sql", "confidence": 0.9, "file": "missing.py", "line": 1}

    result = generator.generate(finding, str(tmp_path))

    assert result is None
    assert len(client.calls) == 0


def test_generate_returns_patch_for_eligible_finding(fake_client, tmp_path):
    (tmp_path / "app.py").write_text("query = f'SELECT * FROM users WHERE id={id}'\n")
    response_text = json.dumps({
        "patchable": True,
        "diff": "--- a/app.py\n+++ b/app.py\n@@ -1 +1 @@\n-old\n+new\n",
        "explanation": "parametrize the query",
    })
    client = fake_client(responses=[response_text])
    generator = PatchGenerator(client=client)
    finding = {"pattern": "string_built_sql", "confidence": 0.9, "file": "app.py", "line": 1}

    result = generator.generate(finding, str(tmp_path))

    assert result["patchable"] is True
    assert "app.py" in result["diff"]


def test_generate_all_respects_max_patches_per_run_bound(fake_client, tmp_path, monkeypatch):
    monkeypatch.setattr(patch_generator, "MAX_PATCHES_PER_RUN", 1)
    (tmp_path / "app.py").write_text("query = 'SELECT 1'\n")
    response_text = json.dumps({"patchable": False, "diff": None, "explanation": "no fix"})
    client = fake_client(responses=[response_text])
    generator = PatchGenerator(client=client)
    findings = [
        {"pattern": "string_built_sql", "confidence": 0.9, "file": "app.py", "line": 1},
        {"pattern": "string_built_sql", "confidence": 0.9, "file": "app.py", "line": 1},
    ]

    result = generator.generate_all(findings, str(tmp_path))

    assert "proposed_patch" in result[0]
    assert "proposed_patch" not in result[1]
    assert len(client.calls) == 1
