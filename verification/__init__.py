"""Layer 6 — Runtime Exploit Verification (opt-in).

Actually runs a scanned target (inside an ephemeral, process-isolated sandbox — see
`verification/sandbox.py`) and attempts to reproduce a finding's vulnerability, to confirm
reliability without manual review. This is additive only: `Orchestrator.run()` without
`verify_runtime=True` never imports or touches this package, and a finding only gains a
`runtime_verification` key when it actually entered this layer's eligibility funnel.

See security/agent_hardening_notes.md (ASI05) for what this executes and how it's contained,
and `CODE_REVIEW.md`/the plan doc for the full design rationale (Recipe vs. Oracle separation,
deterministic status, LLM used only for a post-hoc narrative).
"""
