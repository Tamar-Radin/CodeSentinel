"""TargetAdapter — the interface every runtime-verifiable target implements. `identify()` must
be a content fingerprint (reads real files and checks for multiple, independent, distinctive
markers) — never a path/directory-name substring check, so renaming a target directory can't
defeat it and an unrelated project can't falsely trigger it by sharing one string."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class EndpointRef:
    method: str
    path: str  # framework's own route template, e.g. "/api/users/<int:user_id>"


@dataclass
class Credential:
    identifier: str
    secret: str
    login_endpoint: str


class TargetAdapter(ABC):
    name: str

    def __init__(self, target_path: str):
        # `target_path` is the REAL, unsandboxed source tree — safe to read from directly for
        # resolution purposes (same posture as patch_generator._read_context / ai_pattern_agent
        # reading source), since reading isn't the risky operation here. Only `start()` operates
        # on a temp-dir copy, via verification.sandbox.launch.
        self.target_path = target_path

    @classmethod
    @abstractmethod
    def identify(cls, target_path: str) -> bool:
        """Content-fingerprint check: does target_path look like the specific fixture this
        adapter knows how to run and resolve routes for?"""

    @abstractmethod
    def start(self, sandbox_dir: str, startup_timeout_s: float) -> str:
        """Launches the target from the given (already-copied) sandbox_dir. Returns the base
        URL once the target is confirmed reachable. Raises on failure/timeout — callers must
        treat that as `inconclusive`, never let it propagate as a crash."""

    @abstractmethod
    def stop(self) -> None:
        """Idempotent — safe to call multiple times, including when start() never succeeded."""

    @abstractmethod
    def resolve_endpoint(self, file: str, line: int) -> EndpointRef | None:
        """Maps a finding's (file, line) to the concrete route it falls inside, or None if no
        route can be resolved for that location."""

    def resolve_credential(self, finding: dict) -> Credential | None:
        """Only overridden by adapters supporting hardcoded_demo_credentials's login-credential
        sub-case — source-derived, per-target, never parsed from the finding's free-text
        `reasoning`/`message`. Default: unsupported."""
        return None
