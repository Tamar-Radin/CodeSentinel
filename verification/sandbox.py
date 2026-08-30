"""Process-level isolation for launching a scanned target during runtime verification.

Explicit and unambiguous: this is process-level isolation, NOT container/VM-level isolation.
There is no seccomp, no network namespace, no filesystem quota — the target runs directly on
the host under the invoking user's own OS permissions, inside a disposable directory copy with a
bounded lifetime. See security/agent_hardening_notes.md (ASI05) for the full risk/mitigation
statement. No agent/LLM-facing code calls anything in this module directly — only
`RuntimeVerifier` and `TargetAdapter` implementations do (ASI02: Bash/process invocation stays
out of LLM-facing code, same posture as detectors/semgrep_runner.py).
"""
from __future__ import annotations

import contextlib
import os
import platform
import shutil
import socket
import subprocess
import tempfile
import threading
import time

_IS_WINDOWS = platform.system() == "Windows"

# Env vars a sandboxed child process is allowed to see. Deliberately excludes anything the
# orchestrator itself might hold (e.g. ANTHROPIC_API_KEY) — the scanned target must never be
# able to read or exfiltrate this pipeline's own secrets, even by accident.
_SAFE_ENV_KEYS = {
    "PATH", "SYSTEMROOT", "PATHEXT", "TEMP", "TMP", "COMSPEC", "WINDIR",
    "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE",
}


def make_stripped_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    stripped = {k: v for k, v in os.environ.items() if k.upper() in _SAFE_ENV_KEYS}
    if extra:
        stripped.update(extra)
    return stripped


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_for_port(host: str, port: int, timeout_s: float) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        with contextlib.suppress(OSError):
            with socket.create_connection((host, port), timeout=1):
                return True
        time.sleep(0.2)
    return False


def spawn_process(cmd: list[str], cwd: str, env: dict[str, str]) -> subprocess.Popen:
    kwargs: dict = {"cwd": cwd, "env": env, "stdout": subprocess.PIPE, "stderr": subprocess.PIPE}
    if _IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    return subprocess.Popen(cmd, **kwargs)


def kill_process(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    if _IS_WINDOWS:
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(process.pid)],
            capture_output=True, check=False,
        )
    else:
        import signal
        with contextlib.suppress(ProcessLookupError):
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
    with contextlib.suppress(Exception):
        process.wait(timeout=5)


@contextlib.contextmanager
def launch(adapter, target_path: str, startup_timeout_s: float, total_timeout_s: float):
    """Safety checks, in order, all fail-closed, BEFORE the target process is ever started:
    (1) caller already confirmed `adapter.identify(target_path)` via the registry — this
    function trusts that was done; (2) ephemeral temp-dir copy of the target — never launches
    from the user's actual working tree; (3) `adapter.start()` is responsible for binding
    localhost-only and stripping the child env (via make_stripped_env above) before spawning;
    (4) a hard total-runtime watchdog is armed only once `start()` has actually returned a
    reachable base_url. Yields (base_url, sandbox_copy_dir); guarantees `adapter.stop()` and
    temp-dir removal on every exit path, including on exception or watchdog timeout."""
    sandbox_root = tempfile.mkdtemp(prefix="rv_sandbox_")
    copy_dir = os.path.join(sandbox_root, "target")
    watchdog: threading.Timer | None = None
    try:
        shutil.copytree(target_path, copy_dir)
        base_url = adapter.start(copy_dir, startup_timeout_s=startup_timeout_s)
        watchdog = threading.Timer(total_timeout_s, adapter.stop)
        watchdog.daemon = True
        watchdog.start()
        yield base_url, copy_dir
    finally:
        if watchdog is not None:
            watchdog.cancel()
        with contextlib.suppress(Exception):
            adapter.stop()
        shutil.rmtree(sandbox_root, ignore_errors=True)
