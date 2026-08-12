# Security Agent — AI-Generated Code Vulnerability Detection

Hybrid (deterministic + LLM) pipeline for detecting security vulnerabilities in code,
with a specific focus on patterns common in AI-generated code (Copilot/Cursor/Claude).
Mapped to OWASP Top 10:2025.

See `ארכיטקטורה_ותוכנית_עבודה_מעודכנת.md` for the full architecture and work plan.

## Quick start

```bash
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt

python scan.py <path-to-target-repo>
```

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
