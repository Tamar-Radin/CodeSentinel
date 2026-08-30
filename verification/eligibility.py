"""The eligibility funnel a finding must pass before RuntimeVerifier ever spends an attempt on
it. Each check here is a hard gate — order matters (see runtime_verifier.verify_all): pattern
support and per-occurrence eligibility are checked before confidence, since confidence is a
policy gate only and must never stand in for "this finding is runtime-verifiable" (see the
design doc)."""
from verification import recipes


def is_pattern_supported(pattern: str | None) -> bool:
    """True only for patterns with a registered recipe+oracle pair. Deliberately derived from
    the registry rather than a separately-maintained name list, so there is exactly one place
    (recipes.RECIPE_REGISTRY) that decides what Layer 6 can attempt at all."""
    return pattern in recipes.RECIPE_REGISTRY


def is_occurrence_eligible(finding: dict) -> bool:
    """Per-occurrence eligibility beyond the pattern name alone. Phase 1's two implemented
    patterns (stubbed_auth_check, path_traversal) have no additional per-occurrence condition —
    this hook exists for later, harder patterns (e.g. missing_csrf_protection, which is only
    eligible when the target's auth is cookie-based) so the funnel shape doesn't change when
    they're added."""
    return True


def passes_confidence_policy(finding: dict, min_confidence: float) -> bool:
    """Policy gate only — passing this is necessary but never sufficient evidence a finding is
    runtime-verifiable; it only means the pipeline is willing to spend an attempt on it once
    pattern support/occurrence eligibility already said yes. A finding with no confidence score
    at all (e.g. never reached by ConfidenceAgent) is not gated out here, mirroring
    remediation.patch_generator.MIN_CONFIDENCE_FOR_PATCH's precedent."""
    confidence = finding.get("confidence")
    if confidence is None:
        return True
    return confidence >= min_confidence
