"""Adapter for test_targets/ai-generated-crud-app — the Phase 1 anchor target. A single-file
Flask/SQLite app with every route as a top-level `@app.route`-decorated function, which makes
route resolution a straightforward AST scan (no separate router/controller split to cross
reference, unlike the AI-demo target planned for a later phase)."""
from __future__ import annotations

import ast
import contextlib
import os
import sqlite3
import sys

from verification.adapters.base import Credential, EndpointRef, TargetAdapter
from verification.sandbox import kill_process, make_stripped_env, spawn_process, wait_for_port, free_port

# Multiple, independent, distinctive markers — `identify()` requires ALL of them, so a
# coincidental match on any single one (e.g. a project that happens to also hardcode
# "admin123" somewhere) can't misidentify it as this fixture.
_IDENTITY_DOCSTRING_MARKER = (
    "Intentionally vulnerable CRUD app — built quickly with AI pair-programming and"
)
_IDENTITY_ADMIN_PASSWORD_MARKER = 'ADMIN_PASSWORD = "admin123"'
_IDENTITY_REQUIRED_ROUTES = {
    "/api/register", "/api/login", "/api/users/<int:user_id>",
    "/api/calc", "/api/files/<path:filename>",
}


def _parse_routes(source: str) -> list[tuple[str, list[str], int, int]]:
    """Returns (path, methods, start_line, end_line) for every @app.route-decorated function,
    via the AST rather than regex — respects real Python syntax instead of guessing at it."""
    tree = ast.parse(source)
    routes: list[tuple[str, list[str], int, int]] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for dec in node.decorator_list:
            if not (
                isinstance(dec, ast.Call)
                and isinstance(dec.func, ast.Attribute)
                and dec.func.attr == "route"
            ):
                continue
            if not dec.args or not (
                isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str)
            ):
                continue
            path = dec.args[0].value
            methods = ["GET"]
            for kw in dec.keywords:
                if kw.arg == "methods" and isinstance(kw.value, ast.List):
                    values = [
                        elt.value for elt in kw.value.elts
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str)
                    ]
                    if values:
                        methods = values
            end = getattr(node, "end_lineno", node.lineno)
            routes.append((path, methods, node.lineno, end))
    return routes


class FlaskCrudAdapter(TargetAdapter):
    name = "flask_crud_adapter"

    def __init__(self, target_path: str):
        super().__init__(target_path)
        self._host = "127.0.0.1"
        self._port: int | None = None
        self._process = None

    @classmethod
    def identify(cls, target_path: str) -> bool:
        app_py = os.path.join(target_path, "app.py")
        if not os.path.isfile(app_py):
            return False
        with open(app_py, encoding="utf-8", errors="replace") as f:
            source = f.read()
        if _IDENTITY_DOCSTRING_MARKER not in source:
            return False
        if _IDENTITY_ADMIN_PASSWORD_MARKER not in source:
            return False
        try:
            routes = {path for path, _methods, _s, _e in _parse_routes(source)}
        except SyntaxError:
            return False
        return _IDENTITY_REQUIRED_ROUTES.issubset(routes)

    def start(self, sandbox_dir: str, startup_timeout_s: float) -> str:
        # Guarantee a fresh DB every run — never inherit a stray app.db that might exist in the
        # copied tree (e.g. from a prior manual run of the fixture outside this harness).
        with contextlib.suppress(FileNotFoundError):
            os.remove(os.path.join(sandbox_dir, "app.db"))

        self._port = free_port()
        env = make_stripped_env({
            "RV_HOST": self._host,
            "RV_PORT": str(self._port),
            "RV_DEBUG": "0",
        })
        self._process = spawn_process([sys.executable, "app.py"], cwd=sandbox_dir, env=env)
        if not wait_for_port(self._host, self._port, startup_timeout_s):
            kill_process(self._process)
            self._process = None
            raise TimeoutError(f"{self.name} did not become ready within {startup_timeout_s}s")
        return f"http://{self._host}:{self._port}"

    def stop(self) -> None:
        kill_process(self._process)
        self._process = None

    def resolve_endpoint(self, file: str, line: int) -> EndpointRef | None:
        source_path = self._resolve_source_path(file)
        if source_path is None:
            return None
        with open(source_path, encoding="utf-8", errors="replace") as f:
            source = f.read()
        try:
            routes = _parse_routes(source)
        except SyntaxError:
            return None
        for path, methods, start, end in routes:
            if start <= line <= end:
                return EndpointRef(method=methods[0], path=path)
        return None

    def resolve_credential(self, finding: dict) -> Credential | None:
        # Forward-compatibility only — hardcoded_demo_credentials isn't a Phase 1 recipe, but
        # per the approved design (source-derived, adapter-level, never parsed from `reasoning`)
        # this is where its per-target answer lives once that recipe is added.
        if finding.get("pattern") != "hardcoded_demo_credentials":
            return None
        return Credential(identifier="admin", secret="admin123", login_endpoint="/api/login")

    def served_directory(self, sandbox_dir: str) -> str:
        """Directory the path_traversal-vulnerable /api/files/<path:filename> endpoint serves
        from, for canary placement (see recipes.run_path_traversal)."""
        return os.path.join(sandbox_dir, "uploads")

    def db_path(self, sandbox_dir: str) -> str:
        return os.path.join(sandbox_dir, "app.db")

    def _resolve_source_path(self, file: str | None) -> str | None:
        if not file:
            return None
        for candidate in (os.path.join(self.target_path, file), file):
            if os.path.isfile(candidate):
                return candidate
        return None
