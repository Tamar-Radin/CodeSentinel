# LLM02:2025 Sensitive Information Disclosure / LLM05:2025 Improper Output Handling —
# render findings as data (st.dataframe/st.json), never as unsafe_allow_html markdown, and
# never display raw secret values from hardcoded_demo_credentials findings — mask them
# upstream before they reach findings.json. See security/llm_top10_notes.md.
"""Streamlit dashboard: streamlit run dashboard/app.py [-- <findings.json>]"""
import json
import sys
from collections import Counter

import streamlit as st

from chains import build_graph_dot, combined_chains, pairwise_edges

st.set_page_config(page_title="Security Agent", layout="wide")
st.title("Security Agent — Findings Dashboard")

preloaded_path = sys.argv[1] if len(sys.argv) > 1 else None

uploaded = st.file_uploader("Load a findings.json produced by scan.py", type="json")

if uploaded:
    findings = json.load(uploaded)
elif preloaded_path:
    with open(preloaded_path, encoding="utf-8") as f:
        findings = json.load(f)
else:
    findings = None

if findings is not None:
    st.write(f"{len(findings)} finding(s)")
    st.dataframe(findings)

    graph_dot = build_graph_dot(findings)
    if graph_dot:
        st.subheader("Attack chain graph")
        st.graphviz_chart(graph_dot)

    edges = pairwise_edges(findings)
    if edges:
        st.subheader("Attack chains — sequential / amplifying")
        st.dataframe(edges)

    chains = combined_chains(findings)
    if chains:
        st.subheader("Attack chains — combined (multi-finding)")
        st.dataframe(chains)

    patched = [f for f in findings if f.get("proposed_patch")]
    if patched:
        st.subheader("Proposed patches (Layer 5 — human review required, never auto-applied)")
        for f in patched:
            patch = f["proposed_patch"]
            label = f"{f.get('file') or '?'}:{f.get('line') or '?'} — {f.get('pattern') or f.get('check_id') or '?'}"
            with st.expander(label):
                st.write(patch.get("explanation") or "")
                if patch.get("patchable") and patch.get("diff"):
                    st.code(patch["diff"], language="diff")
                else:
                    st.info("Not patchable from the given context.")

    verified = [f for f in findings if f.get("runtime_verification")]
    if verified:
        st.subheader("Runtime exploit verification (Layer 6 — opt-in, sandboxed execution)")
        st.caption(
            "The scanned target was actually run in a process-isolated sandbox and these "
            "findings were re-attempted against it. `status` is decided by a deterministic "
            "oracle from observed evidence, never by the narrative text below — see "
            "verification/oracles.py."
        )

        status_meta = {
            "confirmed": ("🔴", "Confirmed exploitable"),
            "not_confirmed": ("🟢", "Attempted, not confirmed"),
            "inconclusive": ("🟡", "Inconclusive"),
            "not_attempted": ("⚪", "Not attempted"),
        }
        counts = Counter(f["runtime_verification"].get("status") for f in verified)
        cols = st.columns(len(status_meta))
        for col, (status, (emoji, label)) in zip(cols, status_meta.items()):
            col.metric(f"{emoji} {label}", counts.get(status, 0))

        for f in verified:
            rv = f["runtime_verification"]
            status = rv.get("status")
            emoji, label = status_meta.get(status, ("⚪", status or "unknown"))
            loc = f"{f.get('file') or '?'}:{f.get('line') or '?'}"
            pattern = f.get("pattern") or f.get("check_id") or "?"
            with st.expander(f"{emoji} {label} — {loc} — {pattern}"):
                if rv.get("narrative"):
                    st.write(rv["narrative"])
                st.caption(f"Adapter: {rv.get('target_adapter') or '?'}")
                if rv.get("reason"):
                    st.caption(f"Reason: {rv['reason']}")
                if rv.get("request"):
                    st.write("Request sent during verification:")
                    st.json(rv["request"])
                if rv.get("evidence"):
                    st.write("Evidence collected:")
                    st.json(rv["evidence"])
else:
    st.info("Run `security-agent scan <target> --out findings.json` and upload the result here.")
