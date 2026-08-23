# Project Context & Rules

## Tech Stack
- **Language:** Python 3.12
- **Framework:** FastAPI
- **Database:** PostgreSQL (using SQLAlchemy + Alembic)
- **Package Manager:** Poetry / pip
- **Testing:** Pytest

## Architecture Rules
1. **Folder Structure:**
   - `app/routers`: All API endpoints.
   - `app/services`: Business logic (CRUD operations).
   - `app/schemas`: Pydantic models (Data validation).
   - `app/models`: Database models (SQLAlchemy).
2. **Async First:** Use `async def` for all route handlers and database queries.
3. **Type Hinting:** Strictly enforce Python type hints for arguments and return values.

## Style Guide (PEP 8)
- Use `snake_case` for variables and function names.
- Use `PascalCase` for Class names.
- Always use Docstrings (""") for complex functions.
- Keep dependencies in `pyproject.toml` or `requirements.txt`.