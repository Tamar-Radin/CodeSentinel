"""LLM02:2025 Sensitive Information Disclosure — scrub secret-looking values out of any
free-text a finding carries (message/reasoning/supporting_evidence/diff/etc.) before that
finding reaches findings.json, the dashboard, or the CI PR comment.

Applied centrally in core/orchestrator.py as the last step of Orchestrator.run(), so every
consumer downstream of that (scan.py's --out file, ci/format_pr_comment.py, dashboard/app.py)
sees masked text regardless of which layer produced it, instead of relying on each layer to
remember to mask its own output. agents/ai_pattern_agent.py also calls mask_secrets() directly
on its own reasoning field as it's produced, as defense-in-depth for any future code path that
constructs findings without going through Orchestrator.run().

Best-effort regex, not a substitute for not putting real secrets in scanned repos in the first
place — see security/llm_top10_notes.md (LLM02).
"""
import re

_SECRET_VALUE_RE = re.compile(
    r"""(?:password|passwd|pwd|secret|api[_-]?key|token)[\w"'\]\[\s]{0,30}[:=]\s*["']([^"']+)["']""",
    re.IGNORECASE,
)


def mask_secrets(text: str) -> str:
    if not text:
        return text
    return _SECRET_VALUE_RE.sub(lambda m: m.group(0).replace(m.group(1), "***MASKED***"), text)


def mask_finding_secrets(finding: dict) -> dict:
    """Recursively mask every string value on a finding, including nested structures like
    proposed_patch ({diff, explanation, ...}) and enables/enabled_by (list of {narrative, ...})
    — rather than an allowlist of known field names, so a field added later by any layer is
    covered automatically."""
    return {k: _mask_value(v) for k, v in finding.items()}


def _mask_value(value):
    if isinstance(value, str):
        return mask_secrets(value)
    if isinstance(value, dict):
        return {k: _mask_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_mask_value(v) for v in value]
    return value
