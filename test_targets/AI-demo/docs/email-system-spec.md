# Email System — Investigation Report & Implementation Spec

**Date:** 2026-06-09
**Author:** Clio (Planning)
**Status:** Investigation Complete — Ready for Development

---

## 1. Investigation Summary

### Question: Does the system currently send emails?

**Answer: No.** The system collects and stores email addresses but has **zero email-sending capability**.

### Current State Audit

| Capability | Status | Details |
|---|---|---|
| Email collection (forms) | **Exists** | Login, Register, Feedback forms collect email |
| Email validation (Zod) | **Exists** | `server/src/schemas/auth.ts`, `server/src/schemas/feedback.ts` |
| Email storage (MongoDB) | **Exists** | `Customer.email` field with unique index |
| Email sending library | **Missing** | No nodemailer, sendgrid, resend, or any mail lib in `package.json` |
| SMTP/provider config | **Missing** | No EMAIL_* or SMTP_* vars in `.env` or `.env.example` |
| Email service module | **Missing** | No email service in `server/src/services/` |
| Email templates | **Missing** | No template files anywhere in the project |
| Email API endpoint | **Missing** | No send-email route |
| Email sending logic | **Missing** | Feedback controller stores to in-memory array, does not send |

### Files Examined

- `server/src/controllers/Feedback.ts` — stores feedback in `feedbackStore[]` (in-memory array, not persisted to DB, no email sent)
- `server/src/controllers/Auth.ts` — register/login use email for auth only, no welcome email
- `server/src/models/Customer.ts` — email field stored, not used for outbound mail
- `server/src/services/` — contains AI and token services, no email service
- `server/.env.example` — no email configuration variables
- `server/package.json` — no email dependencies

---

## 2. Email Use Cases (Priority Order)

Based on the existing codebase (e-commerce / tech store), these are the email flows to implement:

| # | Use Case | Trigger | Priority | Complexity |
|---|---|---|---|---|
| 1 | Feedback confirmation | User submits feedback form | **P0** | Low |
| 2 | Admin notification on feedback | New feedback received | **P0** | Low |
| 3 | Welcome email on registration | User registers | **P1** | Low |
| 4 | Password reset (future) | User requests reset | **P2** | Medium |

**Recommendation:** Start with P0 (feedback emails) since the feedback form already exists and this directly answers the CEO request.

---

## 3. Technology Recommendation

### Option A: Nodemailer (Recommended)

| Aspect | Detail |
|---|---|
| Library | `nodemailer` (most popular, 5M+ weekly downloads) |
| Why | Zero vendor lock-in, works with any SMTP provider, simple API, good TypeScript support |
| Fits project | Matches existing pattern — lightweight, no external SaaS dependency beyond SMTP |
| Dev complexity | Low — single service file, ~50 lines |

### Option B: Resend

| Aspect | Detail |
|---|---|
| Library | `resend` |
| Why | Modern API, good DX, built-in templates |
| Tradeoff | Vendor dependency, requires paid plan for production volume |

### Option C: SendGrid

| Aspect | Detail |
|---|---|
| Library | `@sendgrid/mail` |
| Why | Industry standard, generous free tier (100/day) |
| Tradeoff | Heavier SDK, more complex setup |

**Decision: Nodemailer** — aligns with the project's lightweight architecture (Express + MongoDB + minimal deps). Works with Gmail SMTP for development, any provider for production.

---

## 4. Implementation Specification

### 4.1 New Files to Create

```
server/src/services/emailService.ts    — Email transport & send functions
server/src/templates/                  — Email template directory
server/src/templates/feedbackConfirmation.ts  — Feedback confirmation template
server/src/templates/feedbackNotifyAdmin.ts   — Admin notification template
server/src/templates/welcome.ts               — Welcome email template (P1)
```

### 4.2 Files to Modify

| File | Change |
|---|---|
| `server/package.json` | Add `nodemailer` dependency, `@types/nodemailer` devDep |
| `server/.env.example` | Add `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `ADMIN_EMAIL` |
| `server/.env` | Add same vars with actual values |
| `server/src/controllers/Feedback.ts` | After storing feedback, call `emailService.sendFeedbackConfirmation()` and `emailService.notifyAdminNewFeedback()` |
| `server/src/controllers/Auth.ts` | After successful register, call `emailService.sendWelcomeEmail()` (P1) |

### 4.3 Environment Variables Spec

```env
# Email Service
EMAIL_HOST=smtp.gmail.com          # SMTP host (Gmail for dev, production SMTP for prod)
EMAIL_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USER=                        # SMTP username / email address
EMAIL_PASS=                        # SMTP password / app-specific password
EMAIL_FROM="TechStore <noreply@techstore.com>"  # Default sender
ADMIN_EMAIL=                       # Admin notification recipient
```

### 4.4 emailService.ts — Interface Spec

```typescript
// Exported functions:
sendFeedbackConfirmation(to: string, name: string, message: string): Promise<void>
notifyAdminNewFeedback(feedback: Feedback): Promise<void>
sendWelcomeEmail(to: string, name: string): Promise<void>  // P1

