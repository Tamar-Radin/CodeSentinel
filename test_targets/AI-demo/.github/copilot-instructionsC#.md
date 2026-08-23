# Project Context & Rules

## Tech Stack
- **Framework:** .NET 8 (Web API)
- **Language:** C#
- **Database:** SQL Server (using Entity Framework Core)
- **Architecture Pattern:** Clean Architecture (Separation of Concerns)

## Architecture Rules
1. **Layer Separation:**
   - `API`: Controllers and Entry point.
   - `Core`: Domain entities and Interfaces (No external dependencies!).
   - `Infrastructure`: Database context and external services implementation.
2. **Dependency Injection:** Always use Constructor Injection. Never use `new` for services.
3. **Async/Await:** All I/O operations (DB, File, Network) must be `async`.

## Style Guide
- Use `PascalCase` for public members and methods.
- Use `_camelCase` for private fields (e.g., `_logger`).
- Interface names must start with 'I' (e.g., `IUserService`).
- Never put logic in Controllers; delegate to Services (Mediator pattern preferred).