import { DEMO_ORDERS, DEMO_PRODUCE, DEMO_REQUIREMENTS } from "../data/demoData";
import type { AppNotification, Conversation, Match, Message, Order, Produce, Requirement, Role } from "../types";
import { distanceKm } from "../utils/marketplace";
import { factorReasons, scoreFactors, weightedScore } from "../utils/matching";
import { ApiError, apiFetch, isApiEnabled } from "./apiClient";

// REST-ready abstractions backed by demo data (+ localStorage for buyer-created
// requirements). Pages must use these services / the useRequirements hook —
// never import demoData directly.

const REQ_STORAGE_KEY = "agripulse.requirements.v1";

export interface RequirementInput {
  produceName: string;
  category: string;
  grade: Requirement["grade"];
  quantityKg: number;
  unit: string;
  priceMinPerKg: number;
  priceMaxPerKg: number;
  deliveryLocation: string;
  deliveryDeadline: string;
  description: string;
}

function readStored(): Requirement[] {
  try {
    const raw = localStorage.getItem(REQ_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Requirement[];
    if (!Array.isArray(parsed)) return [];
    // Drop corrupted entries (missing id) so old/bad data never breaks lists.
    return parsed.filter((r) => r && typeof r.id === "string");
  } catch {
    return [];
  }
}

function writeStored(items: Requirement[]): void {
  localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(items));
}

