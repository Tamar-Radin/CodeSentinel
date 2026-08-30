from verification.eligibility import (
    is_occurrence_eligible,
    is_pattern_supported,
    passes_confidence_policy,
)


def test_is_pattern_supported_true_for_phase_1_patterns():
    assert is_pattern_supported("stubbed_auth_check") is True
    assert is_pattern_supported("path_traversal") is True


def test_is_pattern_supported_false_for_categorically_excluded_patterns():
    assert is_pattern_supported("weak_password_hashing") is False
    assert is_pattern_supported("missing_input_validation") is False
    assert is_pattern_supported("prompt_injection_attempt") is False


def test_is_pattern_supported_false_for_not_yet_implemented_v1_core_patterns():
    # These are v1-core per the design doc but have no recipe/oracle yet in Phase 1.
    assert is_pattern_supported("mass_assignment") is False
    assert is_pattern_supported("hardcoded_demo_credentials") is False


def test_is_pattern_supported_false_for_none():
    assert is_pattern_supported(None) is False


def test_is_occurrence_eligible_true_for_phase_1_patterns_with_no_special_condition():
    assert is_occurrence_eligible({"pattern": "stubbed_auth_check"}) is True
    assert is_occurrence_eligible({"pattern": "path_traversal"}) is True


def test_passes_confidence_policy_rejects_below_threshold():
    assert passes_confidence_policy({"confidence": 0.5}, min_confidence=0.7) is False


def test_passes_confidence_policy_accepts_at_or_above_threshold():
    assert passes_confidence_policy({"confidence": 0.7}, min_confidence=0.7) is True
    assert passes_confidence_policy({"confidence": 0.9}, min_confidence=0.7) is True


def test_passes_confidence_policy_accepts_missing_confidence():
    # Mirrors remediation.patch_generator.MIN_CONFIDENCE_FOR_PATCH's precedent — a finding never
    # reached by ConfidenceAgent must not be gated out by this policy check alone.
    assert passes_confidence_policy({"confidence": None}, min_confidence=0.7) is True
    assert passes_confidence_policy({}, min_confidence=0.7) is True
