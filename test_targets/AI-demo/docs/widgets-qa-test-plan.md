# QA Test Plan: 2 High-Impact Client Widgets

> **Author:** Hawk (QA/QC) · **Date:** 2026-06-22
> **Spec Reference:** `docs/widgets-spec.md`
> **Status:** Acceptance criteria defined — ready for implementation

---

## Widget 1: Product Search & Filter Bar

### Inputs

| Input | Type | Source | Constraints |
|-------|------|--------|-------------|
| Search query | `string` | User text input | Min 2 chars to trigger, debounced 300ms |
| Category | `string` | Dropdown derived from product data | Dynamic from `Set(products.map(p => p.category))` |
| Price min | `number` | Number input | >= 0 |
| Price max | `number` | Number input | >= price min |
| In-stock only | `boolean` | Toggle | Default: false (show all) |
| Sort key | `string` | Dropdown | `price-asc`, `price-desc`, `name-asc`, `newest` |

### Outputs

| Output | Description |
|--------|-------------|
| Filtered product list | Products matching ALL active filter criteria (AND logic) |
| Result count | Text: "מציג X מתוך Y מוצרים" |
| Empty state | "לא נמצאו מוצרים התואמים לחיפוש" + clear button |

### Acceptance Test Cases

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| S1 | Text search filters by name | Type "מחשב" in search | Only products with "מחשב" in name/description/category visible | P0 |
| S2 | Category filter | Select "מחשבים ניידים" | Only that category's products shown | P0 |
| S3 | Price range filter | Set min=1000, max=3000 | Only products in ₪1000–₪3000 range | P0 |
| S4 | In-stock toggle | Enable "show only in-stock" | Products with stock=0 hidden | P0 |
| S5 | AND combination | Search "מחשב" + category + price range | All filters applied simultaneously | P0 |
| S6 | Empty results | Apply filters matching no products | Empty state message + "נקה סינון" button shown | P0 |
| S7 | Clear all filters | Click clear after filtering | Full product list restored, count reflects total | P0 |
| S8 | Sort by price ascending | Select "מחיר: נמוך לגבוה" | Products ordered by price ascending | P1 |
| S9 | Sort by price descending | Select "מחיר: גבוה לנמוך" | Products ordered by price descending | P1 |
| S10 | Debounce behavior | Type rapidly | Filtering only triggers after 300ms pause | P1 |
| S11 | Search min length | Type 1 character | No filtering triggered | P1 |
| S12 | Responsive mobile layout | Resize to < 640px | Filters stack vertically, search stays prominent | P2 |

### Error States

| # | Error State | Expected Behavior |
|---|-------------|-------------------|
| E1 | Products fail to load | Existing error handling in CustomerHomePage applies; filter bar disabled or hidden |
| E2 | Invalid price range (min > max) | No results shown or inputs flagged; no crash |

### Performance Thresholds

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Filter response time | < 50ms for ≤ 100 products | Client-side filtering should be instant |
| Debounce accuracy | 300ms ± 50ms | Prevents input thrashing without noticeable delay |
| No unnecessary re-renders | `useMemo` on filtered list | Unrelated state changes must not re-filter |

---

## Widget 2: Order Status Tracker (Visual Timeline)

### Inputs

| Input | Type | Source | Constraints |
|-------|------|--------|-------------|
| Order status | `OrderStatus` | From `IOrderBase.status` | One of: `pending`, `paid`, `shipped`, `cancelled`, `returned` |
| Order items | `IOrderItem[]` | From `IOrderBase.items` | Non-empty array |
| Order metadata | `id`, `createdAt`, `totalAmount` | From `IOrderBase` | Required fields |
| Expand/collapse click | User interaction | Click on order row | Independent per order |

### Outputs

| Output | Description |
|--------|-------------|
| Timeline visual | Step indicators: הזמנה התקבלה → שולם → נשלח → נמסר |
| Completed steps | Checkmark icon, green/blue color |
| Current step | Pulsing dot, blue |
| Pending steps | Empty circle, gray |
| Cancelled/returned | Distinct red X / gray state |
| Expanded detail | Order items list with quantities and prices |

### Acceptance Test Cases

| # | Scenario | Steps | Expected Result | Priority |
|---|----------|-------|-----------------|----------|
| T1 | Status "pending" | Render order with status=pending | First step highlighted (clock icon), rest greyed | P0 |
| T2 | Status "paid" | Render order with status=paid | First two steps completed with checkmarks | P0 |
| T3 | Status "shipped" | Render order with status=shipped | Three steps completed | P0 |
| T4 | Status "delivered" | Render order with status=delivered | All four steps completed | P0 |
| T5 | Status "cancelled" | Render order with status=cancelled | Red X shown, no further steps | P0 |
| T6 | Status "returned" | Render order with status=returned | Returned state shown after shipped | P0 |
| T7 | Expand order | Click on order row | Timeline + items visible, smooth transition | P0 |
| T8 | Collapse order | Click expanded order | Details hidden | P0 |
| T9 | Independent expand | Expand order A, then order B | Both independently expandable | P0 |
| T10 | No orders | Render with empty array | "אין הזמנות עדיין" + link to shop | P0 |
| T11 | Items display | Expand order with 2 items | Item names, quantities, prices shown | P1 |
| T12 | RTL layout | Inspect timeline flow direction | Timeline flows right-to-left | P2 |
| T13 | Responsive mobile | Resize to < 640px | Timeline steps shrink/stack gracefully | P2 |

### Error States

| # | Error State | Expected Behavior |
|---|-------------|-------------------|
| E1 | Orders API fails | Existing error handling in MyOrdersPage applies |
| E2 | Order with unknown status | Fallback to gray badge with raw status text; no crash |

### Performance Thresholds

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Expand/collapse animation | < 200ms | CSS transition, no layout thrashing |
| Conditional render of items | Items not in DOM when collapsed | Avoid rendering hidden content |
| No API calls from timeline | 0 | Timeline is pure/presentational |

---

## Test File Mapping

| Test File | Widget | Framework |
|-----------|--------|-----------|
| `client/src/__tests__/ProductSearchBar.test.tsx` | Widget 1 | Vitest + Testing Library |
| `client/src/__tests__/OrderTimeline.test.tsx` | Widget 2 | Vitest + Testing Library |

## Definition of Done

- [ ] All P0 test cases pass
- [ ] All P1 test cases pass
- [ ] P2 test cases verified manually (responsive/RTL)
- [ ] No console errors or warnings during test runs
- [ ] Test files run green in CI (`vitest run`)
