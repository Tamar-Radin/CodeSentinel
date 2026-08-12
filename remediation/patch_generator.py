"""Layer 5 (stretch) — Remediation Agent.

Generates a proposed patch/diff for high-confidence findings. Per ASI05
(Unexpected Code Execution): a generated patch is NEVER applied automatically —
human-in-the-loop review is mandatory, and any patch verification must run in
an isolated sandbox.
"""


class PatchGenerator:
    SUPPORTED_PATTERNS = ["sql_injection", "hardcoded_secret", "missing_auth", "xss", "permissive_cors"]

    def generate(self, finding: dict) -> str | None:
        # TODO (week 5): for supported patterns only, generate a minimal git-apply-able diff.
        # Never auto-apply — return the diff text for human review.
        return None
