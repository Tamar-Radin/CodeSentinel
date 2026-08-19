# Security Agent — AI-Generated Code Vulnerability Detection

Hybrid (deterministic + LLM) pipeline for detecting security vulnerabilities in code,
with a specific focus on patterns common in AI-generated code (Copilot/Cursor/Claude).
Mapped to OWASP Top 10:2025.

See `ארכיטקטורה_ותוכנית_עבודה_מעודכנת.md` for the full architecture and work plan.

## Quick start

```bash
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.lock.txt   # or requirements.txt for direct deps only

python scan.py <path-to-target-repo>
```

## Data sent to the Anthropic API

Layers 2-4 (`agents/confidence_agent.py`, `agents/ai_pattern_agent.py`,
`agents/chain_correlator.py`) and, if enabled, Layer 5 (`remediation/patch_generator.py`) call
the Anthropic API (`anthropic.Anthropic()`, reading `ANTHROPIC_API_KEY` from the environment) to
analyze the target repository. This means:

- Source code from the scanned target repo — file contents around each finding
  (`±CONTEXT_LINES` in `confidence_agent.py`), and full file contents up to `MAX_FILE_BYTES` in
  `ai_pattern_agent.py` — is sent to the Anthropic API as part of the prompt.
- Chain Correlator (Layer 4) sends only structured finding summaries (file, line, check_id,
  message), never raw file content.
- If the target repo contains secrets or credentials in source (e.g. hardcoded demo
  credentials), those may be included in the source sent to the API for analysis, even though
  matched secret values are masked (`_mask_secrets()`) before being written back out to
  `findings.json` or the dashboard.
- Requests are bounded per run (`MAX_FILES_PER_SCAN`, `MAX_FILE_BYTES`, `MAX_FINDINGS_PER_RUN`,
  `MAX_FINDINGS_FOR_CORRELATION`, `MAX_PATCHES_PER_RUN`) but not zero — running this tool against
  a repository means sending some of its source code to a third-party LLM API. Do not run it
  against code you are not permitted to share with Anthropic.
- On CI (`ci/github-action.yml`), `ANTHROPIC_API_KEY` is unavailable on fork PRs by design, so
  those runs fall back to a Semgrep/SCA-only scan and no source is sent to the API.

See `security/llm_top10_notes.md` (LLM02) for the full risk analysis.

## Structure

- `detectors/` — Layer 1: deterministic scanners (Semgrep, SCA)
- `agents/` — Layers 2-4: Confidence/Context Agent, AI-Pattern Agent, Chain Correlator
- `remediation/` — Layer 5 (stretch): patch generation
- `core/` — orchestrator wiring all layers together
- `dashboard/` — Streamlit UI
- `ci/` — GitHub Action for PR-based scanning
- `test_targets/` — evaluation targets (Juice Shop, self-built AI-generated CRUD app)
- `eval/` — benchmark / precision-recall-F1 measurement
- `security/` — agent self-hardening notes (OWASP Agentic Top 10 / ASI01-10) and
  LLM-application risk notes (OWASP Top 10 for LLM Applications 2025 / LLM01-10)
