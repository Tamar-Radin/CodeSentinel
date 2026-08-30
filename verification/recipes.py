"""Recipes: HOW to perform a runtime-verification check — build and send request(s), collect
raw evidence. A recipe NEVER decides `status` itself; that's oracles.py's job, from the Evidence
a recipe returns. One recipe call = one verification attempt, even though it may send several
HTTP requests internally (e.g. baseline + attack, or setup + attack + read-back + cleanup).

Only `verification/` code (never an LLM-facing agent) constructs or sends these requests —
same ASI02 posture as detectors/semgrep_runner.py keeping subprocess invocation out of
agent-facing code.
"""
from __future__ import annotations

import contextlib
import http.client
import json
import os
import secrets
import sqlite3
from urllib.parse import urlsplit

from verification.types import Evidence


def _http_request(
    base_url: str, method: str, path: str, body: str | None = None,
    headers: dict[str, str] | None = None, timeout: float = 5.0,
) -> tuple[int, str]:
    """Raw HTTP via http.client so the path string is sent exactly as given — no dot-segment
    normalization, which the path_traversal recipe below depends on."""
    parts = urlsplit(base_url)
    conn = http.client.HTTPConnection(parts.hostname, parts.port, timeout=timeout)
    try:
        conn.request(method, path, body=body, headers=headers or {})
        resp = conn.getresponse()
        data = resp.read()
        return resp.status, data.decode("utf-8", errors="replace")
    finally:
        conn.close()


def _lookup_user_id(db_path: str, username: str) -> int | None:
    if not os.path.isfile(db_path):
        return None
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    finally:
        conn.close()
    return row[0] if row else None


def run_stubbed_auth_check(adapter, finding: dict, base_url: str, sandbox_dir: str) -> Evidence:
    """CRUD app's DELETE /api/users/<id> has no auth check at all. Setup/attack/cleanup
    contract: (1) register a dedicated, randomly-named throwaway user — never touches any
    pre-existing/seeded row; (2) confirm it exists (baseline); (3) call DELETE with no
    credentials; (4) read back to confirm the deletion actually happened, not just that the
    request returned 2xx; (5) best-effort cleanup in `finally` if the fixture is somehow still
    there (e.g. the attack was correctly denied)."""
    endpoint = adapter.resolve_endpoint(finding.get("file"), finding.get("line"))
    if endpoint is None:
        return Evidence(raw={"resolution_error": "endpoint_not_resolved"})

    fixture_username = f"_rv_{secrets.token_hex(8)}"
    register_body = json.dumps({"username": fixture_username, "password": secrets.token_hex(8)})
    reg_status, _ = _http_request(
        base_url, "POST", "/api/register", body=register_body,
        headers={"Content-Type": "application/json"},
    )
    if reg_status not in (200, 201):
        return Evidence(raw={"setup_error": f"register_failed_status_{reg_status}"})

    db_path = adapter.db_path(sandbox_dir)
    user_id = _lookup_user_id(db_path, fixture_username)
    if user_id is None:
        return Evidence(raw={"setup_error": "fixture_user_id_not_found"})

    attack_path = endpoint.path.replace("<int:user_id>", str(user_id))
    readback_path = f"/api/users/{user_id}"
    request_info = {"method": endpoint.method, "path": attack_path}
    # Explicit, empty — no Authorization/Cookie/etc. is ever attached to the attack call. Passed
    # as its own variable (rather than a bare {} inline) so the "no credentials were sent" claim
    # in the evidence below is read directly off what was actually passed to the HTTP call, not
    # asserted separately from it.
    attack_headers: dict[str, str] = {}
    try:
        baseline_status, _ = _http_request(base_url, "GET", readback_path)
        attack_status, _ = _http_request(base_url, endpoint.method, attack_path, headers=attack_headers)
        readback_status, _ = _http_request(base_url, "GET", readback_path)
        return Evidence(
            baseline={"status": baseline_status, "exists": baseline_status == 200},
            attack={
                "status": attack_status,
                "readback_status": readback_status,
                "authentication": {"sent": bool(attack_headers), "headers_sent": sorted(attack_headers)},
            },
            raw={"fixture_user_id": user_id, "request": request_info},
        )
    finally:
        with contextlib.suppress(Exception):
            still_status, _ = _http_request(base_url, "GET", readback_path)
            if still_status == 200:
                _http_request(base_url, "DELETE", attack_path)


def run_path_traversal(adapter, finding: dict, base_url: str, sandbox_dir: str) -> Evidence:
    """CRUD app's GET /api/files/<path:filename> joins `filename` onto UPLOAD_DIR with no
    sanitization. A canary file with a fresh random token is dropped just outside UPLOAD_DIR
    (never a real system file) before every attempt; the oracle only confirms if that exact
    per-attempt token comes back."""
    endpoint = adapter.resolve_endpoint(finding.get("file"), finding.get("line"))
    if endpoint is None:
        return Evidence(raw={"resolution_error": "endpoint_not_resolved"})
    if "<path:filename>" not in endpoint.path:
        return Evidence(raw={"resolution_error": "endpoint_not_file_serving"})

    served_dir = adapter.served_directory(sandbox_dir)
    token = secrets.token_hex(16)
    canary_name = f"rv_canary_{token}.txt"
    canary_path = os.path.join(os.path.dirname(served_dir.rstrip("/\\")), canary_name)
    prefix = endpoint.path.split("<path:filename>")[0]
    attack_path = f"{prefix}../{canary_name}"

    with open(canary_path, "w", encoding="utf-8") as f:
        f.write(token)
    try:
        status, body = _http_request(base_url, endpoint.method, attack_path)
        return Evidence(
            attack={"status": status, "body": body},
            raw={"canary_token": token, "request": {"method": endpoint.method, "path": attack_path}},
        )
    finally:
        with contextlib.suppress(OSError):
            os.remove(canary_path)


RECIPE_REGISTRY = {
    "stubbed_auth_check": run_stubbed_auth_check,
    "path_traversal": run_path_traversal,
}