/** Seed + buyer-created requirements, newest first. Exported for the shared workflow. */
export function getAllRequirements(): Requirement[] {
  const stored = readStored();
  const seedIds = new Set(DEMO_REQUIREMENTS.map((r) => r.id));
  const custom = stored.filter((r) => !seedIds.has(r.id));
  const overridden = DEMO_REQUIREMENTS.map(
    (seed) => stored.find((s) => s.id === seed.id) ?? seed
  );
  return [...custom, ...overridden].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export const marketplaceService = {
  async listProduce(): Promise<Produce[]> {
    return getAllProduce();
  },
};

const PRODUCE_STORAGE_KEY = "agripulse.produce.v1";

export interface ProduceInput {
  name: string;
  variety: string;
  category: string;
  grade: Produce["grade"];
  quantityKg: number;
  unit: string;
  pricePerKg: number;
  location: string;
  availableFrom: string;
  availableUntil: string;
  description: string;
}

function readStoredProduce(): Produce[] {
  try {
    const raw = localStorage.getItem(PRODUCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Produce[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.id === "string");
  } catch {
    return [];
  }
}

function writeStoredProduce(items: Produce[]): void {
  localStorage.setItem(PRODUCE_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Seed + supplier-created produce, newest first. The matching engine and
 * Discover read this same list — new listings are matchable immediately.
 */
export function getAllProduce(): Produce[] {
  const stored = readStoredProduce();
  const seedIds = new Set(DEMO_PRODUCE.map((p) => p.id));
  const custom = stored.filter((p) => !seedIds.has(p.id));
  const overridden = DEMO_PRODUCE.map(
    (seed) => stored.find((s) => s.id === seed.id) ?? seed
  );
  return [...custom, ...overridden].sort((a, b) =>
    b.harvestDate.localeCompare(a.harvestDate)
  );
}

export const produceService = {
  async listProduce(): Promise<Produce[]> {
    if (isApiEnabled()) return apiFetch<Produce[]>("/api/produce");
    return getAllProduce();
  },

  async createProduce(
    supplierId: string,
    supplierName: string,
    input: ProduceInput
  ): Promise<Produce> {
    if (isApiEnabled()) {
      return apiFetch<Produce>("/api/produce", {
        method: "POST",
        body: {
          name: input.name,
          variety: input.variety,
          category: input.category,
          grade: input.grade,
          quantityKg: input.quantityKg,
          unit: input.unit,
          pricePerKg: input.pricePerKg,
          location: input.location,
          harvestDate: input.availableFrom,
          availableFrom: input.availableFrom,
          availableUntil: input.availableUntil,
          description: input.description,
        },
      });
    }
    const emoji =
      input.name === "Onions" ? "🧅" : input.name === "Green Chillies" ? "🌶️" : "🍅";
    const created: Produce = {
      id: `p-user-${Date.now()}`,
      supplierId,
      supplierName,
      imageEmoji: emoji,
      status: "active",
      harvestDate: input.availableFrom,
      ...input,
    };
    writeStoredProduce([created, ...readStoredProduce()]);
    // Tell buyers with overlapping open demand — bounded, one per requirement.
    getAllRequirements()
      .filter(
        (r) =>
          (r.status === "open" || r.status === "matched") &&
          r.produceName === created.name
      )
      .forEach((r) =>
        notifyUser(
          r.buyerId,
          `New match for ${r.produceName}`,
          `${created.supplierName} listed ${created.quantityKg.toLocaleString("en-IN")} kg @ ₹${created.pricePerKg}/kg`,
          "success",
          `/buyer/matches?requirement=${r.id}`
        )
      );
    return created;
  },

  async updateProduce(
    id: string,
    patch: Partial<Produce>
  ): Promise<Produce | null> {
    if (isApiEnabled()) {
      try {
        return await apiFetch<Produce>(`/api/produce/${id}`, {
          method: "PATCH",
          body: patch,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    }
    const current = getAllProduce().find((p) => p.id === id);
    if (!current) return null;
    const updated: Produce = { ...current, ...patch, id: current.id };
    const stored = readStoredProduce();
    if (stored.some((p) => p.id === id)) {
      writeStoredProduce(stored.map((p) => (p.id === id ? updated : p)));
    } else {
      writeStoredProduce([updated, ...stored]);
    }
    return updated;
  },
};

export const requirementsService = {
  async listRequirements(): Promise<Requirement[]> {
    if (isApiEnabled()) return apiFetch<Requirement[]>("/api/requirements");
    return getAllRequirements();
  },

  async createRequirement(
    buyerId: string,
    buyerCompany: string,
    input: RequirementInput
  ): Promise<Requirement> {
    if (isApiEnabled()) {
      return apiFetch<Requirement>("/api/requirements", {
        method: "POST",
        body: {
          produceName: input.produceName,
          category: input.category,
          grade: input.grade,
          quantityKg: input.quantityKg,
          unit: input.unit,
          priceMinPerKg: input.priceMinPerKg,
          priceMaxPerKg: input.priceMaxPerKg,
          deliveryLocation: input.deliveryLocation,
          deliveryDeadline: input.deliveryDeadline,
          description: input.description,
        },
      });
    }
    const created: Requirement = {
      id: `r-user-${Date.now()}`,
      buyerId,
      buyerCompany,
      ...input,
      status: "open",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    writeStored([created, ...readStored()]);
    notifyRole(
      "supplier",
      "New buyer request",
      `${buyerCompany} needs ${input.quantityKg.toLocaleString("en-IN")} kg ${input.produceName} in ${input.deliveryLocation}`,
      "info",
      "/supplier/requests"
    );
    // Buyer immediately learns the best existing match (same engine as Matches).
    const ranked = getAllProduce()
      .filter((p) => p.name === created.produceName)
      .map((p) => {
        const factors = scoreFactors(created, p);
        return { produce: p, score: weightedScore(factors) };
      })
      .sort((a, b) => b.score - a.score);
    if (ranked.length > 0) {
      const top = ranked[0];
      notifyUser(
        buyerId,
        `New match for ${created.produceName}`,
        `${top.produce.supplierName} · ${top.score}% · ₹${top.produce.pricePerKg}/kg`,
        "success",
        `/buyer/matches?requirement=${created.id}`
      );
    }
    return created;
  },

  async updateRequirementStatus(
    id: string,
    status: Requirement["status"]
  ): Promise<Requirement | null> {
    if (isApiEnabled()) {
      try {
        return await apiFetch<Requirement>(`/api/requirements/${id}/status`, {
          method: "PATCH",
          body: { status },
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    }
    const current = getAllRequirements().find((r) => r.id === id);
    if (!current) return null;
    const updated: Requirement = { ...current, status };
    const stored = readStored();
    if (stored.some((r) => r.id === id)) {
      writeStored(stored.map((r) => (r.id === id ? updated : r)));
    } else {
      writeStored([updated, ...stored]);
    }
    return updated;
  },
};

export const matchingService = {
  /** Deterministic weighted matcher (see utils/matching). Sorted best-first. */
  async findMatches(requirementId: string) {
    if (isApiEnabled()) {
      const params = new URLSearchParams({ requirementId });
      return apiFetch<Match[]>(`/api/matches?${params.toString()}`);
    }
    const req = getAllRequirements().find((r) => r.id === requirementId);
    if (!req) return [];
    return getAllProduce().filter((p) => p.name === req.produceName)
      .map((p) => {
        const factors = scoreFactors(req, p);
        return {
          id: `m-${requirementId}-${p.id}`,
          requirementId,
          produceId: p.id,
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          score: weightedScore(factors),
          pricePerKg: p.pricePerKg,
          quantityKg: Math.min(p.quantityKg, req.quantityKg),
          distanceKm: distanceKm(p.location),
          gradeMatch: p.grade === req.grade,
          reasons: factorReasons(req, p, factors),
          factors,
        };
      })
      .sort((a, b) => b.score - a.score);
  },
};

const ORDER_STORAGE_KEY = "agripulse.orders.v1";

function readStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((o) => o && typeof o.id === "string");
  } catch {
    return [];
  }
}

function writeStoredOrders(items: Order[]): void {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Seed + buyer-created orders, newest first. Supplier actions (Request 4+)
 * update these same records via updateOrderStatus — one shared order book.
 */
export function getAllOrders(): Order[] {
  const stored = readStoredOrders();
  const seedIds = new Set(DEMO_ORDERS.map((o) => o.id));
  const custom = stored.filter((o) => !seedIds.has(o.id));
  const overridden = DEMO_ORDERS.map(
    (seed) => stored.find((s) => s.id === seed.id) ?? seed
  );
  return [...custom, ...overridden].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export interface OrderInput {
  matchId?: string;
  supplierId: string;
  supplierName: string;
  produceName: string;
  grade: Order["grade"];
  quantityKg: number;
  pricePerKg: number;
  deliveryLocation: string;
  expectedDelivery: string;
}

function orderTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Forward-only fulfillment graph shared by buyer + supplier clients.
 * Terminal states (delivered, cancelled) accept no further transitions.
 */
export const ORDER_TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["in_transit", "delivered", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function isValidOrderTransition(
  from: Order["status"],
  to: Order["status"]
): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Backend timeline notes may be null; the frontend contract uses undefined. */
function normalizeOrder(o: Order): Order {
  return {
    ...o,
    timeline: o.timeline.map((t) => ({ ...t, note: t.note ?? undefined })),
  };
}

export const ordersService = {
  async listOrders(): Promise<Order[]> {
    if (isApiEnabled()) {
      const orders = await apiFetch<Order[]>("/api/orders");
      return orders.map(normalizeOrder);
    }
    return getAllOrders();
  },

  async getOrder(id: string): Promise<Order | null> {
    if (isApiEnabled()) {
      try {
        return normalizeOrder(await apiFetch<Order>(`/api/orders/${id}`));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    }
    return getAllOrders().find((o) => o.id === id) ?? null;
  },

  /** Buyer request → real order in state `placed` (Requested tab). */
  async createOrder(
    buyerId: string,
    buyerCompany: string,
    input: OrderInput
  ): Promise<Order> {
    if (isApiEnabled()) {
      return normalizeOrder(
        await apiFetch<Order>("/api/orders", {
          method: "POST",
          body: {
            matchId: input.matchId,
            supplierId: input.supplierId,
            produceName: input.produceName,
            grade: input.grade,
            quantityKg: input.quantityKg,
            pricePerKg: input.pricePerKg,
            deliveryLocation: input.deliveryLocation,
            expectedDelivery: input.expectedDelivery,
          },
        })
      );
    }
    const seq = getAllOrders().length + 1046;
    const created: Order = {
      id: `ORD-${seq}`,
      buyerId,
      buyerCompany,
      ...input,
      totalAmount: input.quantityKg * input.pricePerKg,
      status: "placed",
      createdAt: new Date().toISOString().slice(0, 10),
      timeline: [
        {
          status: "placed",
          at: orderTimestamp(),
          note: `Request placed by ${buyerCompany}`,
        },
      ],
    };
    writeStoredOrders([created, ...readStoredOrders()]);
    notifyRole(
      "supplier",
      "New order request",
      `${buyerCompany} requested ${input.quantityKg.toLocaleString("en-IN")} kg ${input.produceName} (${created.id})`,
      "info",
      "/supplier/orders"
    );
    return created;
  },

  /**
   * Shared status transition used by buyer AND supplier clients.
   * Appends to the same timeline the tracking view reads.
   * Backward/invalid transitions are rejected (returns null).
   */
  async updateOrderStatus(
    id: string,
    status: Order["status"],
    note?: string
  ): Promise<Order | null> {
    if (isApiEnabled()) {
      try {
        return normalizeOrder(
          await apiFetch<Order>(`/api/orders/${id}/transitions`, {
            method: "POST",
            body: { to: status, note },
          })
        );
      } catch (e) {
        // Matches demo semantics: missing/rejected transitions resolve null.
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
        throw e;
      }
    }
    const current = getAllOrders().find((o) => o.id === id);
    if (!current) return null;
    if (current.status === status) return current;
    if (!isValidOrderTransition(current.status, status)) return null;
    const updated: Order = {
      ...current,
      status,
      timeline: [...current.timeline, { status, at: orderTimestamp(), note }],
    };
    const stored = readStoredOrders();
    if (stored.some((o) => o.id === id)) {
      writeStoredOrders(stored.map((o) => (o.id === id ? updated : o)));
    } else {
      writeStoredOrders([updated, ...stored]);
    }
    notifyUser(
      current.buyerId,
      `Order ${status.replace(/_/g, " ")}`,
      `${id} · ${current.quantityKg.toLocaleString("en-IN")} kg ${current.produceName} from ${current.supplierName}`,
      status === "cancelled" ? "warning" : "success",
      `/buyer/orders/${id}`
    );
    return updated;
  },
};

export type SupplierResponseStatus = "responded" | "accepted" | "rejected";

export interface SupplierResponse {
  requirementId: string;
  supplierId: string;
  supplierName: string;
  status: SupplierResponseStatus;
  updatedAt: string;
}

const RESPONSE_STORAGE_KEY = "agripulse.supplier-responses.v1";

function readResponses(): SupplierResponse[] {
  try {
    const raw = localStorage.getItem(RESPONSE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SupplierResponse[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.requirementId === "string");
  } catch {
    return [];
  }
}

/**
 * Per-supplier answers to buyer requirements. Buyer Requests tabs and Buyer
 * Details read this same store — one shared response book.
 */
export const supplierResponseService = {
  async list(): Promise<SupplierResponse[]> {
    if (isApiEnabled()) return apiFetch<SupplierResponse[]>("/api/supplier-responses");
    return readResponses();
  },

  async get(requirementId: string, supplierId: string): Promise<SupplierResponse | null> {
    if (isApiEnabled()) {
      const params = new URLSearchParams({ requirementId, supplierId });
      const found = await apiFetch<SupplierResponse[]>(`/api/supplier-responses?${params.toString()}`);
      return found[0] ?? null;
    }
    return (
      readResponses().find(
        (r) => r.requirementId === requirementId && r.supplierId === supplierId
      ) ?? null
    );
  },

  async set(
    requirementId: string,
    supplierId: string,
    supplierName: string,
    status: SupplierResponseStatus
  ): Promise<SupplierResponse> {
    if (isApiEnabled()) {
      return apiFetch<SupplierResponse>("/api/supplier-responses", {
        method: "POST",
        body: { requirementId, supplierId, status },
      });
    }
    const current = readResponses().filter(
      (r) => !(r.requirementId === requirementId && r.supplierId === supplierId)
    );
    const saved: SupplierResponse = {
      requirementId,
      supplierId,
      supplierName,
      status,
      updatedAt: orderTimestamp(),
    };
    localStorage.setItem(RESPONSE_STORAGE_KEY, JSON.stringify([saved, ...current]));
    return saved;
  },
};

const CHAT_STORAGE_KEY = "agripulse.chat.v1";

interface ChatStore {
  conversations: Conversation[];
  messages: Message[];
}

const SEED_CHAT: ChatStore = {
  conversations: [
    {
      id: "c-ravi",
      buyerId: "u-buyer-1",
      buyerCompany: "ABC Foods Pvt Ltd",
      supplierId: "u-supplier-1",
      supplierName: "Ravi FPO",
      subject: "5,000 kg Tomatoes · Grade A",
      lastMessage: "Tomatoes graded and packed, dispatch tomorrow.",
      lastAt: "2026-09-10 11:20",
      unreadBuyer: 1,
      unreadSupplier: 0,
    },
    {
      id: "c-green",
      buyerId: "u-buyer-1",
      buyerCompany: "ABC Foods Pvt Ltd",
      supplierId: "s-green-farms",
      supplierName: "Green Farms",
      subject: "3,000 kg Onions · Grade A",
      lastMessage: "Nashik Red lots ready for inspection this week.",
      lastAt: "2026-09-09 16:05",
      unreadBuyer: 0,
      unreadSupplier: 0,
    },
    {
      id: "c-lakshmi",
      buyerId: "u-buyer-1",
      buyerCompany: "ABC Foods Pvt Ltd",
      supplierId: "s-lakshmi-farms",
      supplierName: "Sri Lakshmi Farms",
      subject: "800 kg Green Chillies · Guntur G4",
      lastMessage: "G4 harvest complete, sharing grading photos today.",
      lastAt: "2026-09-08 18:40",
      unreadBuyer: 0,
      unreadSupplier: 1,
    },
  ],
  messages: [
    {
      id: "m-ravi-1",
      conversationId: "c-ravi",
      senderId: "u-buyer-1",
      senderName: "ABC Foods Pvt Ltd",
      text: "Namaste! Confirming 2,000 kg Tomatoes Grade A at ₹27/kg for Sep 14 delivery.",
      sentAt: "2026-09-09 10:05",
      read: true,
    },
    {
      id: "m-ravi-2",
      conversationId: "c-ravi",
      senderId: "u-supplier-1",
      senderName: "Ravi FPO",
      text: "Confirmed. Grading today, packing in 25 kg crates.",
      sentAt: "2026-09-09 14:32",
      read: true,
    },
    {
      id: "m-ravi-3",
      conversationId: "c-ravi",
      senderId: "u-supplier-1",
      senderName: "Ravi FPO",
      text: "Tomatoes graded and packed, dispatch tomorrow.",
      sentAt: "2026-09-10 11:20",
      read: false,
    },
    {
      id: "m-green-1",
      conversationId: "c-green",
      senderId: "s-green-farms",
      senderName: "Green Farms",
      text: "Nashik Red lots ready for inspection this week.",
      sentAt: "2026-09-09 16:05",
      read: true,
    },
    {
      id: "m-lakshmi-1",
      conversationId: "c-lakshmi",
      senderId: "s-lakshmi-farms",
      senderName: "Sri Lakshmi Farms",
      text: "G4 harvest complete, sharing grading photos today.",
      sentAt: "2026-09-08 18:40",
      read: true,
    },
  ],
};

function readChat(): ChatStore {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return SEED_CHAT;
    const parsed = JSON.parse(raw) as ChatStore;
    if (!Array.isArray(parsed.conversations) || !Array.isArray(parsed.messages))
      return SEED_CHAT;
    return {
      conversations: parsed.conversations.filter((c) => c && typeof c.id === "string"),
      messages: parsed.messages.filter((m) => m && typeof m.id === "string" && typeof m.conversationId === "string"),
    };
  } catch {
    return SEED_CHAT;
  }
}

function writeChat(store: ChatStore): void {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
}

/** Demo supplier auto-replies (frontend demo only — real socket later). */
const SUPPLIER_REPLIES = [
  "Noted, we will confirm quantity and dispatch slot shortly.",
  "Thanks! Sharing grading photos and weighment slip today.",
  "Understood — our field team will update you by evening.",
];

export const chatService = {
  async listConversations(): Promise<Conversation[]> {
    if (isApiEnabled()) return apiFetch<Conversation[]>("/api/conversations");
    return [...readChat().conversations].sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt)
    );
  },

  async listMessages(conversationId: string): Promise<Message[]> {
    if (isApiEnabled()) {
      return apiFetch<Message[]>(`/api/conversations/${conversationId}/messages`);
    }
    return readChat()
      .messages.filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  },

  /** Shared helper: buyer or (later) supplier client opens the same thread. */
  async getOrCreateConversation(
    buyerId: string,
    buyerCompany: string,
    supplierId: string,
    supplierName: string,
    subject: string
  ): Promise<Conversation> {
    if (isApiEnabled()) {
      return apiFetch<Conversation>("/api/conversations", {
        method: "POST",
        body: { buyerId, buyerCompany, supplierId, supplierName, subject },
      });
    }
    const store = readChat();
    const existing = store.conversations.find(
      (c) => c.buyerId === buyerId && c.supplierId === supplierId
    );
    if (existing) return existing;
    const created: Conversation = {
      id: `c-${supplierId}-${Date.now()}`,
      buyerId,
      buyerCompany,
      supplierId,
      supplierName,
      subject,
      lastMessage: "",
      lastAt: orderTimestamp(),
      unreadBuyer: 0,
      unreadSupplier: 0,
    };
    writeChat({
      ...store,
      conversations: [created, ...store.conversations],
    });
    return created;
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string
  ): Promise<Message> {
    if (isApiEnabled()) {
      try {
        return await apiFetch<Message>(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          body: { text },
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          throw new Error("Conversation not found.");
        }
        throw e;
      }
    }
    const store = readChat();
    const conv = store.conversations.find((c) => c.id === conversationId);
    if (!conv) throw new Error("Conversation not found.");
    const message: Message = {
      id: `m-${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      text: text.trim(),
      sentAt: orderTimestamp(),
      read: false,
    };
    const isBuyer = senderId === conv.buyerId;
    writeChat({
      conversations: store.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: message.text,
              lastAt: message.sentAt,
              unreadBuyer: isBuyer ? c.unreadBuyer : c.unreadBuyer + 1,
              unreadSupplier: isBuyer ? c.unreadSupplier + 1 : c.unreadSupplier,
            }
          : c
      ),
      messages: [...store.messages, message],
    });
    // Cross-role ping on the SAME conversation the other side already reads.
    if (isBuyer) {
      notifyUser(
        conv.supplierId,
        `New message from ${conv.buyerCompany}`,
        message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text,
        "info",
        `/supplier/chat/${conversationId}`
      );
    } else {
      notifyUser(
        conv.buyerId,
        `New message from ${conv.supplierName}`,
        message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text,
        "info",
        `/buyer/chat/${conversationId}`
      );
    }
    return message;
  },

  /** Demo helper: deterministic supplier acknowledgement after buyer sends. */
  async demoSupplierReply(conversationId: string): Promise<Message | null> {
    // API mode never fabricates replies; the other party's client sends them.
    if (isApiEnabled()) return null;
    const store = readChat();
    const conv = store.conversations.find((c) => c.id === conversationId);
    if (!conv) return null;
    const prior = store.messages.filter(
      (m) => m.conversationId === conversationId && m.senderId !== conv.buyerId
    ).length;
    const reply: Message = {
      id: `m-reply-${Date.now()}`,
      conversationId,
      senderId: conv.supplierId,
      senderName: conv.supplierName,
      text: SUPPLIER_REPLIES[prior % SUPPLIER_REPLIES.length],
      sentAt: orderTimestamp(),
      read: false,
    };
    writeChat({
      conversations: store.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: reply.text,
              lastAt: reply.sentAt,
              unreadBuyer: c.unreadBuyer + 1,
            }
          : c
      ),
      messages: [...readChat().messages, reply],
    });
    return reply;
  },

  async markBuyerRead(conversationId: string): Promise<void> {
    if (isApiEnabled()) {
      await apiFetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
      return;
    }
    const store = readChat();
    writeChat({
      conversations: store.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadBuyer: 0 } : c
      ),
      messages: store.messages.map((m) =>
        m.conversationId === conversationId ? { ...m, read: true } : m
      ),
    });
  },

  /** Supplier inbox counterpart (Request 4+ supplier UI). */
  async markSupplierRead(conversationId: string): Promise<void> {
    if (isApiEnabled()) {
      await apiFetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
      return;
    }
    const store = readChat();
    writeChat({
      conversations: store.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadSupplier: 0 } : c
      ),
      messages: store.messages,
    });
  },
};

/* ---------------- Notifications ---------------- */

const NOTIF_STORAGE_KEY = "agripulse.notifications.v1";
const NOTIF_CAP = 50;

function readNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return [];
    // Drop corrupted entries so one bad record never breaks the bell.
    return parsed.filter((n) => n && typeof n.id === "string" && typeof n.title === "string");
  } catch {
    return [];
  }
}

function writeNotifications(items: AppNotification[]): void {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(items.slice(0, NOTIF_CAP)));
}

function pushNotification(n: Omit<AppNotification, "id" | "createdAt" | "read">): AppNotification {
  const created: AppNotification = {
    ...n,
    id: `n-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: orderTimestamp(),
    read: false,
  };
  writeNotifications([created, ...readNotifications()]);
  return created;
}

/** Target one user (buyer or supplier login id). */
export function notifyUser(
  userId: string,
  title: string,
  body: string,
  kind: AppNotification["kind"] = "info",
  link?: string
): AppNotification {
  return pushNotification({ userId, audienceRole: null, title, body, kind, link });
}

/** Broadcast to every signed-in user with a role (e.g. all suppliers). */
export function notifyRole(
  role: Role,
  title: string,
  body: string,
  kind: AppNotification["kind"] = "info",
  link?: string
): AppNotification {
  return pushNotification({ userId: "*", audienceRole: role, title, body, kind, link });
}

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    if (isApiEnabled()) return apiFetch<AppNotification[]>("/api/notifications");
    return readNotifications();
  },

  /** Bell feed: direct + role-broadcast items, newest first. */
  async listFor(userId: string, role: Role): Promise<AppNotification[]> {
    if (isApiEnabled()) return apiFetch<AppNotification[]>("/api/notifications");
    return readNotifications()
      .filter((n) => n.userId === userId || (n.userId === "*" && n.audienceRole === role))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async unreadFor(userId: string, role: Role): Promise<number> {
    if (isApiEnabled()) {
      const res = await apiFetch<{ count: number }>("/api/notifications/unread");
      return res.count;
    }
    return (await notificationsService.listFor(userId, role)).filter((n) => !n.read).length;
  },

  async markAllRead(userId: string, role: Role): Promise<void> {
    if (isApiEnabled()) {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      return;
    }
    writeNotifications(
      readNotifications().map((n) =>
        n.userId === userId || (n.userId === "*" && n.audienceRole === role)
          ? { ...n, read: true }
          : n
      )
    );
  },
};
