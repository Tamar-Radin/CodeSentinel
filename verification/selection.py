"""Deterministic selection of which eligible findings actually get a runtime-verification
attempt when there are more of them than `max_verifications_per_run`. Never random, never
insertion-order-only — see the design doc's 3-step policy, reproduced here."""
from verification.config import V1_CONDITIONAL_PATTERNS, V1_CORE_PATTERNS

_TIER_CORE = 0
_TIER_CONDITIONAL = 1
_TIER_OTHER = 2  # not expected to reach selection (eligibility already filtered these out),
                 # kept only so sort_key never raises on an unexpected pattern name


def _tier(pattern: str | None) -> int:
    if pattern in V1_CORE_PATTERNS:
        return _TIER_CORE
    if pattern in V1_CONDITIONAL_PATTERNS:
        return _TIER_CONDITIONAL
    return _TIER_OTHER


def _sort_key(item: tuple[int, dict]):
    _, finding = item
    confidence = finding.get("confidence")
    has_confidence = confidence is not None
    return (
        _tier(finding.get("pattern")),
        0 if has_confidence else 1,           # numeric-confidence findings sort before None
        -confidence if has_confidence else 0.0,  # higher confidence first
        finding.get("file") or "",
        finding.get("line") if finding.get("line") is not None else 0,
        finding.get("pattern") or "",
    )


def select(
    eligible: list[tuple[int, dict]], cap: int
) -> tuple[list[tuple[int, dict]], list[tuple[int, dict]]]:
    """`eligible`: list of (original_index, finding) pairs that already passed the eligibility
    funnel. Returns (selected, deferred) — `selected` is capped at `cap` items, chosen
    deterministically (tier, then confidence descending, then file/line/pattern ascending);
    `deferred` is everything else, in the same deterministic order, for `not_attempted` /
    `capacity_exceeded` reporting."""
    ordered = sorted(eligible, key=_sort_key)
    return ordered[:cap], ordered[cap:]
