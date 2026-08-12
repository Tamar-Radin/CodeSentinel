# LLM Application Risks — OWASP Top 10 for LLM Applications 2025

This is a third, separate OWASP list from the other two already tracked in this repo:
- OWASP Top 10:2025 (classic web appsec) — what the agent scans *for* in target code.
- OWASP Top 10 for Agentic Applications 2026 / ASI (`agent_hardening_notes.md`) — risks from
  the agent *acting* (tools, autonomy) on untrusted code.

LLM01-10 covers a different surface: the risks of the LLM *call itself* — the prompt sent,
the completion returned, its cost, and what it can leak. This applies directly here because
`agents/confidence_agent.py` and `agents/ai_pattern_agent.py` call `anthropic.Anthropic()`
with real target-repo source code as input.

| Code | Risk | Relevant here? | Mitigation in this codebase |
|---|---|---|---|
| LLM01:2025 Prompt Injection | Malicious instruction inside scanned code reaching the model | Yes | Already covered — see ASI01 in `agent_hardening_notes.md`; `SYSTEM_PROMPT` in both agents treats code as DATA and reports apparent injection as its own finding. |
| LLM02:2025 Sensitive Information Disclosure | Target-repo secrets/PII sent to a third-party LLM API, or echoed unredacted into `findings.json` / the dashboard | **Yes — unmitigated** | TODO: redact matched secret values (e.g. `hardcoded_demo_credentials` findings) before they are written to `findings.json` or rendered in `dashboard/app.py` — store a masked value + file/line, not the raw secret. Document in README that scanned source is sent to the Anthropic API. |
| LLM03:2025 Supply Chain | Unpinned dependencies of the agent's own toolchain | Partial | `requirements.txt` uses `>=`, not pinned/locked. Combine with ASI04 (Semgrep ruleset pinning). Recommend a lockfile (`pip freeze` / `pip-compile`) before any public release. |
| LLM04:2025 Data and Model Poisoning | N/A | No | No fine-tuning or training data — uses the hosted Claude API as-is. |
| LLM05:2025 Improper Output Handling | Unvalidated JSON from the model flowing into `ChainCorrelator` / `PatchGenerator` / the dashboard | **Yes — unmitigated** | When implementing the TODOs in `confidence_agent.py` / `ai_pattern_agent.py`, parse with `json.loads` inside a `try/except` and validate against an explicit schema (ties into ASI07) before returning — never `eval()` model output, never pass raw model text into `st.markdown(..., unsafe_allow_html=True)` in `dashboard/app.py`. |
| LLM06:2025 Excessive Agency | Scope of what the model call is allowed to trigger | Mitigated | Same control as ASI02 — agents only return structured findings; they do not get tool-calling/function-calling access. If tool use is added later (e.g. an agent invoking Read/Grep itself), this row needs re-review. |
| LLM07:2025 System Prompt Leakage | `SYSTEM_PROMPT` in both agents encodes the project's ~15 AI-pattern list — its actual differentiator | Yes | No secrets/credentials live in the system prompt today (verified). Keep it that way — never put API keys or tokens in a system prompt. Leakage of the pattern list itself is a methodology-exposure risk, not a credential risk; low severity but worth noting if the prompt is ever echoed back in a debug/verbose mode. |
| LLM08:2025 Vector and Embedding Weaknesses | N/A | No | No RAG/vector store (same as ASI06). Re-review if persistent memory across scans is added. |
| LLM09:2025 Misinformation | Hallucinated findings from `AIPatternAgent` (layer 3), which — unlike layer 1 — has no deterministic backstop | Yes | Partially mitigated by always surfacing supporting/counter evidence (ASI09) instead of a bare score. `eval/benchmark.py` should track false-positive rate for layer-3-only findings specifically, separate from Semgrep-confirmed findings, so hallucination rate is measurable and disclosed. |
| LLM10:2025 Unbounded Consumption | Unbounded number of LLM calls / tokens / cost when scanning a large target repo | **Yes — unmitigated** | Add explicit caps: `AIPatternAgent.scan()` should cap files scanned per run and max bytes per file sent; `ConfidenceAgent.annotate()` should cap findings annotated per run. See `MAX_FILES_PER_SCAN` / `MAX_FINDINGS_PER_RUN` constants added to the agent modules. |

## Immediate action items (tracked as TODOs in code)

1. `agents/ai_pattern_agent.py` — cap files/bytes sent to the model per scan (LLM10).
2. `agents/confidence_agent.py` — cap findings annotated per run (LLM10).
3. When the JSON-parsing TODOs are implemented, validate structure before use, never `eval()` (LLM05).
4. Before writing `findings.json` / rendering in `dashboard/app.py`, mask secret values found by
   the `hardcoded_demo_credentials` pattern instead of storing them verbatim (LLM02).
5. Pin `requirements.txt` (or add a lockfile) before any public/CI-shared release (LLM03).
