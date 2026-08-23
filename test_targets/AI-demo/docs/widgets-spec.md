# Widget Spec: 2 High-Impact Client-Facing Widgets — TechStore

> **Author:** Clio (Planning) · **Date:** 2026-06-22
> **Status:** Spec Ready — Pending team assignment

---

## Project Review Summary

### Current State

| Area | Status | Notes |
|------|--------|-------|
| Auth (Login/Register) | ✅ Done | JWT cookies, role-based access |
| Admin Dashboard | ✅ Done | Stats, quick actions |
| Product Catalog | ✅ Done | Grid view, search pending |
| Cart + Checkout | ✅ Done | Full order flow with stock management |
| My Orders | ✅ Done | Customer order history |
| Feedback Form | ✅ Done | Public contact form |
| Design System | ✅ Done | 15+ reusable components |
| AI Features | ✅ Done | Vision + description generation |

### Gap Analysis — Where Customer Experience Falls Short

1. **No product search/filter** — customers must scroll through all products to find what they need.
2. **No social proof** — no ratings, reviews, or popularity indicators to build trust.
3. **No order tracking visibility** — customers see status text but no timeline/progress visualization.
4. **No personalization** — returning customers see the same generic page as first-time visitors.
5. **No quick-access promotions** — no way to highlight deals, new arrivals, or featured products.

### Widget Selection Criteria

| Criterion | Weight |
|-----------|--------|
| Direct impact on conversion (visitor → buyer) | High |
| Uses existing infrastructure (no new DB models/APIs required for MVP) | High |
| Leverages existing design system components | Medium |
| Low implementation risk (can be built with current team in 1 sprint) | Medium |

---

## Widget 1: Product Search & Filter Bar

### Why This Widget?

**Impact:** Customers currently have no way to search or filter products. In an e-commerce app, search is the #1 conversion driver — users who search are 2-3x more likely to purchase. This widget directly addresses the biggest UX gap in the customer journey.

### Functional Requirements

#### Search
- Real-time text search across product `name`, `description`, and `category`
- Debounced input (300ms) to avoid excessive re-renders
- Minimum 2 characters to trigger search
- Clear button to reset search
- Result count displayed (e.g., "מציג 5 מתוך 24 מוצרים")

#### Filters
- **Category filter:** Dropdown/chip-based filter derived dynamically from existing product categories
- **Price range filter:** Min/Max number inputs, or predefined ranges (₪0-500, ₪500-2000, ₪2000+)
- **Stock filter:** Toggle to hide out-of-stock items (default: show all)
- **Sort by:** Price (low→high, high→low), Name (A-Z), Newest first

#### Behavior
- All filtering is **client-side** — no new API endpoints needed. The existing `GET /api/products` already returns the full list
- Filters combine with AND logic
- URL query params sync (optional enhancement) so filtered views are shareable
- Empty state: "לא נמצאו מוצרים התואמים לחיפוש" with a "נקה סינון" button

### UI Specification

```
┌─────────────────────────────────────────────────────┐
│  🔍 [    חיפוש מוצרים...        ] [✕]              │
│                                                      │
│  קטגוריה: [הכל ▾]  מחיר: [₪ מ-] [₪ עד]  מלאי: [✓] │
│  מיון: [מחיר: נמוך לגבוה ▾]                         │
│                                                      │
│  מציג 5 מתוך 24 מוצרים                               │
└─────────────────────────────────────────────────────┘
```

| Element | Component | Props/Variant |
|---------|-----------|---------------|
| Search input | `Input` | `icon={Search}`, `placeholder="חיפוש מוצרים..."` |
| Category filter | `Select` | options from `Set(products.map(p => p.category))` |
| Price inputs | `Input` | `type="number"`, `placeholder="₪ מ-"` / `"₪ עד"` |
| Stock toggle | `Toggle` | `label="הצג רק במלאי"` |
| Sort dropdown | `Select` | predefined sort options |
| Result count | plain text | `text-sm text-gray-500` |
| Clear button | `Button` | `variant="ghost"`, `size="sm"` |

### Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Type "מחשב" in search | Only products with "מחשב" in name/description/category show |
| 2 | Select category "מחשבים ניידים" | Only products in that category show |
| 3 | Set price range ₪1000-₪3000 | Only products within range show |
| 4 | Enable "show only in-stock" | Products with stock=0 are hidden |
| 5 | Combine search + category + price | Filters apply with AND logic |
| 6 | No results match | Empty state message with clear button |
| 7 | Clear all filters | Full product list restores |
| 8 | Sort by price low→high | Products reorder correctly |
| 9 | Responsive on mobile | Filters stack vertically, search remains prominent |

### File Ownership

| File | Owner | Change |
|------|-------|--------|
| `client/src/components/ProductSearchBar.tsx` | Client | **New** — search + filter widget component |
| `client/src/hooks/useProductFilter.ts` | Client | **New** — filter/search/sort logic hook |
| `client/src/pages/CustomerHomePage.tsx` | Client | **Modify** — integrate `ProductSearchBar` above product grid |
| `shared/src/types/product.ts` | Shared | No changes needed — existing `IProductBase` has all required fields |

### Performance Notes
- All filtering runs client-side against the already-fetched product list
- `useMemo` for filtered results to avoid recomputation on unrelated re-renders
- Debounce search input to prevent render thrashing

---

## Widget 2: Order Status Tracker (Visual Timeline)

### Why This Widget?

