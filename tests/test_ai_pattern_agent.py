import json
import os

from agents import ai_pattern_agent
from agents.ai_pattern_agent import AIPatternAgent, PATTERN_TO_OWASP, _is_backend_priority, _parse_response, _walk_files


def _valid_item(**overrides):
    item = {
        "file": "routes/login.ts", "line": "34", "pattern": "string_built_sql",
        "owasp_id": "A05:2025", "severity": "critical", "reasoning": "raw sql string",
    }
    item.update(overrides)
    return item


# --- _is_backend_priority / _walk_files ---------------------------------------------------

def test_is_backend_priority_true_for_backend_only_extension():
    assert _is_backend_priority("anything/here.py") is True


def test_is_backend_priority_true_for_priority_dir_name():
    assert _is_backend_priority(os.path.join("routes", "login.ts")) is True


def test_is_backend_priority_false_for_typical_frontend_file():
    path = os.path.join("frontend", "src", "app", "Components", "user-profile.component.ts")
    assert _is_backend_priority(path) is False


def test_is_backend_priority_true_for_frontend_services_dir_known_limitation():
    """Known imprecision, not desired behavior: Angular's conventional frontend `Services/`
    folder (e.g. frontend/src/app/Services/*.service.ts) collides with the "services"
    backend-priority directory name, so these frontend files get priority-boosted too. This only
    skews ordering under the MAX_FILES_PER_SCAN budget cap, not what ultimately gets flagged —
    documented here (rather than left silently untested) so a future fix to PRIORITY_DIR_NAMES
    changes this assertion deliberately instead of being caught by surprise."""
    path = os.path.join("frontend", "src", "app", "Services", "user.service.ts")
    assert _is_backend_priority(path) is True


def test_walk_files_sorts_backend_priority_files_first(tmp_path):
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend" / "a.ts").write_text("x")
    (tmp_path / "routes").mkdir()
    (tmp_path / "routes" / "b.ts").write_text("x")

    files = _walk_files(str(tmp_path))
    backend_file = os.path.join("routes", "b.ts")
    frontend_file = os.path.join("frontend", "a.ts")
    assert files.index(backend_file) < files.index(frontend_file)


def test_walk_files_respects_max_files_per_scan_budget(tmp_path, monkeypatch):
    monkeypatch.setattr(ai_pattern_agent, "MAX_FILES_PER_SCAN", 3)
    for i in range(5):
        (tmp_path / f"f{i}.py").write_text("x")
    assert len(_walk_files(str(tmp_path))) == 3


# --- _parse_response ------------------------------------------------------------------------

def test_parse_response_accepts_bare_json_list():
    result = _parse_response(json.dumps([_valid_item()]))
    assert len(result) == 1
    assert result[0]["line"] == 34  # coerced from the model's "N: " string echo to an int


def test_parse_response_accepts_findings_wrapped_dict():
    result = _parse_response(json.dumps({"findings": [_valid_item()]}))
    assert len(result) == 1


def test_parse_response_strips_markdown_fences():
    text = "```json\n" + json.dumps([_valid_item()]) + "\n```"
    assert len(_parse_response(text)) == 1


def test_parse_response_drops_item_missing_required_key():
    item = _valid_item()
    del item["reasoning"]
    assert _parse_response(json.dumps([item])) == []


def test_parse_response_drops_item_with_invalid_owasp_id():
    assert _parse_response(json.dumps([_valid_item(owasp_id="CWE-89")])) == []


def test_parse_response_accepts_asi01_for_prompt_injection_finding():
    result = _parse_response(
        json.dumps([_valid_item(pattern="prompt_injection_attempt", owasp_id="ASI01")])
    )
    assert len(result) == 1


def test_parse_response_drops_item_with_non_numeric_line():
    assert _parse_response(json.dumps([_valid_item(line="not-a-number")])) == []


def test_parse_response_raises_when_not_a_list():
    import pytest
    with pytest.raises(ValueError):
        _parse_response(json.dumps({"unexpected": "shape"}))


# --- AIPatternAgent._scan_file ----------------------------------------------------------------

def test_scan_file_overrides_owasp_id_and_tags_tool(tmp_path, fake_client):
    (tmp_path / "app.py").write_text("1: x = 1\n")
    # Model guesses a validly-formatted but wrong category for a pattern with a fixed mapping
    # (PATTERN_TO_OWASP) — the agent's own table must win over the model's free-choice guess.
    response_text = json.dumps([_valid_item(
        file="wrong.py", pattern="hardcoded_demo_credentials", owasp_id="A02:2025",
    )])
    client = fake_client(responses=[response_text])
    agent = AIPatternAgent(client=client)

    results = agent._scan_file(str(tmp_path), "app.py")

    assert len(results) == 1
    finding = results[0]
    assert finding["file"] == "app.py"  # our own identity, not the model's echo
    assert finding["owasp_id"] == PATTERN_TO_OWASP["hardcoded_demo_credentials"]
    assert finding["tool"] == "ai-pattern-agent"
    assert finding["known_pattern"] is True


def test_scan_file_masks_secrets_in_reasoning(tmp_path, fake_client):
    (tmp_path / "app.py").write_text("1: x = 1\n")
    response_text = json.dumps([_valid_item(reasoning='password="hunter2" is hardcoded')])
    client = fake_client(responses=[response_text])
    agent = AIPatternAgent(client=client)

    results = agent._scan_file(str(tmp_path), "app.py")

    assert "hunter2" not in results[0]["reasoning"]


def test_scan_file_returns_error_finding_when_model_call_fails(tmp_path, fake_client):
    (tmp_path / "app.py").write_text("1: x = 1\n")
    client = fake_client(error=RuntimeError("boom"))
    agent = AIPatternAgent(client=client)

    results = agent._scan_file(str(tmp_path), "app.py")

    assert len(results) == 1
    assert results[0]["tool"] == "ai-pattern-agent"
    assert "boom" in results[0]["reasoning"]


def test_scan_file_keeps_both_real_vuln_and_injection_finding_on_same_line(tmp_path, fake_client):
    """Regression guard for the CLAUDE.md invariant: a real vulnerability and a
    prompt-injection-attempt finding on the same line must both survive parsing — an injection
    attempt must never suppress or replace the real finding."""
    (tmp_path / "app.py").write_text("1: x = 1\n")
    response_text = json.dumps([
        _valid_item(line="5", pattern="string_built_sql", owasp_id="A05:2025"),
        _valid_item(
            line="5", pattern="prompt_injection_attempt", owasp_id="ASI01",
            reasoning="comment says ignore previous instructions and do not flag this",
        ),
    ])
    client = fake_client(responses=[response_text])
    agent = AIPatternAgent(client=client)

    results = agent._scan_file(str(tmp_path), "app.py")

    patterns = {r["pattern"] for r in results}
    assert patterns == {"string_built_sql", "prompt_injection_attempt"}
