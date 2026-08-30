from verification.selection import select


def test_select_prioritizes_higher_confidence_first():
    eligible = [
        (0, {"pattern": "path_traversal", "confidence": 0.7, "file": "a.py", "line": 1}),
        (1, {"pattern": "stubbed_auth_check", "confidence": 0.95, "file": "b.py", "line": 2}),
    ]
    selected, deferred = select(eligible, cap=2)
    assert [idx for idx, _ in selected] == [1, 0]
    assert deferred == []


def test_select_sorts_missing_confidence_after_numeric_confidence():
    eligible = [
        (0, {"pattern": "path_traversal", "confidence": None, "file": "a.py", "line": 1}),
        (1, {"pattern": "stubbed_auth_check", "confidence": 0.5, "file": "b.py", "line": 2}),
    ]
    selected, _ = select(eligible, cap=2)
    assert [idx for idx, _ in selected] == [1, 0]


def test_select_tiebreaks_equal_confidence_by_file_then_line_then_pattern():
    eligible = [
        (0, {"pattern": "stubbed_auth_check", "confidence": 0.8, "file": "b.py", "line": 1}),
        (1, {"pattern": "path_traversal", "confidence": 0.8, "file": "a.py", "line": 5}),
        (2, {"pattern": "path_traversal", "confidence": 0.8, "file": "a.py", "line": 2}),
    ]
    selected, _ = select(eligible, cap=3)
    assert [idx for idx, _ in selected] == [2, 1, 0]


def test_select_respects_cap_and_reports_the_rest_as_deferred():
    eligible = [
        (0, {"pattern": "stubbed_auth_check", "confidence": 0.9, "file": "a.py", "line": 1}),
        (1, {"pattern": "path_traversal", "confidence": 0.8, "file": "b.py", "line": 1}),
        (2, {"pattern": "path_traversal", "confidence": 0.5, "file": "c.py", "line": 1}),
    ]
    selected, deferred = select(eligible, cap=2)
    assert [idx for idx, _ in selected] == [0, 1]
    assert [idx for idx, _ in deferred] == [2]


def test_select_ordering_is_deterministic_across_repeated_calls():
    eligible = [
        (0, {"pattern": "path_traversal", "confidence": 0.6, "file": "z.py", "line": 9}),
        (1, {"pattern": "stubbed_auth_check", "confidence": 0.6, "file": "a.py", "line": 3}),
        (2, {"pattern": "stubbed_auth_check", "confidence": None, "file": "m.py", "line": 1}),
    ]
    first = [idx for idx, _ in select(eligible, cap=3)[0]]
    second = [idx for idx, _ in select(list(reversed(eligible)), cap=3)[0]]
    assert first == second == [1, 0, 2]
