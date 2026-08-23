# 🔐 Auth & Security – אפיון מימוש עתידי

> מסמך אפיון למשימת **אימות, הרשאות ואבטחת מידע** במערכת TechStore.
> תכנון זה הופרד בכוונה ממשימת חיבור ה-Full-Stack הבסיסית, מאחר שהוא דורש דיון נפרד בנושאי אבטחה ויש לו השלכות רוחב על כל ה-API.

---

## 📌 מצב נוכחי (נקודת הפתיחה)

לאחר משימת חיבור ה-Full-Stack שכבר בוצעה, אלו הנקודות הרלוונטיות ל-Auth:

### צד שרת
- ✅ קיים מודל [server/src/models/Customer.ts](server/src/models/Customer.ts) עם `email` (unique) ו-`password` (plain text!) — **לא** מתאים לשימוש כמשתמש מערכת.
- ✅ קיים Error Middleware מרכזי, `asyncHandler`, ו-Zod validation ([server/src/middleware/validate.ts](server/src/middleware/validate.ts)).
- ✅ CORS מוגבל ל-`CLIENT_URL` עם `credentials: true` ([server/src/server.ts](server/src/server.ts)).
- ❌ אין routes/controllers ל-Auth.
- ❌ אין hashing, אין JWT, אין rate-limiting.
- ❌ אין מידלוור אימות (`requireAuth`) על endpoints קיימים — `/api/dashboard/*` חשוף לחלוטין.

### צד לקוח
- ✅ [client/src/services/apiClient.ts](client/src/services/apiClient.ts) קיים עם `withCredentials: true` ו-response interceptor — **מוכן** להוספת request interceptor לטוקן.
- ✅ [client/src/services/authService.ts](client/src/services/authService.ts) קיים עם **MOCK_USER** קשיח (`admin@techstore.com` / `Admin1234`) → צריך החלפה בקריאה אמיתית.
- ✅ [client/src/pages/LoginPage.tsx](client/src/pages/LoginPage.tsx) מחובר ל-`authService.login` → ימשיך לעבוד אוטומטית כשנחליף את הלוגיקה.
- ❌ אין `<ProtectedRoute>` — אפשר להגיע ל-`/` בלי טוקן.
- ❌ אין logout אוטומטי על 401.

### Shared
- ✅ קיימים `LoginRequest`, `LoginResponse`, `IUser` ב-[shared/src/types/auth.ts](shared/src/types/auth.ts).
- ⚠️ `IUser.role: string` — יש להצר ל-Union type.
- ❌ חסרים `RegisterRequest`, `AuthErrorResponse`, `RefreshTokenResponse`.

---

## 🎯 מטרות המשימה

1. **אימות אמיתי** של משתמשים מול בסיס הנתונים.
2. **הגנת endpoints** רגישים מפני גישה לא מורשית.
3. **הרשאות מבוססות תפקיד** (RBAC) – `admin` / `manager` / `user`.
4. **אבטחת מידע** ברמת best-practice (OWASP Top 10).

---

## 🏗️ אפיון מפורט – שלבי המימוש

### שלב 1 – החלטות תכנוניות (לפני קוד)

יש להכריע ב-3 נושאים מרכזיים שמשפיעים על כל המימוש:

#### 1.1 מודל המשתמש
**הוחלט:** להרחיב את `Customer` הקיים (כך אישרת במשימה הקודמת).
- הוספת שדה `role: 'admin' | 'manager' | 'user'` עם default `'user'`.
- הצרת `password` עם `select: false` כדי שלא יחזור בברירת מחדל בשאילתות.
- הוספת מתודת instance `comparePassword(plain): Promise<boolean>` שמשתמשת ב-bcrypt.
- שמירת תאימות לאחור: לקוחות קיימים בלי `role` ייחשבו `'user'`.

> 💡 **שיקול לעתיד:** אם המערכת תגדל, רצוי לפצל ל-`User` (משתמש מערכת) ו-`Customer` (לקוח עסקי). כרגע מאוחד לפשטות.

#### 1.2 אסטרטגיית Token
**מומלץ:** JWT ב-`httpOnly cookie` (ולא ב-`localStorage`).

| היבט | localStorage | httpOnly cookie ✅ |
|---|---|---|
| חשיפה ל-XSS | חשוף | מוגן |
| CSRF | אין סיכון | יש (פתיר עם SameSite=Lax + CSRF token) |
| שליחה אוטומטית | ידנית | אוטומטית עם `withCredentials` |
| Mobile-friendly | קל | דורש cookie jar |

`apiClient.ts` כבר מוגדר עם `withCredentials: true`, ו-CORS בשרת תומך ב-`credentials` → התשתית מוכנה.

#### 1.3 Refresh Token – האם נדרש?
**מומלץ לשלב 1:** רק Access Token עם תוקף ארוך יחסית (24h) כדי לפשט. Refresh Token ייכנס אם המערכת תגיע ל-production אמיתי.

