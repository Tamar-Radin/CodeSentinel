"""Wires all pipeline layers together: Detection -> Confidence -> AI-Pattern -> Confidence -> Correlator -> Remediation."""
from agents.ai_pattern_agent import AIPatternAgent
from agents.chain_correlator import ChainCorrelator
from agents.confidence_agent import ConfidenceAgent
from core.secret_masking import mask_finding_secrets
from detectors.semgrep_runner import run_semgrep
from detectors.sca_runner import run_sca
from remediation.patch_generator import PatchGenerator
from verification.runtime_verifier import RuntimeVerifier


class Orchestrator:
    def __init__(self, target_path: str, verify_runtime: bool = False):
        self.target_path = target_path
        # Opt-in only (default False): Layer 6 actually executes the scanned target inside a
        # process-isolated sandbox (see verification/sandbox.py) — never turned on implicitly.
        # See security/agent_hardening_notes.md (ASI05) for what this executes and how.
        self.verify_runtime = verify_runtime

    def run(self) -> list[dict]:
        # Layer 1: deterministic detection
        findings = run_semgrep(self.target_path)
        findings += run_sca(self.target_path)

        # Layer 2: Confidence/Context Agent — annotates each finding with
        # supporting/counter evidence and a confidence score. This first pass only sees
        # layer-1 findings; layer-3 findings don't exist yet at this point in the pipeline.
        findings = ConfidenceAgent().annotate(findings, self.target_path)

        # Layer 3: AI-Pattern Agent — scans whole files for patterns Semgrep can't
        # express (business logic, missing authz, fail-open handling), independent
        # of the layer 1 findings above. Stays a pure detection layer: no self-assessed
        # confidence, no schema/prompt change.
        ai_findings = AIPatternAgent().scan(self.target_path)

        # Layer-3 findings get their own, separate Confidence Agent pass — same annotate()
        # logic reused a second time against only the new findings — so they end up with the
        # same evidence/confidence fields layer-1 findings already got above, without ever
        # re-annotating layer-1 findings a second time.
        ai_findings = ConfidenceAgent().annotate(ai_findings, self.target_path)
        findings += ai_findings

        # Layer 4: Chain Correlator — links findings into "enables/amplifies" attack chains
        findings = ChainCorrelator().correlate(findings)

        # Layer 5 (stretch): Remediation — attaches a proposed diff to a bounded set of
        # high-confidence, pattern-supported findings. Never applied automatically (ASI05);
        # `proposed_patch` is for human review only.
        findings = PatchGenerator().generate_all(findings, self.target_path)

        # Layer 6 (opt-in, stretch): Runtime Exploit Verification — actually runs the scanned
        # target in a process-isolated sandbox and attempts to reproduce a finding's
        # vulnerability. Additive only: skipped entirely unless verify_runtime=True, and only
        # ever adds a runtime_verification key to findings that entered its eligibility funnel.
        # See verification/runtime_verifier.py and security/agent_hardening_notes.md (ASI05).
        if self.verify_runtime:
            findings = RuntimeVerifier().verify_all(findings, self.target_path)

        # LLM02:2025 Sensitive Information Disclosure — scrub secret-looking values out of
        # every free-text field (including nested proposed_patch/enables structures) on every
        # finding, from every layer, as the last step before returning. This is what makes
        # findings.json / the dashboard / the CI PR comment all safe to consume, regardless of
        # which layer produced a given field. See core/secret_masking.py.
        findings = [mask_finding_secrets(f) for f in findings]

        return findings
