"""Layer 6 defaults. Every value here is a default only — `RuntimeVerifier`'s constructor
accepts overrides for the ones that are meant to be run-configurable (LLM10:2025 Unbounded
Consumption applies to `MAX_VERIFICATIONS_PER_RUN` the same way it applies to every other
layer's MAX_* bound in this codebase)."""

# How many findings get an actual runtime-verification attempt in one run, regardless of how
# many are eligible. Configurable via RuntimeVerifier(max_verifications_per_run=...).
MAX_VERIFICATIONS_PER_RUN = 20

# Reserved for the missing_rate_limiting recipe (not implemented in Phase 1) — the maximum
# number of requests its bounded burst check may send.
RATE_LIMIT_BURST_CAP = 50

# Policy gate only (see eligibility.passes_confidence_policy) — passing this is necessary but
# never sufficient proof a finding is runtime-verifiable. Mirrors
# remediation.patch_generator.MIN_CONFIDENCE_FOR_PATCH's precedent, including its treatment of
# a finding with no confidence score at all (not gated out).
MIN_CONFIDENCE_FOR_VERIFICATION = 0.7

STARTUP_TIMEOUT_S = 15.0
TOTAL_RUNTIME_TIMEOUT_S = 60.0

# The 14 AIPatternAgent patterns, tiered per the runtime-verification design doc. Only
# V1_CORE_PATTERNS have recipes/oracles implemented as of Phase 1 (see recipes.RECIPE_REGISTRY);
# these sets exist so the deterministic selection policy (tier before confidence) is already
# correct once v1-conditional patterns get recipes in a later phase, without changing the policy
# itself.
V1_CORE_PATTERNS = frozenset({
    "stubbed_auth_check",
    "hardcoded_demo_credentials",
    "permissive_cors",
    "string_built_sql",
    "eval_exec_on_input",
    "missing_rate_limiting",
    "path_traversal",
    "mass_assignment",
})

V1_CONDITIONAL_PATTERNS = frozenset({
    "missing_csrf_protection",
    "exposed_stack_trace",
    "fail_open_error_handling",
})
