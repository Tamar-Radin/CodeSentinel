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
| LLM02:2025 Sensitive Information Disclosure | Target-repo secrets/PII sent to a third-party LLM API, or echoed unredacted into `findings.json` / the dashboard / the CI PR comment | Mitigated | `mask_finding_secrets()` in `core/secret_masking.py` recursively regex-redacts secret-looking values on every string field of every finding (including nested `proposed_patch`/`enables` structures), applied once as the last step of `Orchestrator.run()` — so it covers Semgrep/npm-audit messages, `ConfidenceAgent`'s evidence/reasoning fields, `AIPatternAgent`'s reasoning, `ChainCorrelator`'s narrative text, and `PatchGenerator`'s diff/explanation, regardless of which layer produced the text, before `findings.json` is ever written. `agents/ai_pattern_agent.py` additionally calls `mask_secrets()` on its own `reasoning` field at the source, as defense-in-depth for any future code path that constructs findings without going through `Orchestrator.run()`. `dashboard/app.py` renders findings via `st.dataframe`/`st.json` only; `ci/format_pr_comment.py` reads already-masked `findings.json` and adds no new field content of its own. README has a "Data sent to the Anthropic API" section disclosing that scanned source code (not just findings) is sent to the API, and that fork PRs on CI have no `ANTHROPIC_API_KEY` and skip this. |
| LLM03:2025 Supply Chain | Unpinned dependencies of the agent's own toolchain | Partial | `requirements.txt` uses `>=`, not pinned/locked. Combine with ASI04 (Semgrep ruleset pinning). Recommend a lockfile (`pip freeze` / `pip-compile`) before any public release. |
| LLM04:2025 Data and Model Poisoning | N/A | No | No fine-tuning or training data — uses the hosted Claude API as-is. |
| LLM05:2025 Improper Output Handling | Unvalidated JSON from the model flowing into `ChainCorrelator` / `PatchGenerator` / the dashboard | Mitigated | `_parse_response()` in `confidence_agent.py`, `ai_pattern_agent.py`, `chain_correlator.py`, and `patch_generator.py` all parse with `json.loads` inside `try/except` and validate against an explicit required-keys schema before returning; malformed items are dropped (or, for `patch_generator.py`, the whole call fails soft to `{"patchable": False, ...}`) rather than failing the whole scan. Never `eval()`. `dashboard/app.py` never passes model text into `st.markdown(..., unsafe_allow_html=True)`. `PatchGenerator`'s `diff` is still just returned as text for human review — nothing in this codebase runs `git apply` on it (ASI05); if a caller is added that does, that `git apply` step is the next thing needing validation (untrusted patch content, path traversal in the diff header, etc.), not the JSON parsing itself. |
| LLM06:2025 Excessive Agency | Scope of what the model call is allowed to trigger | Mitigated | Same control as ASI02 — agents only return structured findings; they do not get tool-calling/function-calling access. If tool use is added later (e.g. an agent invoking Read/Grep itself), this row needs re-review. |
| LLM07:2025 System Prompt Leakage | `SYSTEM_PROMPT` in both agents encodes the project's ~15 AI-pattern list — its actual differentiator | Yes | No secrets/credentials live in the system prompt today (verified). Keep it that way — never put API keys or tokens in a system prompt. Leakage of the pattern list itself is a methodology-exposure risk, not a credential risk; low severity but worth noting if the prompt is ever echoed back in a debug/verbose mode. |
| LLM08:2025 Vector and Embedding Weaknesses | N/A | No | No RAG/vector store (same as ASI06). Re-review if persistent memory across scans is added. |
| LLM09:2025 Misinformation | Hallucinated findings from `AIPatternAgent` (layer 3), which — unlike layer 1 — has no deterministic backstop | Yes | Partially mitigated by always surfacing supporting/counter evidence (ASI09) instead of a bare score. `eval/benchmark.py` (precision/recall/F1 via `score()`) and `eval/run_eval.py` (CLI comparing Semgrep+SCA-only vs. the full pipeline) are implemented; `eval/run_eval.py`'s full-pipeline result is further split into a Layer 1 (Semgrep/SCA) row and a Layer 3 (AI-Pattern-Agent) row, filtered by each finding's `tool` field, so layer-3 hallucination rate is measurable and disclosed on its own instead of hidden inside the pooled aggregate. |
| LLM10:2025 Unbounded Consumption | Unbounded number of LLM calls / tokens / cost when scanning a large target repo | Mitigated | `MAX_FILES_PER_SCAN` / `MAX_FILE_BYTES` in `ai_pattern_agent.py`, `MAX_FINDINGS_PER_RUN` in `confidence_agent.py`, and `MAX_FINDINGS_FOR_CORRELATION` in `chain_correlator.py` cap files, bytes, and findings sent to the model regardless of target size. |

## Remaining open items

1. Pin `requirements.txt` (or add a lockfile) before any public/CI-shared release (LLM03).
2. ~~Document in the README that scanned source is sent to the Anthropic API (LLM02).~~ Done —
   see the "Data sent to the Anthropic API" section in `README.md`.
3. ~~Track false-positive rate for layer-3-only (`AIPatternAgent`) findings separately in
   `eval/benchmark.py`/`eval/run_eval.py` output, so hallucination rate is measurable and
   disclosed (LLM09).~~ Done — `eval/run_eval.py`'s full-pipeline result now includes separate
   Layer 1 (Semgrep/SCA) and Layer 3 (AI-Pattern) rows, filtered by `tool`.
4. `PatchGenerator` is implemented and validates its own JSON output (see LLM05 row above), but
   nothing consumes `diff` yet beyond writing it into `findings.json`/the dashboard as text. If a
   future feature adds a "review and apply" flow that runs `git apply` on `diff`, that step needs
   its own review (sandboxed apply, path checks on the diff header) before it ships — ASI05.
