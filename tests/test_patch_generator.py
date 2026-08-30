import json

import pytest

from remediation import patch_generator
from remediation.patch_generator import PatchGenerator, _is_candidate, _match_pattern, _parse_response


def test_match_pattern_matches_known_needle_in_pattern_or_check_id():
    assert _match_pattern({"pattern": "string_built_sql"}) == "sql_injection"
    assert _match_pattern({"check_id": "javascript.express.sql-injection.rule"}) == "sql_injection"


def test_match_pattern_returns_none_for_unsupported_pattern():
    assert _match_pattern({"pattern": "missing_rate_limiting"}) is None


def test_is_candidate_rejects_confidence_below_floor_even_if_pattern_matches():
    assert _is_candidate({"pattern": "string_built_sql", "confidence": 0.4}) is False


def test_is_candidate_accepts_confidence_at_floor():
    assert _is_candidate({"pattern": "string_built_sql", "confidence": 0.5}) is True


def test_is_candidate_rejects_missing_confidence_score():
    # Every finding reaching this layer has been through a Confidence Agent pass (layer-1
    # directly, layer-3 via its own separate pass in core/orchestrator.py); a finding with no
    # confidence at all here means that pass errored or was skipped, not an expected case — it
    # must not get a free pass into patch generation.
    assert _is_candidate({"pattern": "string_built_sql", "confidence": None}) is False


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


def test_generate_all_picks_highest_confidence_first_when_over_budget(fake_client, tmp_path, monkeypatch):
    monkeypatch.setattr(patch_generator, "MAX_PATCHES_PER_RUN", 2)
    (tmp_path / "app.py").write_text("query = 'SELECT 1'\n")
    no_fix = json.dumps({"patchable": False, "diff": None, "explanation": "no fix"})
    client = fake_client(responses=[no_fix, no_fix])
    generator = PatchGenerator(client=client)
    # Listed low-to-high on purpose — selection must not depend on list order.
    findings = [
        {"pattern": "string_built_sql", "confidence": 0.6, "file": "app.py", "line": 1},
        {"pattern": "string_built_sql", "confidence": 0.95, "file": "app.py", "line": 1},
        {"pattern": "string_built_sql", "confidence": 0.75, "file": "app.py", "line": 1},
    ]

    result = generator.generate_all(findings, str(tmp_path))

    assert "proposed_patch" not in result[0]  # confidence 0.6 — lowest, bumped by the budget
    assert "proposed_patch" in result[1]      # confidence 0.95
    assert "proposed_patch" in result[2]      # confidence 0.75
    assert len(client.calls) == 2


def test_generate_all_falls_back_to_lower_confidence_when_budget_has_room(fake_client, tmp_path, monkeypatch):
    monkeypatch.setattr(patch_generator, "MAX_PATCHES_PER_RUN", 20)
    (tmp_path / "app.py").write_text("query = 'SELECT 1'\n")
    no_fix = json.dumps({"patchable": False, "diff": None, "explanation": "no fix"})
    client = fake_client(responses=[no_fix, no_fix])
    generator = PatchGenerator(client=client)
    # Only 1 finding clears the preferred 0.7 bar; a second at 0.5 (the floor) should still be
    # picked up since MAX_PATCHES_PER_RUN=20 has plenty of room left. A third below the 0.5 floor
    # must never be a candidate at all, no matter how much budget remains.
    findings = [
        {"pattern": "string_built_sql", "confidence": 0.9, "file": "app.py", "line": 1},
        {"pattern": "string_built_sql", "confidence": 0.5, "file": "app.py", "line": 1},
        {"pattern": "string_built_sql", "confidence": 0.3, "file": "app.py", "line": 1},
    ]

    result = generator.generate_all(findings, str(tmp_path))

    assert "proposed_patch" in result[0]
    assert "proposed_patch" in result[1]
    assert "proposed_patch" not in result[2]
    assert len(client.calls) == 2
