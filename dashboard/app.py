# LLM02:2025 Sensitive Information Disclosure / LLM05:2025 Improper Output Handling —
# render findings as data (st.dataframe/st.json), never as unsafe_allow_html markdown, and
# never display raw secret values from hardcoded_demo_credentials findings — mask them
# upstream before they reach findings.json. See security/llm_top10_notes.md.
"""Streamlit dashboard: streamlit run dashboard/app.py"""
import json

import streamlit as st

from chains import build_graph_dot, combined_chains, pairwise_edges

st.set_page_config(page_title="Security Agent", layout="wide")
st.title("Security Agent — Findings Dashboard")

uploaded = st.file_uploader("Load a findings.json produced by scan.py", type="json")

if uploaded:
    findings = json.load(uploaded)
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
else:
    st.info("Run `python scan.py <target> --out findings.json` and upload the result here.")
