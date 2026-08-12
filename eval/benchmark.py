"""Precision/recall/F1 measurement against ground_truth.csv, comparing:
Semgrep-only / Claude Code's built-in /security-review / this full pipeline.
"""
import csv
import os

# How many lines apart a finding and a ground-truth row can be and still count as the same
# vulnerability. Different tools report the triggering line differently (e.g. a decorator line
# vs. the function body for the same missing-auth check).
LINE_TOLERANCE = 2


def load_ground_truth(csv_path: str) -> list[dict]:
    with open(csv_path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def score(findings: list[dict], ground_truth: list[dict]) -> dict:
    """Match findings against ground_truth by (file basename, owasp_id, line within
    LINE_TOLERANCE) and compute precision/recall/F1.

    Matching is tool-agnostic on purpose: Semgrep's check_id and the AI-Pattern Agent's
    pattern name use different vocabularies for the same vulnerability class, so owasp_id +
    location is the only field both sides agree on. File is compared by basename, not full
    path, since detectors normalize paths differently (relative-to-target vs. relative-to-cwd).
    """
    gt_rows = [_normalize_gt_row(row) for row in ground_truth]
    matched_gt_indices = set()
    true_positive_findings = 0

    for finding in findings:
        matched_any = False
        for gt_idx, gt_row in enumerate(gt_rows):
            if _is_match(finding, gt_row):
                matched_any = True
                matched_gt_indices.add(gt_idx)
        if matched_any:
            true_positive_findings += 1

    total_findings = len(findings)
    total_gt = len(gt_rows)

    precision = true_positive_findings / total_findings if total_findings else 0.0
    recall = len(matched_gt_indices) / total_gt if total_gt else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "true_positive_findings": true_positive_findings,
        "total_findings": total_findings,
        "matched_ground_truth": len(matched_gt_indices),
        "total_ground_truth": total_gt,
    }


def _normalize_gt_row(row: dict) -> dict:
    return {"file": row["file"], "line": int(row["line"]), "owasp_id": row["owasp_id"]}


def _is_match(finding: dict, gt_row: dict) -> bool:
    file = finding.get("file")
    line = finding.get("line")
    if not file or finding.get("owasp_id") != gt_row["owasp_id"]:
        return False
    if os.path.basename(file) != gt_row["file"]:
        return False
    if line is None:
        return False
    return abs(line - gt_row["line"]) <= LINE_TOLERANCE
