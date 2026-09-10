import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "../authService";
import {
  chatService,
  getAllOrders,
  getAllProduce,
  getAllRequirements,
  isValidOrderTransition,
  matchingService,
  notificationsService,
  notifyUser,
  ordersService,
  produceService,
  requirementsService,
} from "../index";
import { weightedScore } from "../../utils/matching";

/** Isolated localStorage per test — mirrors the browser demo backend. */
function installStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  installStorage();
});

describe("demo authentication", () => {
  it("logs in the buyer demo account with role redirect info", async () => {
    const session = await authService.login("buyer@agripulse.demo", "buyer123");
    expect(session.user.role).toBe("buyer");
    expect(session.user.company).toBe("ABC Foods Pvt Ltd");
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getCurrentUser()?.id).toBe("u-buyer-1");
  });

  it("logs in supplier and admin accounts", async () => {
    expect((await authService.login("supplier@agripulse.demo", "supplier123")).user.role).toBe("supplier");
    authService.logout();
    expect((await authService.login("admin@agripulse.demo", "admin123")).user.role).toBe("admin");
  });

  it("rejects invalid credentials with a clear error", async () => {
    await expect(authService.login("buyer@agripulse.demo", "wrong")).rejects.toThrow();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it("logout clears the session", async () => {
    await authService.login("buyer@agripulse.demo", "buyer123");
    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});

describe("requirements", () => {
  it("creates a requirement that immediately appears in the shared list", async () => {
    const before = (await requirementsService.listRequirements()).length;
    const created = await requirementsService.createRequirement("u-buyer-1", "ABC Foods Pvt Ltd", {
      produceName: "Tomatoes",
      category: "Vegetables",
      grade: "A",
      quantityKg: 5000,
      unit: "kg",
      priceMinPerKg: 25,
      priceMaxPerKg: 30,
      deliveryLocation: "Hyderabad",
      deliveryDeadline: "2026-09-15",
      description: "e2e",
    });
    expect(created.status).toBe("open");
    const after = await requirementsService.listRequirements();
    expect(after.length).toBe(before + 1);
    expect(after.some((r) => r.id === created.id)).toBe(true);
  });

  it("persists across reloads (fresh read from localStorage)", async () => {
    const created = await requirementsService.createRequirement("u-buyer-1", "ABC Foods Pvt Ltd", {
      produceName: "Onions",
      category: "Vegetables",
      grade: "A",
      quantityKg: 500,
      unit: "kg",
      priceMinPerKg: 28,
      priceMaxPerKg: 34,
      deliveryLocation: "Hyderabad",
      deliveryDeadline: "2026-09-22",
      description: "",
    });
    // Simulate a page refresh: re-read straight from storage.
    expect(getAllRequirements().some((r) => r.id === created.id)).toBe(true);
  });
});

describe("matching engine", () => {
  it("scores Ravi FPO ~94 for the canonical tomato requirement", async () => {
    const matches = await matchingService.findMatches("r-abc-tomato");
    const ravi = matches.find((m) => m.supplierId === "u-supplier-1");
    expect(ravi).toBeDefined();
    expect(ravi!.score).toBeGreaterThanOrEqual(90);
    expect(ravi!.score).toBeLessThanOrEqual(98);
    expect(ravi!.factors).toMatchObject({ product: 100, quantity: 100, quality: 100, price: 100 });
  });

  it("is deterministic and sorted best-first", async () => {
    const a = await matchingService.findMatches("r-abc-tomato");
    const b = await matchingService.findMatches("r-abc-tomato");
    expect(a).toEqual(b);
    expect(a.every((m, i) => i === 0 || a[i - 1].score >= m.score)).toBe(true);
  });

  it("is not hard-coded: scores spread and respond to inputs", async () => {
    const matches = await matchingService.findMatches("r-abc-tomato");
    expect(new Set(matches.map((m) => m.score)).size).toBeGreaterThan(1);
    // Weighted sum check on the top match.
    const top = matches[0];
    const f = top.factors!;
    expect(weightedScore(f)).toBe(top.score);
    expect(
      Math.round((f.product * 30 + f.quantity * 20 + f.quality * 20 + f.price * 15 + f.location * 10 + f.availability * 5) / 100)
    ).toBe(top.score);
  });

  it("new supplier produce is immediately matchable", async () => {
    const before = (await matchingService.findMatches("r-abc-tomato")).length;
    await produceService.createProduce("u-supplier-1", "Ravi FPO", {
      name: "Tomatoes",
      variety: "Test",
      category: "Vegetables",
      grade: "A",
      quantityKg: 500,
      unit: "kg",
      pricePerKg: 26,
      location: "Rajahmundry",
      availableFrom: "2026-09-10",
      availableUntil: "2026-09-25",
      description: "",
    });
    expect(getAllProduce().length).toBeGreaterThan(0);
    expect((await matchingService.findMatches("r-abc-tomato")).length).toBe(before + 1);
  });
});

describe("shared order workflow", () => {
  async function placedOrder() {
    return ordersService.createOrder("u-buyer-1", "ABC Foods Pvt Ltd", {
      supplierId: "u-supplier-1",
      supplierName: "Ravi FPO",
      produceName: "Tomatoes",
      grade: "A",
      quantityKg: 1000,
      pricePerKg: 27,
      deliveryLocation: "Hyderabad",
      expectedDelivery: "2026-09-20",
    });
  }

  it("creates requests in placed state with totals", async () => {
    const order = await placedOrder();
    expect(order.status).toBe("placed");
    expect(order.totalAmount).toBe(27000);
    expect(order.timeline).toHaveLength(1);
  });

  it("supplier and buyer read the SAME order entity", async () => {
    const order = await placedOrder();
    const accepted = await ordersService.updateOrderStatus(order.id, "confirmed", "Accepted by Ravi FPO");
    expect(accepted?.status).toBe("confirmed");
    // Buyer side reads the same record after a refresh.
    expect(getAllOrders().find((o) => o.id === order.id)?.status).toBe("confirmed");
  });

  it("walks the full fulfillment chain with a growing timeline", async () => {
    const order = await placedOrder();
    for (const s of ["confirmed", "packed", "shipped", "delivered"] as const) {
      const updated = await ordersService.updateOrderStatus(order.id, s, "e2e");
      expect(updated?.status).toBe(s);
    }
    const final = getAllOrders().find((o) => o.id === order.id)!;
    expect(final.status).toBe("delivered");
    expect(final.timeline).toHaveLength(5);
  });

  it("blocks backward and skipped transitions", async () => {
    expect(isValidOrderTransition("delivered", "packed")).toBe(false);
    expect(isValidOrderTransition("confirmed", "delivered")).toBe(false);
    expect(isValidOrderTransition("placed", "shipped")).toBe(false);
    expect(isValidOrderTransition("placed", "confirmed")).toBe(true);
    const order = await placedOrder();
    await ordersService.updateOrderStatus(order.id, "confirmed", "ok");
    await ordersService.updateOrderStatus(order.id, "packed", "ok");
    expect(await ordersService.updateOrderStatus(order.id, "confirmed", "backward")).toBeNull();
  });
});

describe("shared chat", () => {
  it("buyer and supplier exchange messages in one conversation", async () => {
    await chatService.sendMessage("c-ravi", "u-buyer-1", "ABC Foods Pvt Ltd", "Can you confirm dispatch timing?");
    const forSupplier = await chatService.listConversations();
    expect(forSupplier.find((c) => c.id === "c-ravi")?.lastMessage).toBe("Can you confirm dispatch timing?");
    await chatService.sendMessage("c-ravi", "u-supplier-1", "Ravi FPO", "Dispatch at 6 AM");
    const messages = await chatService.listMessages("c-ravi");
    expect(messages.every((m) => m.conversationId === "c-ravi")).toBe(true);
    expect(messages[messages.length - 1].text).toBe("Dispatch at 6 AM");
  });
});

describe("notifications", () => {
  it("emits match, order and message notifications to the right audience", async () => {
    await requirementsService.createRequirement("u-buyer-1", "ABC Foods Pvt Ltd", {
      produceName: "Tomatoes",
      category: "Vegetables",
      grade: "A",
      quantityKg: 5000,
      unit: "kg",
      priceMinPerKg: 25,
      priceMaxPerKg: 30,
      deliveryLocation: "Hyderabad",
      deliveryDeadline: "2026-09-15",
      description: "",
    });
    const buyerFeed = await notificationsService.listFor("u-buyer-1", "buyer");
    expect(buyerFeed.some((n) => /match/i.test(n.title))).toBe(true);
    const supplierFeed = await notificationsService.listFor("u-supplier-1", "supplier");
    expect(supplierFeed.some((n) => /buyer request/i.test(n.title))).toBe(true);
    const unreadBefore = await notificationsService.unreadFor("u-supplier-1", "supplier");
    notifyUser("u-supplier-1", "Ping", "hello", "info");
    expect(await notificationsService.unreadFor("u-supplier-1", "supplier")).toBe(unreadBefore + 1);
    await notificationsService.markAllRead("u-supplier-1", "supplier");
    expect(await notificationsService.unreadFor("u-supplier-1", "supplier")).toBe(0);
  });
});
