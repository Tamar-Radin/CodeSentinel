import sys
from pathlib import Path

# ci/ has no __init__.py (it's a standalone CI step, not an importable package) — add it to
# sys.path directly rather than turning it into a package, since ci/github-action.yml invokes
# it as a plain script (`python ci/format_pr_comment.py ...`).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ci"))

from format_pr_comment import format_comment  # noqa: E402


def _finding(file, line, **extra):
    return {"file": file, "line": line, "severity": "high", "owasp_id": "A03", "message": "msg", **extra}


def test_format_comment_has_no_chains_section_without_chains():
    comment = format_comment([_finding("a.py", 1)])
    assert "Attack chains" not in comment


def test_format_comment_lists_each_combined_chain_once():
    chain = {
        "findings": [
            {"index": 0, "file": "a.py", "line": 1},
            {"index": 1, "file": "b.py", "line": 2},
        ],
        "target": {"index": 2, "file": "c.py", "line": 3},
        "relationship": "combined",
        "narrative": "a+b enable c",
    }
    findings = [
        _finding("a.py", 1, attack_chains=[chain]),
        _finding("b.py", 2, attack_chains=[chain]),
        _finding("c.py", 3, attack_chains=[chain]),
    ]

    comment = format_comment(findings)

    assert comment.count("a+b enable c") == 1
    assert "`a.py:1`, `b.py:2`" in comment
    assert "`c.py:3`" in comment


def test_format_comment_escapes_pipe_in_chain_narrative():
    chain = {
        "findings": [{"index": 0, "file": "a.py", "line": 1}, {"index": 1, "file": "b.py", "line": 2}],
        "target": {"index": 2, "file": "c.py", "line": 3},
        "relationship": "combined",
        "narrative": "a | b enable c",
    }
    findings = [_finding("a.py", 1, attack_chains=[chain]), _finding("c.py", 3)]

    comment = format_comment(findings)

    assert "a \\| b enable c" in comment


def test_format_comment_has_no_patches_section_without_patches():
    comment = format_comment([_finding("a.py", 1)])
    assert "Proposed patches" not in comment


def test_format_comment_omits_non_patchable_findings_from_patches_section():
    finding = _finding(
        "a.py", 1,
        proposed_patch={"patchable": False, "diff": None, "explanation": "can't fix"},
    )

    comment = format_comment([finding])

    assert "Proposed patches" not in comment


def test_format_comment_lists_proposed_patch_diff():
    finding = _finding(
        "a.py", 1,
        proposed_patch={
            "patchable": True,
            "diff": "--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-old\n+new\n",
            "explanation": "fix it",
        },
    )

    comment = format_comment([finding])

    assert "Proposed patches" in comment
    assert "`a.py:1` — fix it" in comment
    assert "```diff" in comment
    assert "-old" in comment
    assert "+new" in comment


def test_format_comment_caps_inlined_patches():
    findings = [
        _finding(
            f"f{i}.py", i,
            proposed_patch={"patchable": True, "diff": f"diff-{i}", "explanation": f"fix-{i}"},
        )
        for i in range(7)
    ]

    comment = format_comment(findings)

    assert comment.count("<details>") == 5
    assert "and 2 more proposed patch(es)" in comment
