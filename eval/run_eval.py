#!/usr/bin/env python3
"""CLI: python -m eval.run_eval <target_path> [--ground-truth path]

Runs Semgrep+SCA alone vs. the full pipeline over a target and prints a precision/recall/F1
comparison table against a ground_truth.csv (see test_targets/*/ground_truth.csv for format).
The full-pipeline result is further broken out by layer (Layer 1 Semgrep/SCA vs. Layer 3
AI-Pattern-Agent) so layer-3 hallucination rate is visible on its own, not hidden inside the
pooled aggregate (LLM09 — see security/llm_top10_notes.md).

The full-pipeline row requires ANTHROPIC_API_KEY (layers 2-4 call the Anthropic API) and is
skipped with a warning if it's not set, so the Semgrep-only baseline can still be measured.
"""
import argparse
import os
import sys

from dotenv import load_dotenv

from detectors.sca_runner import run_sca
from detectors.semgrep_runner import run_semgrep
from eval.benchmark import load_ground_truth, score

# tool -> layer grouping for the per-layer breakdown. See detectors/semgrep_runner.py,
# detectors/sca_runner.py, and agents/ai_pattern_agent.py for where each `tool` value is set.
LAYER1_TOOLS = {"semgrep", "pip-audit", "npm-audit", "osv-scanner"}


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Compare Semgrep-only vs. the full pipeline against a ground-truth CSV"
    )
    parser.add_argument("target", help="Path to the target repo to scan")
    parser.add_argument(
        "--ground-truth", help="Path to ground_truth.csv (defaults to <target>/ground_truth.csv)"
    )
    args = parser.parse_args()

    gt_path = args.ground_truth or os.path.join(args.target, "ground_truth.csv")
    ground_truth = load_ground_truth(gt_path)

    rows = []

    semgrep_only = run_semgrep(args.target) + run_sca(args.target)
    rows.append(("Semgrep + SCA only", score(semgrep_only, ground_truth)))

    try:
        from core.orchestrator import Orchestrator

        full_pipeline = Orchestrator(args.target).run()
        rows.append(("Full pipeline", score(full_pipeline, ground_truth)))

        layer1_findings = [f for f in full_pipeline if f.get("tool") in LAYER1_TOOLS]
        layer3_findings = [f for f in full_pipeline if f.get("tool") == "ai-pattern-agent"]
        rows.append(("  Layer 1 (Semgrep/SCA)", score(layer1_findings, ground_truth)))
        rows.append(("  Layer 3 (AI-Pattern)", score(layer3_findings, ground_truth)))
    except Exception as e:
        print(f"Skipping full-pipeline run (requires ANTHROPIC_API_KEY): {e}", file=sys.stderr)

    _print_table(rows)
    return 0


def _print_table(rows: list[tuple[str, dict]]) -> None:
    # location_recall drops the owasp_id requirement (file+line match only) — it separates
    # "found the vulnerability" from "labeled it with the exact right OWASP category". See
    # eval/benchmark.py's score() docstring.
    print(
        f"{'tool':<22}{'precision':>10}{'recall':>10}{'f1':>10}{'loc_recall':>12}"
        "   tp / found   matched / gt"
    )
    for name, result in rows:
        print(
            f"{name:<22}{result['precision']:>10.2f}{result['recall']:>10.2f}{result['f1']:>10.2f}"
            f"{result['location_recall']:>12.2f}"
            f"   {result['true_positive_findings']:>4} / {result['total_findings']:<6}"
            f"  {result['matched_ground_truth']:>4} / {result['total_ground_truth']}"
        )


if __name__ == "__main__":
    sys.exit(main())
