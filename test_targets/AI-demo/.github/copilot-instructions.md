# Project Context & Rules

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js (Express)
- **Database:** MongoDB (Mongoose)
- **Validation:** Zod
- **Documentation:** Swagger / OpenAPI

## 🏗️ Architecture Rules (General)
1. **Separation of Concerns:** Never write business logic inside UI components. Move logic to `/services` (frontend) or `/controllers` (backend).
2. **Types:** Always use TypeScript interfaces (or JSDoc in JS) for API responses.
3. **No Direct Access:** Client cannot access Database directly. All data must go through the API.

## 🎨 Frontend Rules
1. **Reusability:** If a component is used in more than 3 places, move it to the `/components` folder.
2. **Design System:** Prioritize existing UI components over creating new ones.
3. **Style:** Use functional components and Tailwind CSS for styling.

## 🛡️ Backend & Security Rules (Critical!)
1. **Input Validation:** NEVER trust client input. Validate ALL incoming data (body/params) using `Zod` schemas before processing.
2. **Security First:**
   - Never return passwords or PII (Private Identifiable Information) to the client.
   - Sanitize inputs to prevent MongoDB Injection.
3. **Error Handling:**
   - Use a central Error Handling Middleware.
   - Always use `try/catch` blocks in async controller functions.
4. **Database:**
   - Define strict Mongoose Schemas with types.
   - Use indexes for frequently searched fields.
5. **Documentation:**
   - Add JSDoc comments above every Controller function to support auto-generated Swagger documentation.

## Coding Style
- Use `async/await` syntax.
- Write comments in **Hebrew** for complex logic, but code in **English**.