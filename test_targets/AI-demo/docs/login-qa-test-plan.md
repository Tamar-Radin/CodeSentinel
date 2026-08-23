# Login Component — QA Test Plan & Acceptance Criteria

**Date:** 2026-06-09  
**Author:** Lint (QA/QC)  
**Scope:** Both login systems — TechStore (`AI course/architect/`) and Producers Directory (`producers-directory/`)  
**Based on:** `login-fix-plan.md` (Dev), `login-design-audit.md` (Design)

---

## Fix Verification Status

### TechStore (`AI course/architect/`)

| Bug ID | Severity | Verified | Evidence |
|--------|----------|----------|----------|
| BUG-1 | MEDIUM | PASS | `Button.tsx:7` — `type` prop added and forwarded at line 38 |
| BUG-2 | HIGH | PASS | `apiClient.ts:27-28` — uses `navigateRef.current` for SPA navigation; fallback to `window.location.href` only when navigateRef unavailable |
| BUG-3 | MEDIUM | PASS | `ProtectedRoute.tsx:22` — `useMemo(() => JSON.stringify(roles), [roles])` as effect dependency |
| BUG-4 | LOW | PASS | `LoginPage.tsx:29` — client-side email regex before API call |
| BUG-5 | LOW | OPEN | No registration link or "contact admin" message on login page |
| BUG-6 | LOW | PASS | `tokenService.ts:4-6` — throws `Error` in production without `JWT_SECRET` |

### Producers Directory (`producers-directory/`)

| Finding | Severity | Status | Detail |
|---------|----------|--------|--------|
| AUTH-PD-1: No server-side session/JWT — localStorage-only auth | CRITICAL | OPEN | `lib/auth.ts` stores only `producerId` in localStorage. No token, no cookie, no server-side session validation. Any user can set `producerId` in devtools and access protected routes. |
| AUTH-PD-2: API auth endpoint returns `producerId` in plain JSON | HIGH | OPEN | `app/api/auth/route.ts:23-25` — returns `{ producerId, name }` with no token. No mechanism to verify subsequent requests belong to this user. |
| AUTH-PD-3: No rate limiting on login endpoint | MEDIUM | OPEN | `app/api/auth/route.ts` — no rate limiter. Brute force attacks possible. |
| AUTH-PD-4: `loading` state not reset on success path | LOW | OPEN | `app/login/page.tsx:35` — after `router.push('/dashboard')`, `setLoading(false)` never runs. Button stays disabled during navigation, but if navigation is slow or blocked, user is stuck. |

---

## Test Cases

### TC-1: Happy Path — Valid Login (TechStore)

**Precondition:** Valid user exists (e.g., admin@techstore.com / password)  
**Steps:**
1. Navigate to `/login`
2. Enter valid email in email field
3. Enter valid password in password field
4. Click "כניסה" button

**Expected:**
- [x] Button shows "מתחבר..." with spinner during request
- [x] On success, `user` object saved to localStorage
- [x] Navigates to `/` (which redirects to `/dashboard` for admin/manager or `/shop` for others)
- [x] No full page reload occurs
- [x] No console errors

---

### TC-2: Happy Path — Valid Login (Producers Directory)

**Precondition:** Valid producer exists in database  
**Steps:**
1. Navigate to `/login`
2. Enter valid email
3. Enter valid password
4. Click "התחבר" button

**Expected:**
- [x] Button shows "מתחבר..." during request
- [x] `producerId` saved to localStorage
- [x] Navigates to `/dashboard`
- [ ] **AUTH-PD-4:** Verify `loading` state resets if navigation is delayed

---

### TC-3: Invalid Credentials — Wrong Password

**Steps:**
1. Enter valid email, wrong password
2. Submit form

**Expected:**
- [x] Error message "אימייל או סיסמה שגויים" displayed
- [x] No navigation occurs
- [x] Error message does NOT reveal whether email or password was wrong (both projects)
- [x] Button returns to enabled state

---

### TC-4: Invalid Email Format (Client-Side Validation)

**Steps:**
1. Enter "abc" in email field
2. Enter any password
3. Submit form

**Expected (TechStore):**
- [x] Error "כתובת אימייל לא תקינה" shown before API call
- [x] No network request made (verify in Network tab)

**Expected (Producers Directory):**
- [ ] **No client-side email validation exists** — form relies on HTML `type="email"` + `required`, but these don't fire with custom submit handler unless explicitly checked. The `required` attribute only works with native form validation, which is not suppressed here (no `noValidate`), so browser may block submit on empty fields but won't validate email format consistently across browsers.

---

### TC-5: Empty Fields Submission

**Steps:**
1. Leave both fields empty
2. Submit form

**Expected (TechStore):**
- [x] Error "נא למלא את כל השדות" shown before API call

**Expected (Producers Directory):**
- [x] Browser native validation blocks submission (HTML `required` attribute)

---

### TC-6: Network Error Handling

**Steps:**
1. Disconnect network / block API endpoint
2. Submit valid-looking credentials

**Expected:**
- [x] Error message "שגיאה בהתחברות" displayed (both projects)
- [x] No unhandled promise rejection in console
- [x] Loading state resets

---

### TC-7: 401 Interceptor — Session Expiry (TechStore Only)

**Precondition:** User is logged in on a protected page  
**Steps:**
1. Clear the auth cookie (or wait for token expiry)
2. Trigger an API call (e.g., navigate to a protected route)

