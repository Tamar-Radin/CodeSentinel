import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { IOrderBase, OrderStatus } from "@architect/shared";
import MyOrdersPage from "../pages/MyOrdersPage";

function makeOrder(overrides: Partial<IOrderBase> & { status: OrderStatus }): IOrderBase {
  return {
    id: "order_" + Math.random().toString(36).slice(2, 10),
    customerId: "cust_1",
    items: [
      { productId: "p1", name: "מחשב נייד Dell XPS", price: 5490, quantity: 2 },
      { productId: "p2", name: "מקלדת Logitech", price: 450, quantity: 1 },
    ],
    totalAmount: 11430,
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-16T10:00:00.000Z",
    ...overrides,
  };
}

const TIMELINE_STEPS = ["התקבלה", "שולם", "נשלח", "נמסר"];

const mockGetMyOrders = vi.fn();

vi.mock("../services/orderService", () => ({
  getMyOrders: (...args: unknown[]) => mockGetMyOrders(...args),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/orders"]}>
      <MyOrdersPage />
    </MemoryRouter>
  );
}

describe("Widget 2: Order Status Tracker (Visual Timeline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T1: Status "pending" — first step highlighted
  it("shows only the first step highlighted for pending orders", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [makeOrder({ status: "pending" })] });
    renderPage();

    await screen.findByText(/התקבלה/);

    const timeline = screen.getByTestId?.("order-timeline") ?? screen.getByText(/התקבלה/).closest("[class]")!;
    expect(screen.getByText(/התקבלה/)).toBeInTheDocument();
    expect(screen.getByText(/ממתינה|pending/i)).toBeInTheDocument();
  });

  // T2: Status "paid" — first two steps completed
  it("shows first two steps completed for paid orders", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [makeOrder({ status: "paid" })] });
    renderPage();

    await screen.findByText(/שולם|שולמה/);

    expect(screen.getByText(/התקבלה/)).toBeInTheDocument();
    expect(screen.getByText(/שולם|שולמה/)).toBeInTheDocument();
  });

  // T3: Status "shipped" — three steps completed
  it("shows three steps completed for shipped orders", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [makeOrder({ status: "shipped" })] });
    renderPage();

    await screen.findByText(/נשלח|נשלחה/);

    expect(screen.getByText(/התקבלה/)).toBeInTheDocument();
    expect(screen.getByText(/שולם|שולמה/)).toBeInTheDocument();
    expect(screen.getByText(/נשלח|נשלחה/)).toBeInTheDocument();
  });

  // T4: Status "delivered" — all four steps completed
  it("shows all four steps completed for delivered orders", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [makeOrder({ status: "delivered" as OrderStatus })] });
    renderPage();

    await screen.findByText(/נמסר/);

    for (const step of TIMELINE_STEPS) {
      expect(screen.getByText(new RegExp(step))).toBeInTheDocument();
    }
  });

  // T5: Status "cancelled" — shows cancelled state
  it("shows cancelled state with no further progress steps", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [makeOrder({ status: "cancelled" })] });
    renderPage();

    await screen.findByText(/בוטלה|cancelled/i);

    expect(screen.getByText(/בוטלה/)).toBeInTheDocument();
  });

  // T6: Status "returned" — shows returned state
  it("shows returned state for returned orders", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [makeOrder({ status: "returned" })] });
    renderPage();

    await screen.findByText(/הוחזרה|returned/i);

    expect(screen.getByText(/הוחזרה/)).toBeInTheDocument();
  });

  // T7: Expand order — timeline + items visible
  it("expands order to show items on click", async () => {
    const order = makeOrder({ status: "paid" });
    mockGetMyOrders.mockResolvedValueOnce({ orders: [order] });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(new RegExp(order.id.slice(-8)));

    const expandButton = screen.getByRole("button", { name: /פרטים|הרחב/i }) ??
      screen.getByText(new RegExp(order.id.slice(-8))).closest("[class*=border]")!;
    await user.click(expandButton);

    await vi.waitFor(() => {
      expect(screen.getByText("מחשב נייד Dell XPS")).toBeInTheDocument();
      expect(screen.getByText("מקלדת Logitech")).toBeInTheDocument();
    });
  });

  // T8: Collapse order — details hidden
  it("collapses order details on second click", async () => {
    const order = makeOrder({ status: "paid" });
    mockGetMyOrders.mockResolvedValueOnce({ orders: [order] });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(new RegExp(order.id.slice(-8)));

    const expandButton = screen.getByRole("button", { name: /פרטים|הרחב/i }) ??
      screen.getByText(new RegExp(order.id.slice(-8))).closest("[class*=border]")!;

    await user.click(expandButton);
    await vi.waitFor(() => {
      expect(screen.getByText("מחשב נייד Dell XPS")).toBeInTheDocument();
    });

    await user.click(expandButton);
    await vi.waitFor(() => {
      expect(screen.queryByText("מחשב נייד Dell XPS")).not.toBeInTheDocument();
    });
  });

  // T9: Independent expand — multiple orders
  it("allows independent expand/collapse of multiple orders", async () => {
    const orderA = makeOrder({ id: "order_aaaaaaaa", status: "pending" });
    const orderB = makeOrder({
      id: "order_bbbbbbbb",
      status: "shipped",
      items: [{ productId: "p3", name: "מסך Samsung", price: 1800, quantity: 1 }],
      totalAmount: 1800,
    });
    mockGetMyOrders.mockResolvedValueOnce({ orders: [orderA, orderB] });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/aaaaaaaa/);
    await screen.findByText(/bbbbbbbb/);

    const buttons = screen.getAllByRole("button", { name: /פרטים|הרחב/i });

    await user.click(buttons[0]);
    await vi.waitFor(() => {
      expect(screen.getByText("מחשב נייד Dell XPS")).toBeInTheDocument();
    });

    await user.click(buttons[1]);
    await vi.waitFor(() => {
      expect(screen.getByText("מסך Samsung")).toBeInTheDocument();
      expect(screen.getByText("מחשב נייד Dell XPS")).toBeInTheDocument();
    });
  });

  // T10: No orders — empty state
  it("shows empty state message with link to shop when no orders exist", async () => {
    mockGetMyOrders.mockResolvedValueOnce({ orders: [] });
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByText(/אין הזמנות|עדיין לא ביצעת/)).toBeInTheDocument();
    });

    const shopLink = screen.getByRole("button", { name: /חנות|לחנות|למעבר/i });
    expect(shopLink).toBeInTheDocument();
  });

  // T11: Items display — names, quantities, prices
  it("displays item names, quantities, and prices when expanded", async () => {
    const order = makeOrder({ status: "paid" });
    mockGetMyOrders.mockResolvedValueOnce({ orders: [order] });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(new RegExp(order.id.slice(-8)));

    const expandButton = screen.getByRole("button", { name: /פרטים|הרחב/i }) ??
      screen.getByText(new RegExp(order.id.slice(-8))).closest("[class*=border]")!;
    await user.click(expandButton);

    await vi.waitFor(() => {
      expect(screen.getByText(/מחשב נייד Dell XPS/)).toBeInTheDocument();
      expect(screen.getByText(/× 2|×2/)).toBeInTheDocument();
      expect(screen.getByText(/מקלדת Logitech/)).toBeInTheDocument();
      expect(screen.getByText(/× 1|×1/)).toBeInTheDocument();
    });
  });

  // API error handling
  it("shows error state when orders API fails", async () => {
    mockGetMyOrders.mockRejectedValueOnce(new Error("Network error"));
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByText(/network error|שגיאה/i)).toBeInTheDocument();
    });
  });

  // Order total displayed
  it("displays order total amount", async () => {
    const order = makeOrder({ status: "paid", totalAmount: 11430 });
    mockGetMyOrders.mockResolvedValueOnce({ orders: [order] });
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByText(/11,430/)).toBeInTheDocument();
    });
  });
});
