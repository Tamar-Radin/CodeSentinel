# Login Component — Design Audit & UI/UX Spec

**Date:** 2026-06-09
**Author:** Luna (Design)
**Scope:** `client/src/pages/LoginPage.tsx` + supporting UI components
**Based on:** Dev team fix plan (`docs/login-fix-plan.md`)

---

## Current State Summary

The Dev team has already resolved BUG-1 through BUG-4:
- **Button.tsx** now correctly forwards the `type` prop
- **apiClient.ts** uses `navigateRef` for SPA-friendly 401 redirects (no full-page reload)
- **ProtectedRoute.tsx** uses `useMemo` on roles to prevent redundant `/auth/me` calls
- **LoginPage.tsx** includes client-side email regex validation

The login form is functional. The remaining items are design-level issues that affect usability, accessibility, and visual polish.

---

## Design Findings

### DESIGN-1: Error state highlights both fields regardless of which is invalid (MEDIUM)

**File:** `LoginPage.tsx:82-88, 109-114`
**Issue:** When any error occurs (empty fields, bad email format, wrong credentials), both email and password inputs turn red via the shared `error` state. A user who enters a valid email but wrong password sees the email field marked as invalid too — confusing and creates unnecessary friction.

**Spec:**
- Track per-field validation state: `fieldErrors: { email?: string; password?: string }` alongside the general `error` for server responses
- Empty email → red border on email only; empty password → red border on password only
- Invalid email format → red border on email only
- Server "wrong credentials" → keep general error banner only, no field-level red (since the server intentionally doesn't reveal which field is wrong)

---

### DESIGN-2: No focus management on validation error (MEDIUM)

**File:** `LoginPage.tsx:24-32`
**Issue:** When the form shows a validation error, the user's focus stays wherever it was. Screen-reader users may not notice the error. Keyboard-only users have to tab around to find what went wrong.

**Spec:**
- On client-side validation failure, move focus to the first invalid field
- On server error, move focus to the error alert (`id="login-error"`) using a ref
- Add `role="alert"` and `aria-live="assertive"` to the error container so screen readers announce it immediately (the Alert component already has `role="alert"` — verify it works with dynamic rendering)

---

### DESIGN-3: Footer text fails WCAG AA contrast (LOW)

**File:** `LoginPage.tsx:157`
**Issue:** `text-gray-400` on `bg-gray-50` yields a contrast ratio of approximately 3.3:1. WCAG AA requires 4.5:1 for normal text (the footer is `text-xs`).

**Spec:**
- Change footer class from `text-gray-400` to `text-gray-500` (contrast ratio ~5.0:1, passes AA)

---

### DESIGN-4: No "Forgot Password" or help path (LOW)

**File:** `LoginPage.tsx` (between password field and submit button)
**Issue:** Users who forget their password have no recovery path from the login screen. This is a common UX dead-end in admin panels.

**Spec (requires product decision):**
- If self-service reset is supported → add a `<Link to="/forgot-password">` styled as inline text link (`text-sm text-blue-600 hover:underline`) between the password field and the submit button, aligned to the start (right in RTL)
- If admin-managed only → add helper text: "לאיפוס סיסמה, פנה למנהל המערכת" in `text-xs text-gray-500` below the password field
- Visual placement: immediately after the password `<div>`, before the error alert area

---

### DESIGN-5: No registration link — UX dead-end for new users (LOW)

**Ref:** BUG-5 from `login-fix-plan.md`
**Issue:** The server has a working `/auth/register` endpoint, but the login page offers no path to registration. New users arriving at `/login` cannot proceed.

**Spec (requires product decision):**
- If self-registration is allowed → add below the card, before the copyright footer:
  ```
  <p className="text-center text-sm text-gray-600 mt-4">
    עדיין אין לך חשבון?{' '}
    <Link to="/register" className="text-blue-600 hover:underline font-medium">הרשמה</Link>
  </p>
  ```
- If registration is admin-only → add inside the card, after the submit button:
  ```
  <p className="text-center text-xs text-gray-500 mt-3">
    לקבלת חשבון, פנה למנהל המערכת
  </p>
  ```

---

### DESIGN-6: Card padding too generous on small mobile screens (LOW)

**File:** `LoginPage.tsx:64`
**Issue:** `px-8 py-10` inside the card means 32px horizontal / 40px vertical padding. On a 320px-wide viewport (the declared `min-width` in `index.css`), usable content width drops to ~224px. The email input feels cramped.

**Spec:**
- Use responsive padding: `px-5 py-8 sm:px-8 sm:py-10`
- This gives 20px/32px on small screens and keeps the current 32px/40px on >=640px

---

### DESIGN-7: Loading state lacks accessible announcement (LOW)

**File:** `LoginPage.tsx:144-151`
**Issue:** When the form enters loading state, the button text changes to "מתחבר..." with a spinner. Sighted users see it, but screen readers aren't informed that submission is in progress.

**Spec:**
- Add `aria-busy="true"` to the `<form>` element when `isLoading` is true
- Add a visually-hidden live region: `<span className="sr-only" aria-live="polite">{isLoading ? 'מתבצע חיבור...' : ''}</span>`

---

## Summary

| ID | Severity | Category | Summary | Requires Product Decision |
|----|----------|----------|---------|---------------------------|
| DESIGN-1 | MEDIUM | Usability | Per-field error states instead of global red | No |
| DESIGN-2 | MEDIUM | A11y | Focus management on error | No |
| DESIGN-3 | LOW | A11y | Footer contrast ratio below WCAG AA | No |
| DESIGN-4 | LOW | UX | No password recovery path | Yes |
| DESIGN-5 | LOW | UX | No registration link | Yes |
| DESIGN-6 | LOW | Responsive | Card padding too tight on 320px screens | No |
| DESIGN-7 | LOW | A11y | Loading state not announced to assistive tech | No |

---

## Recommended Execution Order

1. **DESIGN-1** + **DESIGN-2** (MEDIUM) — Address together since both involve form validation UX. Biggest usability improvement.
2. **DESIGN-3** (LOW) — One-line CSS class change. Quick win for accessibility compliance.
3. **DESIGN-6** (LOW) — One-line responsive padding change.
4. **DESIGN-7** (LOW) — Small accessibility enhancement.
5. **DESIGN-4** + **DESIGN-5** (LOW) — Blocked on product decision about self-service registration/reset.

---

## Design Tokens Reference

The login page should continue using the existing theme system (`components/theme.ts`):
- Primary actions: `theme.colors.primary.solid` (blue-600)
- Error states: `theme.colors.error.alert` (red-50 bg, red-200 border)
- Text hierarchy: gray-900 (headings) → gray-700 (labels) → gray-500 (helper text)
- Focus rings: `ring-blue-500` (consistent across all interactive elements)