---

### שלב 2 – Shared Types

קובץ: [shared/src/types/auth.ts](shared/src/types/auth.ts)

```ts
export type UserRole = 'admin' | 'manager' | 'user';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;          // ⚠️ שינוי: היה string
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ➕ חדש
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: IUser;
  // ⚠️ אם בוחרים cookie-based: להסיר את `token` מהתגובה
  token?: string;
}

// ➕ חדש – פורמט שגיאת auth אחיד
export interface AuthErrorResponse {
  error: string;
  code?: 'INVALID_CREDENTIALS' | 'USER_EXISTS' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN';
}
```

> ⚠️ **הערה:** לאחר השינוי ב-`UserRole`, [client/src/services/userService.ts](client/src/services/userService.ts) (`getRoleLabel`) ימשיך לעבוד כי המפתחות בו זהים.

---

### שלב 3 – שרת: מודל ותלויות

#### 3.1 התקנות
```bash
cd server
npm i bcryptjs jsonwebtoken cookie-parser express-rate-limit helmet
npm i -D @types/bcryptjs @types/jsonwebtoken @types/cookie-parser
```

#### 3.2 הרחבת מודל [server/src/models/Customer.ts](server/src/models/Customer.ts)
```ts
import bcrypt from 'bcryptjs';
import type { UserRole } from '@architect/shared';

export interface ICustomer extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  address?: string;
  phone?: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const customerSchema = new Schema<ICustomer>({
  // ...שדות קיימים...
  password: {
    type: String,
    required: true,
    select: false,        // ⚠️ קריטי – לא מוחזר בשאילתה רגילה
    minlength: 8,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user',
    index: true,
  },
});

// hashing אוטומטי לפני שמירה
customerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

customerSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};
```

> ⚠️ **קריטי:** קריאות קיימות שעושות `Customer.findOne({ email })` ומצפות לקבל `password` חייבות לעבור ל-`.select('+password')`. עיון ב-[server/src/seed.ts](server/src/seed.ts) חובה.

#### 3.3 הצפנת סיסמאות בנתונים קיימים
סקריפט חד-פעמי שיריץ over-all customers, יבדוק אם הסיסמה לא bcrypt (לא מתחילה ב-`$2`), וירוץ דרך ה-pre-save. לחלופין: drop & re-seed.

---

### שלב 4 – שרת: Routes / Controllers / Middleware

#### 4.1 קבצים חדשים
```
server/src/
├── controllers/
│   └── Auth.ts              ← register, login, logout, me
├── routes/
│   └── authRoutes.ts        ← /api/auth/*
├── middleware/
│   ├── requireAuth.ts       ← בדיקת JWT + הזרקת req.user
│   └── requireRole.ts       ← RBAC, מקבל list של roles
├── services/
│   └── tokenService.ts      ← signToken, verifyToken
├── schemas/
│   └── auth.ts              ← Zod: loginSchema, registerSchema
└── types/
    └── express.d.ts         ← הרחבת Request עם req.user
```

#### 4.2 Endpoints
| Method | Path | Auth | תיאור |
|---|---|---|---|
| POST | `/api/auth/register` | פתוח | רישום משתמש חדש (role=`user` בלבד; admins נוצרים דרך seed) |
| POST | `/api/auth/login` | פתוח | התחברות + הגדרת cookie |
| POST | `/api/auth/logout` | פתוח | מחיקת cookie |
| GET | `/api/auth/me` | requireAuth | מחזיר את המשתמש הנוכחי (לרענון session בלקוח) |

#### 4.3 דוגמת `requireAuth`
```ts
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'נדרשת התחברות');

  try {
    const payload = verifyToken(token); // { sub, role }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, 'TOKEN_EXPIRED', 'הסשן פג תוקף');
  }
});
```

#### 4.4 דוגמת `requireRole`
```ts
export const requireRole = (...roles: UserRole[]) =>
  (req, res, next) => {
    if (!roles.includes(req.user!.role))
      throw new HttpError(403, 'FORBIDDEN', 'אין הרשאה');
    next();
  };
```

#### 4.5 הגנת endpoints קיימים
ב-[server/src/routes/dashboardRoutes.ts](server/src/routes/dashboardRoutes.ts):
```ts
router.use(requireAuth);                          // כל הראוטר דורש התחברות
router.get('/stats', dashboardController.getStats);
router.get('/sales-analytics',
  requireRole('admin', 'manager'),                // רק admin/manager
  validate(salesAnalyticsQuerySchema, 'query'),
  dashboardController.getSalesAnalytics
);
```

