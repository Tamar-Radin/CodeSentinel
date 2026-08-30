from pathlib import Path

from verification.adapters.flask_crud_adapter import FlaskCrudAdapter
from verification.registry import resolve_adapter

CRUD_APP_DIR = Path(__file__).resolve().parent.parent / "test_targets" / "ai-generated-crud-app"


def test_resolve_adapter_matches_the_real_crud_app_fixture():
    assert resolve_adapter(str(CRUD_APP_DIR)) is FlaskCrudAdapter


def test_resolve_adapter_returns_none_for_an_unrecognized_target(tmp_path):
    assert resolve_adapter(str(tmp_path)) is None


def test_resolve_adapter_refuses_when_more_than_one_adapter_claims_the_target(monkeypatch):
    class AlwaysMatches(FlaskCrudAdapter):
        @classmethod
        def identify(cls, target_path):
            return True

    import verification.registry as registry_module

    monkeypatch.setattr(registry_module, "REGISTERED_ADAPTERS", [FlaskCrudAdapter, AlwaysMatches])
    # Both FlaskCrudAdapter (correctly) and AlwaysMatches (stubbed) claim this real fixture —
    # an ambiguous match must refuse rather than picking one arbitrarily.
    assert resolve_adapter(str(CRUD_APP_DIR)) is None