**Impact:** Post-purchase experience directly affects repeat purchases and customer trust. Currently, the My Orders page shows order status as plain text (`Badge` with status word). A visual timeline widget transforms a static status into an engaging, informative experience that:
- Reduces "where is my order?" support contacts (fewer feedback submissions for order inquiries)
- Increases customer confidence and trust
- Encourages repeat purchases by making the post-purchase experience delightful

### Functional Requirements

#### Timeline Display
- Visual step-by-step progress indicator showing order lifecycle
- Steps: **הזמנה התקבלה** → **שולם** → **נשלח** → **נמסר**
- Current step highlighted, completed steps marked with checkmark
- Cancelled/returned orders show distinct state with appropriate color

#### Per-Order Detail Expansion
- Click/tap on an order row to expand and show the timeline
- Show order items summary below the timeline
- Show order date and total amount

#### Status Colors (from existing theme)
| Status | Color | Icon |
|--------|-------|------|
| pending | `warning` (yellow) | Clock |
| paid | `primary` (blue) | CreditCard |
| shipped | `primary` (blue) | Truck |
| delivered | `success` (green) | CheckCircle |
| cancelled | `error` (red) | XCircle |
| returned | `gray` | RotateCcw |

### UI Specification

```
┌─────────────────────────────────────────────────────┐
│  הזמנה #1234 · 15/06/2026 · ₪5,490        [▼ פרטים]│
│                                                      │
│  ●────────●────────●────────○                        │
│  התקבלה    שולם     נשלח     נמסר                    │
│  ✓ 15/06   ✓ 15/06  ✓ 16/06                         │
│                                                      │
│  ┌─ פריטים ──────────────────────────────┐           │
│  │ מחשב נייד Dell XPS    ×2    ₪10,980  │           │
│  │ מקלדת Logitech        ×1    ₪450     │           │
│  └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────┘

Cancelled order:
┌─────────────────────────────────────────────────────┐
│  הזמנה #1235 · 14/06/2026 · ₪3,200        [▼ פרטים]│
│                                                      │
│  ●────────✕                                          │
│  התקבלה    בוטלה                                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

| Element | Component | Props/Variant |
|---------|-----------|---------------|
| Order card | `Card` | collapsible with expand/collapse |
| Status steps | **New**: `OrderTimeline` | Custom component using existing theme colors |
| Step icon (done) | `CheckCircle` (lucide) | `text-green-600` |
| Step icon (current) | Pulsing dot | `bg-blue-500 animate-pulse` |
| Step icon (pending) | Empty circle | `border-gray-300` |
| Cancelled badge | `Badge` | `variant="error"` |
| Item rows | Table-like div | Consistent with `CheckoutPage` item display |
| Expand/collapse | `ChevronDown` (lucide) | rotates on expand |

### Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Order status "pending" | First step highlighted, rest greyed out |
| 2 | Order status "paid" | First two steps completed with checkmarks |
| 3 | Order status "shipped" | Three steps completed |
| 4 | Order status "cancelled" | Shows cancelled state with red X, no further steps |
| 5 | Order status "returned" | Shows returned state after shipped |
| 6 | Click order row | Timeline and items expand/collapse smoothly |
| 7 | Multiple orders | Each order has independent expand state |
| 8 | No orders | Shows "אין הזמנות עדיין" with link to shop |
| 9 | Mobile responsive | Timeline steps stack or shrink gracefully |
| 10 | RTL layout | Timeline flows right-to-left |

### File Ownership

| File | Owner | Change |
|------|-------|--------|
| `client/src/components/OrderTimeline.tsx` | Client/Design | **New** — timeline progress component |
| `client/src/pages/MyOrdersPage.tsx` | Client | **Modify** — replace simple table with expandable cards + timeline |
| `shared/src/types/order.ts` | Shared | No changes — existing `IOrderBase` + `OrderStatus` cover all needs |
| Server | — | **No changes** — `GET /api/orders/me` already returns all required data |

### Performance Notes
- Timeline component is pure/presentational — no API calls
- Expand/collapse uses CSS transitions, no layout thrashing
- Order items only render when expanded (conditional render, not CSS hide)

---

## Implementation Priority & Dependencies

```
Week 1:
├── Widget 1: Product Search & Filter Bar
│   ├── Day 1-2: useProductFilter hook + ProductSearchBar component
│   ├── Day 3: Integrate into CustomerHomePage
│   └── Day 4: QA + responsive testing
│
└── Widget 2: Order Status Tracker
    ├── Day 1-2: OrderTimeline component + design tokens
    ├── Day 3: Refactor MyOrdersPage with expandable cards
    └── Day 4: QA + responsive testing
```

### No Dependencies Between Widgets
Both widgets are completely independent — they can be developed in parallel by different team members with zero file conflicts.

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Product list too large for client-side filtering | Low (MVP scope) | Can add server-side search later via `GET /products?q=` |
| Timeline component complexity | Low | Only 5 fixed states, pure presentational logic |
| Mobile layout issues with filter bar | Medium | Design filter as collapsible panel on mobile |

---

## Team Assignment Recommendation

| Widget | Recommended Owners |
|--------|-------------------|
| Widget 1: Search & Filter | **Client dev** (component + hook) + **Design** (responsive layout review) |
| Widget 2: Order Timeline | **Client dev** (component + page refactor) + **Design** (timeline visual spec) |
| QA for both | **QA** (acceptance criteria testing) |
| Spec review | **Planning** (this doc) |

---

## Summary

These two widgets target the two most critical customer journey moments:

1. **Search & Filter** → helps customers **find** what they want (pre-purchase conversion)
2. **Order Timeline** → gives customers **confidence** after purchase (post-purchase retention)

Both leverage existing APIs, data models, and design system components — zero backend changes required. Maximum client impact with minimum implementation risk.