#### 4.6 [server/src/server.ts](server/src/server.ts) – תוספות
```ts
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'יותר מדי ניסיונות, נסה שוב בעוד 15 דקות' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

---

### שלב 5 – לקוח: שירותים ו-Routing

#### 5.1 עדכון [client/src/services/apiClient.ts](client/src/services/apiClient.ts)
הוספת response interceptor שמטפל ב-401:
```ts
apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      // logout שקט והפניה
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // ... המשך הנרמול הקיים
  }
);
```

> 💡 אם בוחרים cookie-based, **אין** צורך ב-request interceptor שמוסיף `Authorization` header.

#### 5.2 החלפת [client/src/services/authService.ts](client/src/services/authService.ts)
```ts
import { apiClient } from './apiClient';
import type { LoginRequest, LoginResponse, RegisterRequest, IUser } from '@architect/shared';

export const login = async (creds: LoginRequest): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', creds);
  return data;
};

export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const res = await apiClient.post<LoginResponse>('/auth/register', data);
  return res.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
  localStorage.removeItem('user');
};

export const fetchMe = async (): Promise<IUser> => {
  const { data } = await apiClient.get<{ user: IUser }>('/auth/me');
  return data.user;
};

// saveSession / getSession – נשארים, רק המשתמש (לא הטוקן) נשמר ב-localStorage לתצוגה
export const saveSession = (user: IUser): void =>
  localStorage.setItem('user', JSON.stringify(user));

export const getSession = (): IUser | null => {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
};
```

> ⚠️ **MOCK_USER ייעלם**. ב-[server/src/seed.ts](server/src/seed.ts) צריך ליצור admin אמיתי עם אותו אימייל/סיסמה (`admin@techstore.com` / `Admin1234`) כדי שלא נשבור את חוויית הפיתוח.

#### 5.3 רכיב חדש: `client/src/components/ProtectedRoute.tsx`
```tsx
const ProtectedRoute = ({ children, roles }: { children: ReactNode; roles?: UserRole[] }) => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden' | 'unauth'>('loading');
  const [user, setUser] = useState<IUser | null>(null);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        if (roles && !roles.includes(u.role)) setStatus('forbidden');
        else { setUser(u); setStatus('ok'); }
      })
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauth') return <Navigate to="/login" replace />;
  if (status === 'forbidden') return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

#### 5.4 [client/src/App.tsx](client/src/App.tsx) – שילוב
```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={
    <ProtectedRoute><HomePage /></ProtectedRoute>
  } />
  <Route path="/analytics" element={
    <ProtectedRoute roles={['admin', 'manager']}><AnalyticsPage /></ProtectedRoute>
  } />
</Routes>
```

---

### שלב 6 – Seed & DevX

עדכון [server/src/seed.ts](server/src/seed.ts):
- יצירת משתמש admin: `admin@techstore.com` / `Admin1234` עם `role: 'admin'`.
- יצירת משתמש manager לבדיקות RBAC.
- הסיסמה תעבור hash אוטומטית דרך `pre('save')` של המודל.

---

## 🛡️ Security Checklist (OWASP-aligned)

- [ ] **A01 – Broken Access Control:** כל endpoint שאינו `/auth/*` עוטף ב-`requireAuth`. RBAC על endpoints רגישים.
- [ ] **A02 – Cryptographic Failures:** bcrypt salt ≥ 12, JWT secret באורך ≥ 32 תווים מ-env, HTTPS-only ב-production.
- [ ] **A03 – Injection:** Zod validation על כל input, Mongoose schemas strict, אין `$where` או query operators מהלקוח.
- [ ] **A04 – Insecure Design:** הפרדת `authService` מ-`tokenService`, `select: false` על `password`.
- [ ] **A05 – Security Misconfiguration:** `helmet()`, CORS מוגבל, error messages ללא stack traces ב-production.
- [ ] **A07 – Auth Failures:** rate-limit על login/register, נעילת חשבון לאחר X כשלונות (אופציונלי לעתיד), הודעת שגיאה גנרית ("אימייל או סיסמה שגויים" ולא "סיסמה שגויה").
- [ ] **A08 – Software & Data Integrity:** תקופתית `npm audit`.
- [ ] **A09 – Logging:** לוג של כל ניסיון login נכשל (IP, email, timestamp).
- [ ] **CSRF:** SameSite=Lax על ה-cookie + CSRF token על mutations (אם cookie-based).
- [ ] **XSS:** React escape אוטומטי + CSP header דרך helmet.
- [ ] **HTTPS:** ב-production, cookie עם `secure: true`.
- [ ] **Secrets:** `JWT_SECRET`, `COOKIE_SECRET` ב-`.env` בלבד, לעולם לא ב-git.

---

## 📂 קבצים שייווצרו / יערכו / יימחקו

