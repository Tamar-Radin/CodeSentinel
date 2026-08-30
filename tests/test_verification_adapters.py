from pathlib import Path

from verification.adapters.flask_crud_adapter import FlaskCrudAdapter

CRUD_APP_DIR = Path(__file__).resolve().parent.parent / "test_targets" / "ai-generated-crud-app"


def test_identify_true_for_the_real_crud_app_fixture():
    assert FlaskCrudAdapter.identify(str(CRUD_APP_DIR)) is True


def test_identify_false_for_an_unrelated_empty_directory(tmp_path):
    assert FlaskCrudAdapter.identify(str(tmp_path)) is False


def test_identify_false_when_only_one_marker_matches(tmp_path):
    # A project that happens to share ONE marker (e.g. the same demo password string) must not
    # be misidentified — identify() requires all of the markers together.
    (tmp_path / "app.py").write_text('ADMIN_PASSWORD = "admin123"\n# unrelated project\n')
    assert FlaskCrudAdapter.identify(str(tmp_path)) is False


def test_resolve_endpoint_maps_line_inside_delete_handler_to_the_delete_route():
    adapter = FlaskCrudAdapter(str(CRUD_APP_DIR))
    endpoint = adapter.resolve_endpoint("app.py", 116)  # inside delete_user's body
    assert endpoint is not None
    assert endpoint.method == "DELETE"
    assert endpoint.path == "/api/users/<int:user_id>"


def test_resolve_endpoint_maps_line_inside_download_handler_to_the_file_route():
    adapter = FlaskCrudAdapter(str(CRUD_APP_DIR))
    endpoint = adapter.resolve_endpoint("app.py", 133)  # inside download_file's body
    assert endpoint is not None
    assert endpoint.method == "GET"
    assert endpoint.path == "/api/files/<path:filename>"


def test_resolve_endpoint_returns_none_for_a_line_with_no_enclosing_route():
    adapter = FlaskCrudAdapter(str(CRUD_APP_DIR))
    assert adapter.resolve_endpoint("app.py", 1) is None  # module docstring, not inside any route


def test_resolve_endpoint_returns_none_for_a_missing_file():
    adapter = FlaskCrudAdapter(str(CRUD_APP_DIR))
    assert adapter.resolve_endpoint("does_not_exist.py", 10) is None


def test_resolve_credential_returns_none_for_unrelated_pattern():
    adapter = FlaskCrudAdapter(str(CRUD_APP_DIR))
    assert adapter.resolve_credential({"pattern": "path_traversal"}) is None


def test_resolve_credential_returns_the_source_derived_admin_credential():
    adapter = FlaskCrudAdapter(str(CRUD_APP_DIR))
    credential = adapter.resolve_credential({"pattern": "hardcoded_demo_credentials"})
    assert credential is not None
    assert credential.identifier == "admin"
    assert credential.secret == "admin123"
