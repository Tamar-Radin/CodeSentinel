import csv

from eval.benchmark import load_ground_truth, score


def _write_gt(tmp_path, rows):
    path = tmp_path / "ground_truth.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["file", "line", "vulnerability", "owasp_id", "severity", "notes"]
        )
        writer.writeheader()
        writer.writerows(rows)
    return str(path)


def test_load_ground_truth_reads_csv_rows(tmp_path):
    path = _write_gt(tmp_path, [{
        "file": "routes/login.ts", "line": "34", "vulnerability": "string_built_sql",
        "owasp_id": "A05:2025", "severity": "critical", "notes": "x",
    }])
    rows = load_ground_truth(path)
    assert len(rows) == 1
    assert rows[0]["file"] == "routes/login.ts"


def test_score_exact_match_counts_as_true_positive():
    findings = [{"file": "routes/login.ts", "line": 34, "owasp_id": "A05:2025"}]
    gt = [{"file": "routes/login.ts", "line": "34", "owasp_id": "A05:2025"}]
    result = score(findings, gt)
    assert result["precision"] == 1.0
    assert result["recall"] == 1.0
    assert result["true_positive_findings"] == 1
    assert result["matched_ground_truth"] == 1


def test_score_matches_by_basename_not_full_path():
    findings = [{"file": "/abs/path/to/routes/login.ts", "line": 34, "owasp_id": "A05:2025"}]
    gt = [{"file": "routes/login.ts", "line": "34", "owasp_id": "A05:2025"}]
    result = score(findings, gt)
    assert result["true_positive_findings"] == 1


def test_score_within_line_tolerance_still_matches():
    # LINE_TOLERANCE = 2, so a 2-line offset still counts as the same finding.
    findings = [{"file": "routes/login.ts", "line": 36, "owasp_id": "A05:2025"}]
    gt = [{"file": "routes/login.ts", "line": "34", "owasp_id": "A05:2025"}]
    result = score(findings, gt)
    assert result["true_positive_findings"] == 1


def test_score_outside_line_tolerance_does_not_match():
    findings = [{"file": "routes/login.ts", "line": 40, "owasp_id": "A05:2025"}]
    gt = [{"file": "routes/login.ts", "line": "34", "owasp_id": "A05:2025"}]
    result = score(findings, gt)
    assert result["true_positive_findings"] == 0
    assert result["precision"] == 0.0


def test_score_wrong_owasp_id_fails_strict_match_but_passes_location_recall():
    findings = [{"file": "routes/login.ts", "line": 34, "owasp_id": "A10:2025"}]
    gt = [{"file": "routes/login.ts", "line": "34", "owasp_id": "A05:2025"}]
    result = score(findings, gt)
    assert result["recall"] == 0.0
    assert result["location_recall"] == 1.0


def test_score_finding_without_line_never_matches():
    findings = [{"file": "routes/login.ts", "line": None, "owasp_id": "A05:2025"}]
    gt = [{"file": "routes/login.ts", "line": "34", "owasp_id": "A05:2025"}]
    result = score(findings, gt)
    assert result["true_positive_findings"] == 0


def test_score_empty_ground_truth_gives_zero_recall_not_zero_division_error():
    findings = [{"file": "x.py", "line": 1, "owasp_id": "A01:2025"}]
    result = score(findings, [])
    assert result["recall"] == 0.0
    assert result["total_ground_truth"] == 0


def test_score_empty_findings_gives_zero_precision_not_zero_division_error():
    gt = [{"file": "x.py", "line": "1", "owasp_id": "A01:2025"}]
    result = score([], gt)
    assert result["precision"] == 0.0
