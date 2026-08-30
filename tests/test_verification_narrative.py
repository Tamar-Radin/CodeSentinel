import json

from verification.narrative import NarrativeWriter
from verification.types import Evidence


def test_describe_returns_the_narrative_text(fake_client):
    response = json.dumps({"narrative": "Sent an unauthenticated DELETE; the row was removed."})
    client = fake_client(responses=[response])
    writer = NarrativeWriter(client=client)

    result = writer.describe(
        finding={"pattern": "stubbed_auth_check", "file": "app.py", "line": 116},
        status="confirmed",
        request={"method": "DELETE", "path": "/api/users/1"},
        evidence=Evidence(attack={"status": 200, "readback_status": 404}),
    )

    assert result == "Sent an unauthenticated DELETE; the row was removed."


def test_describe_ignores_any_extra_key_the_model_adds_including_a_bogus_status(fake_client):
    # The model must never be able to smuggle a verdict back in — only "narrative" is ever read,
    # regardless of what else the response contains.
    response = json.dumps({
        "narrative": "described here",
        "status": "confirmed",  # bogus — must be ignored
        "confirmed": True,      # bogus — must be ignored
    })
    client = fake_client(responses=[response])
    writer = NarrativeWriter(client=client)

    result = writer.describe(
        finding={"pattern": "path_traversal"},
        status="not_confirmed",  # the real, already-decided status passed in by the caller
        request={},
        evidence=Evidence(),
    )

    assert result == "described here"


def test_describe_never_raises_and_returns_a_placeholder_on_model_error(fake_client):
    client = fake_client(error=RuntimeError("network down"))
    writer = NarrativeWriter(client=client)

    result = writer.describe(
        finding={"pattern": "stubbed_auth_check"}, status="confirmed", request={}, evidence=Evidence(),
    )

    assert result is not None
    assert "narrative unavailable" in result


def test_describe_never_raises_on_malformed_json_response(fake_client):
    client = fake_client(responses=["not valid json at all"])
    writer = NarrativeWriter(client=client)

    result = writer.describe(
        finding={"pattern": "stubbed_auth_check"}, status="confirmed", request={}, evidence=Evidence(),
    )

    assert result is not None
    assert "narrative unavailable" in result
