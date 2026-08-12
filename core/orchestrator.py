"""Wires all pipeline layers together: Detection -> Confidence -> AI-Pattern -> Correlator."""
from agents.ai_pattern_agent import AIPatternAgent
from agents.chain_correlator import ChainCorrelator
from agents.confidence_agent import ConfidenceAgent
from detectors.semgrep_runner import run_semgrep
from detectors.sca_runner import run_sca


class Orchestrator:
    def __init__(self, target_path: str):
        self.target_path = target_path

    def run(self) -> list[dict]:
        # Layer 1: deterministic detection
        findings = run_semgrep(self.target_path)
        findings += run_sca(self.target_path)

        # Layer 2: Confidence/Context Agent — annotates each finding with
        # supporting/counter evidence and a confidence score
        findings = ConfidenceAgent().annotate(findings, self.target_path)

        # Layer 3: AI-Pattern Agent — scans whole files for patterns Semgrep can't
        # express (business logic, missing authz, fail-open handling), independent
        # of the layer 1 findings above.
        findings += AIPatternAgent().scan(self.target_path)

        # Layer 4: Chain Correlator — links findings into "enables/amplifies" attack chains
        findings = ChainCorrelator().correlate(findings)

        return findings
