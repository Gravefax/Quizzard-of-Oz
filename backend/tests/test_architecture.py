"""Architecture tests for the FastAPI backend (issue #94).

These tests drive import-linter against the real ``.importlinter`` ruleset so
the layering contracts (routers > services > crud > models) are enforced both
locally and in CI. A deliberately injected violation is used to prove the
tooling actually fails when a layer boundary is crossed (negative verification).
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
IMPORTLINTER_CONFIG = BACKEND_DIR / ".importlinter"


def _lint_imports_executable() -> str:
    """Locate the import-linter CLI in the active interpreter's environment."""
    candidate = Path(sys.executable).with_name("lint-imports")
    if candidate.exists():
        return str(candidate)
    found = shutil.which("lint-imports")
    if found:
        return found
    pytest.skip("lint-imports executable not found in the current environment")


def _run_lint_imports() -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [_lint_imports_executable()],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        check=False,
    )


def test_importlinter_config_exists() -> None:
    assert IMPORTLINTER_CONFIG.is_file(), "backend/.importlinter is required for architecture tests"


def test_backend_architecture_rules_hold() -> None:
    """The production code must satisfy every architecture contract."""
    result = _run_lint_imports()
    assert result.returncode == 0, (
        "import-linter reported architecture violations:\n" + result.stdout + result.stderr
    )


def test_deliberate_violation_is_detected() -> None:
    """A router that reaches into the CRUD layer directly must break the build."""
    violation = BACKEND_DIR / "app" / "routers" / "_arch_violation.py"
    violation.write_text(
        "# Temporary fixture for the architecture negative test.\n"
        "# A router importing the CRUD layer directly violates the layering rule.\n"
        "from app.crud import user as crud_user  # noqa: F401\n"
    )
    try:
        result = _run_lint_imports()
        combined = (result.stdout + result.stderr).upper()
        assert result.returncode != 0, (
            "import-linter accepted a deliberate layer violation:\n" + result.stdout + result.stderr
        )
        assert "BROKEN" in combined, result.stdout + result.stderr
    finally:
        violation.unlink(missing_ok=True)