// Internal:
createTransporter(): nodemailer.Transporter  // Singleton, lazy-init
sendMail(options: SendMailOptions): Promise<void>  // Wrapper with error logging
```

### 4.5 Feedback Controller — Modified Flow

```
Current:  POST /api/feedback → validate → store in memory → respond 201
Proposed: POST /api/feedback → validate → store in memory → respond 201
                                                           → async: sendFeedbackConfirmation(email)
                                                           → async: notifyAdminNewFeedback(feedback)
```

**Key design decision:** Email sending must be **fire-and-forget** (non-blocking). The API response should not wait for email delivery. If email fails, log the error but don't fail the request.

### 4.6 Security Requirements

| Requirement | Implementation |
|---|---|
| No hardcoded credentials | All SMTP creds via env vars only |
| Credentials not in git | `.env` already in `.gitignore` (verified) |
| TLS enforcement | Use port 587 with STARTTLS (nodemailer default) |
| Input sanitization | Email body must escape user input (prevent HTML injection) |
| Rate limiting | Feedback route already has no rate limit — **add `express-rate-limit` to `/api/feedback`** to prevent email spam |
| No credential logging | Ensure error handler does not log SMTP password in stack traces |

### 4.7 Testing Strategy

| Test Type | What to Test |
|---|---|
| Unit | `emailService` with mocked transport — verify `sendMail` called with correct params |
| Integration | Feedback endpoint returns 201 even when email transport fails (fire-and-forget) |
| Manual | Use Ethereal (nodemailer test account) in dev to verify email content without real SMTP |

### 4.8 Acceptance Criteria

- [ ] `npm install` adds nodemailer without breaking existing deps
- [ ] `.env.example` documents all required email vars
- [ ] Submitting feedback form triggers confirmation email to the user
- [ ] Submitting feedback form triggers notification email to admin
- [ ] API responds 201 even if email delivery fails
- [ ] No SMTP credentials appear in logs or error responses
- [ ] Email content renders correctly (Hebrew RTL support)
- [ ] Rate limit on feedback endpoint prevents email spam (max 5 per minute per IP)

---

## 5. Development Task Breakdown

| Task | Owner | Estimate | Dependencies |
|---|---|---|---|
| T1: Install nodemailer + types | Dev | 5 min | None |
| T2: Add env vars to `.env.example` | Dev | 5 min | None |
| T3: Create `emailService.ts` with transport + sendMail wrapper | Dev | 30 min | T1 |
| T4: Create email templates (feedback confirm + admin notify) | Dev | 20 min | T3 |
| T5: Wire email calls into Feedback controller | Dev | 15 min | T3, T4 |
| T6: Add rate limiting to feedback route | Dev | 10 min | None |
| T7: Create welcome email template + wire into Auth controller | Dev | 20 min | T3 (P1) |
| T8: Unit tests for emailService | QA/Dev | 20 min | T3 |
| T9: Integration test — feedback + email fire-and-forget | QA | 15 min | T5 |
| T10: Security audit — credential handling, TLS, no-log | DevSecOps | 15 min | T3, T5 |

**Total estimate: ~2.5 hours** for P0 (feedback emails) + P1 (welcome email)

---

## 6. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| No SMTP credentials configured in prod | Emails silently fail | Startup health-check logs warning if EMAIL_HOST is empty |
| Gmail blocks app password in CI | Tests fail | Use nodemailer's Ethereal for test environments |
| Feedback store is in-memory (not DB) | Feedback lost on restart | Out of scope but flagged — recommend persisting to MongoDB |
| Email delivery delays | User thinks feedback wasn't received | Show UI confirmation message (already exists: "הפנייה נשלחה בהצלחה") |
| Hebrew RTL rendering | Emails look broken in some clients | Use `dir="rtl"` attribute in HTML templates, test in multiple clients |

---

## 7. Immediate Next Steps

1. **Dev team (Kai/Aria):** Pick up T1-T6 as a single PR
2. **DevSecOps (Sion):** Verify `.env` is gitignored, prepare SMTP credentials for staging
3. **QA (Hawk/Vera):** Prepare Ethereal test accounts, review acceptance criteria
4. **Ops (Atlas):** Add email delivery metrics to monitoring plan

This spec is ready for development handoff.
