# Login Component — Bug Analysis & Fix Task Specification

**Date:** 2026-06-09  
**Author:** Clio (Planning)  
**Status:** Ready for Dev execution  

---

## Subtask Zero: Component Location (COMPLETED)

The login component and full authentication system are located in **`AI course/architect/`** — a full-stack React + Express.js + MongoDB project ("TechStore").

### File Inventory

| Layer | File | Purpose |
|-------|------|---------|
| Client | `client/src/pages/LoginPage.tsx` | Login form UI (email/password) |
| Client | `client/src/services/authService.ts` | Auth API calls + localStorage session |
| Client | `client/src/services/apiClient.ts` | Axios instance with 401 interceptor |
| Client | `client/src/components/ProtectedRoute.tsx` | Route guard with /auth/me validation |
| Client | `client/src/App.tsx` | Routing + RootRedirect logic |
| Client | `client/src/components/Button.tsx` | Shared Button (used in login form) |
| Client | `client/src/components/Alert.tsx` | Error alert display |
| Shared | `shared/src/types/auth.ts` | IUser, LoginRequest, LoginResponse types |
| Server | `server/src/controllers/Auth.ts` | register, login, logout, me handlers |
| Server | `server/src/routes/authRoutes.ts` | Route definitions + rate limiting |
| Server | `server/src/schemas/auth.ts` | Zod validation (login/register) |
| Server | `server/src/services/tokenService.ts` | JWT sign/verify + cookie options |
| Server | `server/src/middleware/requireAuth.ts` | JWT cookie extraction middleware |
| Server | `server/src/models/Customer.ts` | Mongoose model with bcrypt hashing |
| Server | `server/src/server.ts` | Express app setup, CORS, routes |

---

## Bug Analysis

### BUG-1: Button component does not forward `type` prop (MEDIUM)

**File:** `client/src/components/Button.tsx:14,36`  
**Impact:** The `<Button>` component's interface does not include a `type` prop, and the rendered `<button>` element has no explicit `type` attribute. In the login form, this works by accident — HTML spec defaults `<button>` inside a form to `type="submit"`. However:
- Any attempt to use `<Button type="button">` for non-submit actions is silently ignored.
- This is a latent defect that will surface the moment a second button is added to any form (e.g., "Forgot Password" or "Register" button).

**Fix spec:** Add `type?: 'button' | 'submit' | 'reset'` to `ButtonProps` and forward it to the native `<button>`. Default to `'button'` to prevent accidental form submission (explicit `type="submit"` on the login button).

---

### BUG-2: 401 interceptor uses full page reload instead of client-side navigation (HIGH)

**File:** `client/src/services/apiClient.ts:26`  
**Impact:** When a 401 is received outside the login page, the interceptor does `window.location.href = '/login'`. This causes a **full browser reload** — the entire React app unmounts, all in-memory state is lost, and the user sees a white flash before the login page renders. This is jarring UX, especially on slower connections.

**Fix spec:** Replace `window.location.href` with a mechanism that triggers React Router navigation. Options:
1. **(Recommended)** Export a `navigateRef` from a shared module, set it in `App.tsx` via `useNavigate()`, and call `navigateRef.current('/login')` in the interceptor.
2. Alternatively, use a custom event (`window.dispatchEvent(new Event('auth:expired'))`) and listen for it in App.tsx to trigger navigation.

---

### BUG-3: ProtectedRoute useEffect fires on every parent re-render (MEDIUM)

**File:** `client/src/components/ProtectedRoute.tsx:42`  
**Impact:** The `useEffect` depends on `[roles]`, but `roles` is an inline array prop (`roles={['admin', 'manager']}`), which creates a new reference on every render. Each parent re-render triggers a redundant `GET /auth/me` call. While BrowserRouter minimizes unnecessary re-renders, any context change that touches App will cascade into repeated API calls.

**Fix spec:** Either:
1. **(Recommended)** Memoize the roles check with `JSON.stringify(roles)` as the dependency key.
2. Or define the role arrays as constants outside the JSX (`const ADMIN_ROLES = ['admin', 'manager'] as const`).

---

### BUG-4: No client-side email format validation on login form (LOW)

**File:** `client/src/pages/LoginPage.tsx:24-27,62`  
**Impact:** The form uses `noValidate` (disabling browser validation) and only checks for empty fields. Users can submit malformed emails (e.g., "abc") which are sent to the server and rejected by Zod. The round-trip adds latency and wastes a rate-limit attempt.

**Fix spec:** Add a basic email regex check in `handleSubmit` before the API call:
```
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
  setError('כתובת אימייל לא תקינה');
  return;
}
```

---

### BUG-5: Login page has no navigation to registration (LOW)

**File:** `client/src/pages/LoginPage.tsx`  
**Impact:** The login page is a dead end for new users — there is no "Register" link or button. The server has a fully working `/auth/register` endpoint with Zod validation, but there's no client-side registration page or link. If this is intentional (admin-only registration), it should be documented. If not, it's a missing feature.

**Fix spec:** Clarify product requirement:
- If self-registration is allowed → add a `<Link to="/register">` below the login form and create a `RegisterPage.tsx`.
- If registration is admin-only → no code change, but add a note in the login UI: "לקבלת חשבון, פנה למנהל המערכת".

---

### BUG-6: Hardcoded JWT secret in development fallback (LOW — DevSecOps)

**File:** `server/src/services/tokenService.ts:4`  
**Impact:** `JWT_SECRET` falls back to `"dev-only-secret-change-me-32chars-min"`. In production, if `JWT_SECRET` env var is missing, the server silently starts with this weak secret. Tokens signed with it could be forged.

**Fix spec:** Throw an error on startup if `NODE_ENV === 'production'` and `JWT_SECRET` is not set:
```
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
```

---

## Summary Table

| ID | Severity | Component | Summary | Owner |
|----|----------|-----------|---------|-------|
| BUG-1 | MEDIUM | Button.tsx | Missing `type` prop forwarding | Dev |
| BUG-2 | HIGH | apiClient.ts | Full page reload on 401 redirect | Dev |
| BUG-3 | MEDIUM | ProtectedRoute.tsx | Unnecessary /auth/me re-fetches | Dev |
| BUG-4 | LOW | LoginPage.tsx | No client-side email validation | Dev |
| BUG-5 | LOW | LoginPage.tsx | No register link/page | Dev + Product |
| BUG-6 | LOW | tokenService.ts | Hardcoded JWT fallback in prod | DevSecOps |

---

## Recommended Execution Order

1. **BUG-2** (HIGH) — Fix 401 redirect to use React Router. Biggest UX impact.
2. **BUG-1** (MEDIUM) — Add `type` prop to Button component. Quick fix, prevents future issues.
3. **BUG-3** (MEDIUM) — Stabilize ProtectedRoute effect dependencies. Prevents unnecessary API load.
4. **BUG-4** (LOW) — Add client-side email validation. Small UX improvement.
5. **BUG-6** (LOW) — Add production JWT secret guard. Security hardening.
6. **BUG-5** (LOW) — Requires product decision before implementation.

---

## Acceptance Criteria

- [ ] Login form submits successfully with valid credentials and navigates to correct page by role
- [ ] Login form shows error for invalid credentials without full page reload
- [ ] Session expiry on a protected page navigates to /login without full page reload (BUG-2)
- [ ] Button component supports explicit `type` prop (BUG-1)
- [ ] Navigating between protected routes does not trigger redundant /auth/me calls (BUG-3)
- [ ] Submitting a malformed email shows client-side error without hitting server (BUG-4)
- [ ] Server refuses to start in production mode without JWT_SECRET (BUG-6)
