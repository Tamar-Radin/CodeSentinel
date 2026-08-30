"""Shared types for Layer 6. `VerificationStatus` is decided exclusively by a deterministic
oracle (verification/oracles.py) from `Evidence` collected by a recipe (verification/recipes.py)
— the LLM narrative step (verification/narrative.py) runs strictly afterward and has no way to
write back into `status`, by construction (its output schema has no such key)."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class VerificationStatus(str, Enum):
    CONFIRMED = "confirmed"
    NOT_CONFIRMED = "not_confirmed"
    INCONCLUSIVE = "inconclusive"
    NOT_ATTEMPTED = "not_attempted"


@dataclass
class Evidence:
    """Raw evidence a recipe collected. `baseline`/`attack` are the conventional shape for
    before/after-style checks; `raw` holds anything pattern-specific (canary tokens, resolution
    errors, setup errors) that doesn't fit that shape."""
    baseline: dict[str, Any] | None = None
    attack: dict[str, Any] | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"baseline": self.baseline, "attack": self.attack, **self.raw}


@dataclass
class VerificationOutcome:
    status: VerificationStatus
    pattern: str
    target_adapter: str
    reason: str | None = None
    request: dict[str, Any] = field(default_factory=dict)
    evidence: Evidence = field(default_factory=Evidence)
    narrative: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "reason": self.reason,
            "pattern": self.pattern,
            "target_adapter": self.target_adapter,
            "request": self.request,
            "evidence": self.evidence.to_dict(),
            "narrative": self.narrative,
        }
