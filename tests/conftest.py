"""Shared test fixtures. Nothing here calls the real Anthropic API — agents under test are
always constructed with a fake client, so tests need no ANTHROPIC_API_KEY and never make network
calls (see agents/*.py and remediation/patch_generator.py, which all accept an injectable
`client: anthropic.Anthropic | None`)."""
import pytest


class _TextBlock:
    def __init__(self, text):
        self.type = "text"
        self.text = text


class _Response:
    def __init__(self, text):
        self.content = [_TextBlock(text)]


class _FakeMessages:
    def __init__(self, responses, error):
        self._responses = list(responses)
        self._error = error
        self.calls = []

    def create(self, **kwargs):
        idx = len(self.calls)
        self.calls.append(kwargs)
        if self._error is not None:
            raise self._error
        if idx >= len(self._responses):
            raise AssertionError(
                f"fake client's messages.create() called {idx + 1} times but only "
                f"{len(self._responses)} response(s) were configured — a test asserting a call "
                f"bound (e.g. MAX_FINDINGS_PER_RUN) should configure exactly the expected count"
            )
        return _Response(self._responses[idx])


class FakeAnthropicClient:
    """Drop-in stand-in for anthropic.Anthropic: `.messages.create(**kwargs)` returns the next
    configured response text in order, or raises `error` if one was given. `.calls` records the
    kwargs of every call made, for asserting what was sent to (or never sent to) the model."""

    def __init__(self, responses=None, error=None):
        self.messages = _FakeMessages(responses or [], error)

    @property
    def calls(self):
        return self.messages.calls


@pytest.fixture
def fake_client():
    """Factory fixture. Usage: fake_client(responses=["...json text..."]) or
    fake_client(error=RuntimeError("boom"))."""

    def _make(responses=None, error=None):
        return FakeAnthropicClient(responses=responses, error=error)

    return _make