**Expected:**
- [x] `localStorage.user` is removed
- [x] User is redirected to `/login` via React Router (no full page reload)
- [x] No white flash or app remount

---

### TC-8: ProtectedRoute — Role Enforcement (TechStore Only)

**Steps:**
1. Log in as a regular user (not admin/manager)
2. Navigate to `/dashboard`

**Expected:**
- [x] Redirected to `/` (which redirects to `/shop`)
- [x] No flicker of dashboard content

---

### TC-9: ProtectedRoute — No Redundant API Calls (TechStore Only)

**Steps:**
1. Log in as admin
2. Navigate to `/dashboard`
3. Open Network tab
4. Interact with the page without leaving the route

**Expected:**
- [x] Only ONE `/auth/me` call on initial load
- [x] No repeated `/auth/me` calls on parent re-renders

---

### TC-10: Button Type Prop (TechStore Only)

**Steps:**
1. Inspect the login submit button in DevTools

**Expected:**
- [x] `<button type="submit">` attribute present
- [x] Button component accepts and forwards `type` prop

---

### TC-11: JWT Secret Guard (TechStore Server)

**Steps:**
1. Start server with `NODE_ENV=production` and NO `JWT_SECRET` env var

**Expected:**
- [x] Server throws `Error: JWT_SECRET must be set in production`
- [x] Server does NOT start

---

### TC-12: Registration Link (Producers Directory)

**Steps:**
1. Navigate to `/login`

**Expected:**
- [x] "הירשמי כאן" link present, points to `/register`
- [x] "חזרה לעמוד הבית" link present, points to `/`

---

## Regression Checklist

After any login-related changes, verify:

- [ ] Login happy path works (both projects)
- [ ] Error messages display correctly for wrong credentials
- [ ] Network errors are handled gracefully
- [ ] Loading state appears and resolves
- [ ] No console errors or unhandled rejections
- [ ] localStorage is set on success, cleared on logout
- [ ] Protected routes redirect unauthenticated users
- [ ] Role-based access control enforced (TechStore)
- [ ] No full-page reloads during auth flow (TechStore)

---

## Existing Test Coverage Assessment

### TechStore (`AI course/architect/`)

| Area | Test File | Coverage |
|------|-----------|----------|
| LoginPage UI | **NONE** | No test file exists for LoginPage |
| authService | **NONE** | No test file exists |
| apiClient interceptor | **NONE** | No test file exists |
| ProtectedRoute | **NONE** | No test file exists |
| tokenService | **NONE** | No test file exists |
| FeedbackPage | `client/src/__tests__/FeedbackPage.test.tsx` | Exists |
| feedback API | `server/src/__tests__/feedback.test.ts` | Exists |

**Gap:** Zero test coverage for the entire authentication flow in TechStore.

### Producers Directory (`producers-directory/`)

| Area | Test File | Coverage |
|------|-----------|----------|
| LoginPage UI | `_test_/pages/LoginPage.test.tsx` | 6 test cases — good basic coverage |
| auth utility | `_test_/auth.test.ts` | 4 test cases — covers all exported functions |
| API auth route | **NONE** | No test file for the server-side handler |

**Gap:** No server-side API test. Client-side coverage is reasonable for the existing scope.

---

## CRITICAL/HIGH Issues Requiring Immediate Action

### CRITICAL: AUTH-PD-1 — Producers Directory Has No Real Authentication

**File:** `producers-directory/lib/auth.ts`, `producers-directory/app/api/auth/route.ts`  
**Risk:** The entire auth system relies on a `producerId` string stored in localStorage. There is no JWT, no session cookie, no server-side session validation. Any user can open DevTools, run `localStorage.setItem('producerId', 'any-valid-id')`, and gain full access to that producer's data.

**Recommendation:** Implement server-side session validation (JWT in httpOnly cookie or Next.js middleware-based auth). This is not a bug fix — it's a missing security layer.

### HIGH: AUTH-PD-2 — API Returns Identity Without Token

**File:** `producers-directory/app/api/auth/route.ts:23-25`  
**Risk:** After verifying credentials with bcrypt, the endpoint returns `{ producerId, name }` in plain JSON. No token is issued, no cookie is set. Subsequent API calls have no way to verify the caller's identity.

**Recommendation:** Issue an httpOnly cookie with a signed JWT (or use Next.js `next-auth` / `iron-session`).

---

## MEDIUM/LOW Issues — Warning Report Only

| ID | Severity | Project | Issue | Recommendation |
|----|----------|---------|-------|----------------|
| AUTH-PD-3 | MEDIUM | Producers Dir | No rate limiting on login endpoint | Add rate limiter middleware |
| AUTH-PD-4 | LOW | Producers Dir | `loading` not reset on success path | Add `finally` block to reset loading |
| BUG-5 | LOW | TechStore | No register link on login page | Product decision needed |
| DESIGN-1 | MEDIUM | TechStore | Both fields highlighted red on any error | Per-field validation state |
| DESIGN-2 | MEDIUM | TechStore | No focus management on error | Focus first invalid field or error alert |
| DESIGN-3 | LOW | TechStore | Footer text fails WCAG AA contrast | Change `text-gray-400` → `text-gray-500` |
| DESIGN-7 | LOW | TechStore | Loading state not announced to screen readers | Add `aria-busy` and live region |
