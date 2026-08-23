import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { IProductBase } from "@architect/shared";
import CustomerHomePage from "../pages/CustomerHomePage";

const MOCK_PRODUCTS: IProductBase[] = [
  {
    id: "p1",
    name: "מחשב נייד Dell XPS",
    description: "מחשב נייד קל ועוצמתי",
    price: 5490,
    category: "מחשבים ניידים",
    stock: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p2",
    name: "מקלדת Logitech MX",
    description: "מקלדת אלחוטית מכנית",
    price: 450,
    category: "אביזרים",
    stock: 25,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "p3",
    name: "מחשב נייח HP Elite",
    description: "מחשב שולחני לעבודה",
    price: 3200,
    category: "מחשבים נייחים",
    stock: 0,
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "p4",
    name: "מסך Samsung 27",
    description: "מסך 4K למשרד",
    price: 1800,
    category: "מסכים",
    stock: 5,
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "p5",
    name: "עכבר Logitech",
    description: "עכבר ארגונומי",
    price: 250,
    category: "אביזרים",
    stock: 30,
    createdAt: "2026-05-01T00:00:00.000Z",
  },
];

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { products: MOCK_PRODUCTS } }),
  },
}));

vi.mock("../services/authService", () => ({
  getSession: () => ({ name: "Test User", email: "test@test.com", role: "customer" }),
  logout: vi.fn(),
}));

vi.mock("../context/CartContext", () => ({
  useCart: () => ({ addToCart: vi.fn(), count: 0, items: [], removeFromCart: vi.fn(), clearCart: vi.fn() }),
  CartProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/shop"]}>
      <CustomerHomePage />
    </MemoryRouter>
  );
}

function getProductCards() {
  return screen.getAllByText(/₪[\d,]+/).map((el) => el.closest("[class*=border]")!);
}

function getVisibleProductNames(): string[] {
  const cards = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent || "");
  return cards;
}

describe("Widget 1: Product Search & Filter Bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // S1: Text search filters by name
  it("filters products when typing search query matching name", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const searchInput = screen.getByPlaceholderText(/חיפוש מוצרים/i);
    await user.type(searchInput, "מחשב");

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names).toContain("מחשב נייד Dell XPS");
      expect(names).toContain("מחשב נייח HP Elite");
      expect(names).not.toContain("מקלדת Logitech MX");
      expect(names).not.toContain("עכבר Logitech");
    });
  });

  // S2: Category filter
  it("filters products by selected category", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const categorySelect = screen.getByLabelText(/קטגוריה/i);
    await user.selectOptions(categorySelect, "אביזרים");

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names).toContain("מקלדת Logitech MX");
      expect(names).toContain("עכבר Logitech");
      expect(names).not.toContain("מחשב נייד Dell XPS");
    });
  });

  // S3: Price range filter
  it("filters products by price range", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const minInput = screen.getByPlaceholderText(/₪ מ-/);
    const maxInput = screen.getByPlaceholderText(/₪ עד/);

    await user.type(minInput, "1000");
    await user.type(maxInput, "3000");

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names).toContain("מסך Samsung 27");
      expect(names).not.toContain("מקלדת Logitech MX");
      expect(names).not.toContain("מחשב נייד Dell XPS");
    });
  });

  // S4: In-stock toggle
  it("hides out-of-stock products when toggle is enabled", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    expect(screen.getByText("מחשב נייח HP Elite")).toBeInTheDocument();

    const stockToggle = screen.getByLabelText(/במלאי/i);
    await user.click(stockToggle);

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names).not.toContain("מחשב נייח HP Elite");
      expect(names).toContain("מחשב נייד Dell XPS");
    });
  });

  // S5: AND combination of filters
  it("applies all filters with AND logic simultaneously", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const searchInput = screen.getByPlaceholderText(/חיפוש מוצרים/i);
    await user.type(searchInput, "Logitech");

    const stockToggle = screen.getByLabelText(/במלאי/i);
    await user.click(stockToggle);

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names).toContain("מקלדת Logitech MX");
      expect(names).toContain("עכבר Logitech");
      expect(names).not.toContain("מחשב נייד Dell XPS");
    });
  });

  // S6: Empty results state
  it("shows empty state when no products match filters", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const searchInput = screen.getByPlaceholderText(/חיפוש מוצרים/i);
    await user.type(searchInput, "מוצר שלא קיים בכלל");

    await vi.waitFor(() => {
      expect(screen.getByText(/לא נמצאו מוצרים/)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole("button", { name: /נקה/i });
    expect(clearButton).toBeInTheDocument();
  });

  // S7: Clear all filters
  it("restores full product list when clearing filters", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const searchInput = screen.getByPlaceholderText(/חיפוש מוצרים/i);
    await user.type(searchInput, "מוצר שלא קיים");

    await vi.waitFor(() => {
      expect(screen.getByText(/לא נמצאו מוצרים/)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole("button", { name: /נקה/i });
    await user.click(clearButton);

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names.length).toBe(MOCK_PRODUCTS.length);
    });
  });

  // S8: Sort by price ascending
  it("sorts products by price low to high", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const sortSelect = screen.getByLabelText(/מיון/i);
    await user.selectOptions(sortSelect, "price-asc");

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names[0]).toBe("עכבר Logitech");
      expect(names[names.length - 1]).toBe("מחשב נייד Dell XPS");
    });
  });

  // S9: Sort by price descending
  it("sorts products by price high to low", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const sortSelect = screen.getByLabelText(/מיון/i);
    await user.selectOptions(sortSelect, "price-desc");

    await vi.waitFor(() => {
      const names = getVisibleProductNames();
      expect(names[0]).toBe("מחשב נייד Dell XPS");
      expect(names[names.length - 1]).toBe("עכבר Logitech");
    });
  });

  // S10: Debounce — search not triggered instantly
  it("does not filter immediately on each keystroke (debounced)", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const searchInput = screen.getByPlaceholderText(/חיפוש מוצרים/i);

    await user.type(searchInput, "מ");
    expect(getVisibleProductNames().length).toBe(MOCK_PRODUCTS.length);
  });

  // S11: Search min length — 1 char should not trigger filtering
  it("does not filter with only 1 character", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    const searchInput = screen.getByPlaceholderText(/חיפוש מוצרים/i);
    await user.type(searchInput, "מ");

    await new Promise((r) => setTimeout(r, 400));

    expect(getVisibleProductNames().length).toBe(MOCK_PRODUCTS.length);
  });

  // Result count display
  it("displays the result count text", async () => {
    renderPage();

    await screen.findByText("מחשב נייד Dell XPS");

    expect(screen.getByText(/מציג \d+ מתוך \d+ מוצרים/)).toBeInTheDocument();
  });
});