### חדשים (server)
- `server/src/controllers/Auth.ts`
- `server/src/routes/authRoutes.ts`
- `server/src/middleware/requireAuth.ts`
- `server/src/middleware/requireRole.ts`
- `server/src/services/tokenService.ts`
- `server/src/schemas/auth.ts`
- `server/src/types/express.d.ts`
- `server/src/utils/HttpError.ts` (אם לא קיים)

### חדשים (client)
- `client/src/components/ProtectedRoute.tsx`

### חדשים (shared)
- (הרחבה של `shared/src/types/auth.ts` – לא קובץ חדש)

### עריכות
- `server/src/models/Customer.ts` – `role`, `select:false`, hashing, `comparePassword`
- `server/src/server.ts` – helmet, cookieParser, rate-limit
- `server/src/routes/dashboardRoutes.ts` – `requireAuth` + `requireRole`
- `server/src/seed.ts` – יצירת admin/manager
- `server/src/middleware/errorHandler.ts` – טיפול ב-`HttpError`
- `client/src/services/apiClient.ts` – interceptor ל-401
- `client/src/services/authService.ts` – החלפת MOCK ב-API אמיתי
- `client/src/App.tsx` – `<ProtectedRoute>`
- `client/src/pages/HomePage.tsx` – שימוש ב-`fetchMe` במקום `getSession` בלבד
- `shared/src/types/auth.ts` – `UserRole`, `RegisterRequest`, `AuthErrorResponse`

### תוס```
# server/.env
JWT_SECRET=<32+ chars random>
JWT_EXPIRES_IN=24h
COOKIE_SECRET=<32+ chars random>
NODE_ENV=development
```

---

## ✅ Definition of Done

1. משתמש יכול להירשם, להתחבר, להתנתק.
2. ניסיון גישה ל-`/api/dashboard/*` ללא cookie מחזיר 401.
3. משתמש `user` שמנסה לגשת ל-`/api/dashboard/sales-analytics` מקבל 403.
4. רענון דף שומר על ה-session (דרך `fetchMe`).
5. סיסמאות במסד מאוחסנות bcrypt – אף אחת לא plain text.
6. שום endpoint לא מחזיר את שדה `password` ב-response.
7. 10 ניסיונות login כושלים ב-15 דקות → 429.
8. כל הקבצים compile ללא errors, אין `any` חדשים.

---

## 🧪 בדיקות מומלצות (לפני סגירת המשימה)

- ✅ Login עם credentials נכונים → 200 + cookie מוגדר.
- ✅ Login עם credentials שגויים → 401 + הודעה גנרית.
- ✅ Login 11 פעמים ברצף → 429.
- ✅ Register עם email קיים → 409.
- ✅ Register עם סיסמה < 8 תווים → 400 (Zod).
- ✅ GET `/api/auth/me` עם cookie תקין → 200 + פרטי משתמש (ללא password).
- ✅ GET `/api/dashboard/stats` ללא cookie → 401.
- ✅ DELETE cookie → ניסיון נוסף → 401.
- ✅ Refresh של דף בלקוח → נשאר מחובר.
- ✅ Logout → cookie נמחק → ניסיון לגשת ל-`/` → ניתוב ל-`/login`.

---

## 🔮 הרחבות עתידיות (Out of Scope למשימה זו)

- Refresh tokens עם rotation.
- אימות דו-שלבי (TOTP / Email OTP).
- OAuth (Google / GitHub).
- שחזור סיסמה עם email link.
- אודיט-לוג של פעולות מנהליות.
- נעילת חשבון אוטומטית לאחר ניסיונות כושלים.
- Session management UI (ראית sessions פעילים, ניתוק מרחוק).

---

## 📝 הערות חשובות לפיתוח עתידי

1. **אל תשנה את `LoginPage.tsx`** מעבר לעדכוני import – ה-UI מעולה כפי שהוא; רק שכבת השירות צריכה לעבור ל-API אמיתי.
2. **`apiClient.ts` כבר תומך ב-cookies** (`withCredentials: true`) – לא לשנות הגדרה זו.
3. **`MOCK_USER` ב-`authService` הוא הסימן** לכך שהמשימה הזו עוד לא בוצעה – אם רואים אותו, הקוד עוד במצב dev-only.
4. **לא לשמור JWT ב-localStorage** גם אם זה נראה פשוט יותר – הסיכון ל-XSS גבוה מדי.
5. **`role` בלקוח הוא לתצוגה בלבד** – הרשאות נאכפות **תמיד** בשרת. לעולם לא להסתמך על בדיקת role בלקוח כשכבת אבטחה.
6. **הצרת `IUser.role`** ל-Union תפיל את הקומפילציה במקומות שמשתמשים בו – זה רצוי, מאתר באגים עתידיים.
7. **`Customer` כמשתמש מערכת** הוא פשרה מודעת – אם המערכת תוסיף לקוחות עסקיים אמיתיים שאינם משתמשי backoffice, יש לפצל למודלים נפרדים.
