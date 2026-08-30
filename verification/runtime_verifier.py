"""RuntimeVerifier — Layer 6's entrypoint. Additive only: `verify_all()` only ever adds a
`runtime_verification` key to findings that actually entered the eligibility funnel; every other
finding, and the return value when the target isn't recognized at all, passes through
byte-for-byte unchanged. See the design doc (plan) for the full funnel/flow rationale."""
from __future__ import annotations

import anthropic

from verification import config, eligibility, oracles, recipes, sandbox, selection
from verification.narrative import NarrativeWriter
from verification import registry
from verification.types import VerificationOutcome, VerificationStatus


class RuntimeVerifier:
    def __init__(
        self,
        client: anthropic.Anthropic | None = None,
        max_verifications_per_run: int = config.MAX_VERIFICATIONS_PER_RUN,
        min_confidence: float = config.MIN_CONFIDENCE_FOR_VERIFICATION,
        startup_timeout_s: float = config.STARTUP_TIMEOUT_S,
        total_timeout_s: float = config.TOTAL_RUNTIME_TIMEOUT_S,
    ):
        self._narrative_writer = NarrativeWriter(client=client)
        self.max_verifications_per_run = max_verifications_per_run
        self.min_confidence = min_confidence
        self.startup_timeout_s = startup_timeout_s
        self.total_timeout_s = total_timeout_s

    def verify_all(self, findings: list[dict], target_path: str) -> list[dict]:
        adapter_cls = registry.resolve_adapter(target_path)
        if adapter_cls is None:
            return findings

        eligible = [
            (i, f) for i, f in enumerate(findings)
            if eligibility.is_pattern_supported(f.get("pattern"))
            and eligibility.is_occurrence_eligible(f)
            and eligibility.passes_confidence_policy(f, self.min_confidence)
        ]
        if not eligible:
            return findings

        selected, deferred = selection.select(eligible, self.max_verifications_per_run)

        outcomes: dict[int, VerificationOutcome] = {}
        for idx, finding in deferred:
            outcomes[idx] = VerificationOutcome(
                status=VerificationStatus.NOT_ATTEMPTED,
                reason="capacity_exceeded",
                pattern=finding.get("pattern"),
                target_adapter=adapter_cls.name,
            )

        adapter = adapter_cls(target_path)
        try:
            with sandbox.launch(adapter, target_path, self.startup_timeout_s, self.total_timeout_s) as (
                base_url, sandbox_dir,
            ):
                for idx, finding in selected:
                    outcomes[idx] = self._run_one(adapter, finding, base_url, sandbox_dir)
        except Exception as e:
            reason = f"target_start_failed: {e}"
            for idx, finding in selected:
                outcomes[idx] = VerificationOutcome(
                    status=VerificationStatus.INCONCLUSIVE,
                    reason=reason,
                    pattern=finding.get("pattern"),
                    target_adapter=adapter_cls.name,
                )

        enriched = list(findings)
        for idx, outcome in outcomes.items():
            enriched[idx] = {**enriched[idx], "runtime_verification": outcome.to_dict()}
        return enriched

    def _run_one(self, adapter, finding: dict, base_url: str, sandbox_dir: str) -> VerificationOutcome:
        pattern = finding.get("pattern")
        recipe = recipes.RECIPE_REGISTRY[pattern]
        oracle = oracles.ORACLE_REGISTRY[pattern]

        try:
            evidence = recipe(adapter, finding, base_url, sandbox_dir)
        except Exception as e:
            return VerificationOutcome(
                status=VerificationStatus.INCONCLUSIVE,
                reason=f"recipe_error: {e}",
                pattern=pattern,
                target_adapter=adapter.name,
            )

        status = oracle(evidence)
        reason = evidence.raw.get("resolution_error") or evidence.raw.get("setup_error")
        request = evidence.raw.get("request", {})

        outcome = VerificationOutcome(
            status=status,
            reason=reason,
            pattern=pattern,
            target_adapter=adapter.name,
            request=request,
            evidence=evidence,
        )
        outcome.narrative = self._narrative_writer.describe(finding, status.value, request, evidence)
        return outcome
