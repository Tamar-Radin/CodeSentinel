"""Oracles: pure functions from Evidence -> VerificationStatus. No LLM, no I/O, no network —
fully unit-testable with synthetic Evidence objects. This is the ONLY place `status` is decided;
verification/narrative.py runs strictly afterward and cannot influence what's returned here."""
from __future__ import annotations

from verification.types import Evidence, VerificationStatus


def decide_stubbed_auth_check(evidence: Evidence) -> VerificationStatus:
    if evidence.raw.get("resolution_error") or evidence.raw.get("setup_error"):
        return VerificationStatus.INCONCLUSIVE
    attack = evidence.attack or {}
    status = attack.get("status")
    readback_status = attack.get("readback_status")
    if status is None or readback_status is None:
        return VerificationStatus.INCONCLUSIVE
    if status in (200, 204) and readback_status == 404:
        return VerificationStatus.CONFIRMED
    if status in (401, 403):
        return VerificationStatus.NOT_CONFIRMED
    return VerificationStatus.INCONCLUSIVE


def decide_path_traversal(evidence: Evidence) -> VerificationStatus:
    if evidence.raw.get("resolution_error"):
        return VerificationStatus.INCONCLUSIVE
    token = evidence.raw.get("canary_token")
    attack = evidence.attack or {}
    body = attack.get("body")
    status = attack.get("status")
    if token is None or body is None or status is None:
        return VerificationStatus.INCONCLUSIVE
    # status must be a clean 200 AND contain the token — a non-200 response (e.g. a 500 whose
    # error handler happens to echo the requested filename back in its message text) must never
    # confirm: that's the file NOT being served, not evidence it was. Only a 200 means send_file
    # actually streamed real file content back.
    if status == 200 and token in body:
        return VerificationStatus.CONFIRMED
    if status in (403, 404):
        return VerificationStatus.NOT_CONFIRMED
    return VerificationStatus.INCONCLUSIVE


ORACLE_REGISTRY = {
    "stubbed_auth_check": decide_stubbed_auth_check,
    "path_traversal": decide_path_traversal,
}
