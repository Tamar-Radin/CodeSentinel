from dashboard.chains import build_graph_dot, combined_chains, pairwise_edges


def test_pairwise_edges_reads_only_the_enables_side():
    findings = [
        {
            "file": "a.py",
            "line": 1,
            "enables": [{"file": "b.py", "line": 2, "narrative": "a enables b", "relationship": "sequential"}],
        },
        {
            "file": "b.py",
            "line": 2,
            "enabled_by": [{"file": "a.py", "line": 1, "narrative": "a enables b", "relationship": "sequential"}],
        },
    ]

    edges = pairwise_edges(findings)

    assert edges == [
        {"From": "a.py:1", "To": "b.py:2", "Relationship": "sequential", "Narrative": "a enables b"}
    ]


def test_pairwise_edges_defaults_relationship_when_missing():
    findings = [{"file": "a.py", "line": 1, "enables": [{"file": "b.py", "line": 2, "narrative": "x"}]}]
    assert pairwise_edges(findings)[0]["Relationship"] == "sequential"


def test_combined_chains_dedupes_across_all_participating_findings():
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
        {"file": "a.py", "line": 1, "attack_chains": [chain]},
        {"file": "b.py", "line": 2, "attack_chains": [chain]},
        {"file": "c.py", "line": 3, "attack_chains": [chain]},
    ]

    rows = combined_chains(findings)

    assert rows == [{"Findings": "a.py:1, b.py:2", "Target": "c.py:3", "Narrative": "a+b enable c"}]


def test_combined_chains_returns_empty_list_when_no_chains_present():
    assert combined_chains([{"file": "a.py", "line": 1}]) == []


def test_build_graph_dot_returns_none_when_no_edges_or_chains():
    assert build_graph_dot([{"file": "a.py", "line": 1}]) is None


def test_build_graph_dot_draws_pairwise_edge_with_relationship_label():
    findings = [
        {
            "file": "a.py",
            "line": 1,
            "enables": [{"file": "b.py", "line": 2, "narrative": "x", "relationship": "amplifies"}],
        }
    ]

    dot = build_graph_dot(findings)

    assert dot is not None
    assert dot.startswith("digraph attack_chains {")
    assert '"a.py:1" -> "b.py:2"' in dot
    assert 'label="amplifies"' in dot
    assert "style=dashed" in dot


def test_build_graph_dot_draws_combined_chain_through_a_junction_node():
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
        {"file": "a.py", "line": 1, "attack_chains": [chain]},
        {"file": "b.py", "line": 2, "attack_chains": [chain]},
        {"file": "c.py", "line": 3, "attack_chains": [chain]},
    ]

    dot = build_graph_dot(findings)

    assert dot is not None
    assert '"a.py:1" -> _combined_0' in dot
    assert '"b.py:2" -> _combined_0' in dot
    assert '_combined_0 -> "c.py:3"' in dot
    assert "combined: a+b enable c" in dot
    # not decomposed into direct pairwise edges from a contributor straight to the target
    assert '"a.py:1" -> "c.py:3"' not in dot
    assert '"b.py:2" -> "c.py:3"' not in dot


def test_build_graph_dot_escapes_quotes_and_backslashes_in_node_keys():
    findings = [
        {
            "file": r'weird"file\name.py',
            "line": 1,
            "enables": [{"file": "b.py", "line": 2, "narrative": "x"}],
        }
    ]

    dot = build_graph_dot(findings)

    assert dot is not None
    assert r'weird\"file\\name.py' in dot
