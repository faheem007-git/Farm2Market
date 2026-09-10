import { beforeEach, describe, expect, it } from "vitest";
import { authService } from "../authService";
import { isApiEnabled } from "../apiClient";
import {
  chatService,
  matchingService,
  notificationsService,
  ordersService,
  produceService,
  requirementsService,
  supplierResponseService,
} from "../index";

/**
 * Frontend -> backend integration through the REAL migrated services.
 * Runs ONLY with VITE_USE_API=true and a live backend (default: :8080).
 * Default `npm test` (flag off) skips this file entirely.
 */
describe.skipIf(!isApiEnabled())("api integration", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
      configurable: true,
    });
  });

  it("walks buyer and supplier flows end to end", async () => {
    // 1. authentication
    const buyer = await authService.login("buyer@agripulse.demo", "buyer123");
    expect(buyer.user.role).toBe("buyer");
    expect(buyer.token.length).toBeGreaterThan(20);
    const me = await authService.me();
    expect(me.company).toBe("ABC Foods Pvt Ltd");

    const supplier = await authService.login(
      "supplier@agripulse.demo",
      "supplier123"
    );
    expect(supplier.user.role).toBe("supplier");

    // 3. produce (supplier creates; buyer lists)
    const produce = await produceService.createProduce(
      supplier.user.id,
      supplier.user.company,
      {
        name: "Integration Beans",
        variety: "v1",
        category: "Vegetables",
        grade: "A",
        quantityKg: 1000,
        unit: "kg",
        pricePerKg: 40,
        location: "Guntur",
        availableFrom: "2026-09-10",
        availableUntil: "2026-09-30",
        description: "api integration",
      }
    );
    expect(produce.status).toBe("active");
    expect(produce.supplierName).toBe("Ravi FPO");
    const listed = await produceService.listProduce();
    expect(listed.some((p) => p.id === produce.id)).toBe(true);

    // 4. requirements (buyer creates)
    await authService.login("buyer@agripulse.demo", "buyer123");
    const req = await requirementsService.createRequirement(
      buyer.user.id,
      buyer.user.company,
      {
        produceName: "Integration Beans",
        category: "Vegetables",
        grade: "A",
        quantityKg: 500,
        unit: "kg",
        priceMinPerKg: 35,
        priceMaxPerKg: 45,
        deliveryLocation: "Hyderabad",
        deliveryDeadline: "2026-09-25",
        description: "api integration",
      }
    );
    expect(req.status).toBe("open");

    // 5. matching (server-side score)
    const matches = await matchingService.findMatches(req.id);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].supplierName).toBe("Ravi FPO");
    expect(matches[0].score).toBeGreaterThan(0);
    expect(matches[0].reasons.length).toBe(6);

    // 6. orders + 7. fulfillment
    const order = await ordersService.createOrder(buyer.user.id, buyer.user.company, {
      supplierId: supplier.user.id,
      supplierName: supplier.user.company,
      produceName: "Integration Beans",
      grade: "A",
      quantityKg: 500,
      pricePerKg: 40,
      deliveryLocation: "Hyderabad",
      expectedDelivery: "2026-09-26",
    });
    expect(order.status).toBe("placed");
    expect(order.totalAmount).toBe(20000);
    expect(order.timeline.length).toBe(1);

    await authService.login("supplier@agripulse.demo", "supplier123");
    const confirmed = await ordersService.updateOrderStatus(order.id, "confirmed", "ok");
    expect(confirmed?.status).toBe("confirmed");
    expect(confirmed?.timeline.length).toBe(2);

    // supplier responses
    const resp = await supplierResponseService.set(
      req.id,
      supplier.user.id,
      supplier.user.company,
      "accepted"
    );
    expect(resp.status).toBe("accepted");
    const fetched = await supplierResponseService.get(req.id, supplier.user.id);
    expect(fetched?.status).toBe("accepted");

    // 8. chat
    await authService.login("buyer@agripulse.demo", "buyer123");
    const conv = await chatService.getOrCreateConversation(
      buyer.user.id,
      buyer.user.company,
      supplier.user.id,
      supplier.user.company,
      "Integration thread"
    );
    const msg = await chatService.sendMessage(conv.id, buyer.user.id, "hi", "hello api");
    expect(msg.text).toBe("hello api");
    const msgs = await chatService.listMessages(conv.id);
    expect(msgs.some((m) => m.id === msg.id)).toBe(true);

    // 9. notifications (triggered along the way)
    const feed = await notificationsService.listFor(buyer.user.id, "buyer");
    expect(feed.length).toBeGreaterThan(0);
    const unread = await notificationsService.unreadFor(buyer.user.id, "buyer");
    expect(unread).toBeGreaterThan(0);
    await notificationsService.markAllRead(buyer.user.id, "buyer");
    expect(await notificationsService.unreadFor(buyer.user.id, "buyer")).toBe(0);
  }, 120000);
});
