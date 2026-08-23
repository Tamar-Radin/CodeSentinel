from core.secret_masking import mask_finding_secrets, mask_secrets


def test_mask_secrets_replaces_value_after_known_key():
    text = 'connecting with password="hunter2" to the db'
    assert mask_secrets(text) == 'connecting with password="***MASKED***" to the db'


def test_mask_secrets_leaves_unrelated_text_untouched():
    text = "no secrets mentioned here at all"
    assert mask_secrets(text) == text


def test_mask_secrets_handles_empty_and_none():
    assert mask_secrets("") == ""
    assert mask_secrets(None) is None


def test_mask_secrets_matches_api_key_and_token_variants():
    text = "api_key: 'sk-abc123' and token = \"tok-xyz\""
    masked = mask_secrets(text)
    assert "sk-abc123" not in masked
    assert "tok-xyz" not in masked
    assert masked.count("***MASKED***") == 2


def test_mask_finding_secrets_masks_nested_structures():
    finding = {
        "message": 'secret="topsecret"',
        "proposed_patch": {"diff": '+password = "hunter2"', "explanation": "fine"},
        "enables": [{"narrative": 'uses token="abc"'}],
        "line": 12,
        "confidence": 0.9,
    }
    masked = mask_finding_secrets(finding)
    assert "topsecret" not in masked["message"]
    assert "hunter2" not in masked["proposed_patch"]["diff"]
    assert "abc" not in masked["enables"][0]["narrative"]
    # non-string values pass through unchanged
    assert masked["line"] == 12
    assert masked["confidence"] == 0.9
