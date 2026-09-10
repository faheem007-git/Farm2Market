import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getAllProduce,
  getAllRequirements,
  ordersService,
  supplierResponseService,
} from "../services";
import type { SupplierResponse, SupplierResponseStatus } from "../services";
import { scoreFactors, weightedScore } from "../utils/matching";
import type { Order, User } from "../types";

export function supplierListingsFor(user: User | null) {
  if (!user) return [];
  return getAllProduce().filter(
    (p) => p.supplierId === user.id || p.supplierName === user.company
  );
}

interface SupplierResponsesContextValue {
  responses: SupplierResponse[];
  refresh: () => Promise<void>;
  responseFor: (requirementId: string, supplierId: string) => SupplierResponse | null;
  respond: (requirementId: string, user: User) => Promise<void>;
  accept: (requirementId: string, user: User) => Promise<Order>;
  reject: (requirementId: string, user: User) => Promise<void>;
}

const Ctx = createContext<SupplierResponsesContextValue | null>(null);

export function SupplierResponsesProvider({ children }: { children: ReactNode }) {
  const [responses, setResponses] = useState<SupplierResponse[]>(() => {
    try {
      const raw = localStorage.getItem("agripulse.supplier-responses.v1");
      const parsed = raw ? (JSON.parse(raw) as SupplierResponse[]) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((r) => r && typeof r.requirementId === "string");
    } catch {
      return [];
    }
  });

  const refresh = useCallback(async () => {
    setResponses(await supplierResponseService.list());
  }, []);

  const responseFor = useCallback(
    (requirementId: string, supplierId: string) =>
      responses.find((r) => r.requirementId === requirementId && r.supplierId === supplierId) ?? null,
    [responses]
  );

  const respond = useCallback(async (requirementId: string, user: User) => {
    await supplierResponseService.set(requirementId, user.id, user.company, "responded");
    setResponses(await supplierResponseService.list());
  }, []);

  const reject = useCallback(async (requirementId: string, user: User) => {
    await supplierResponseService.set(requirementId, user.id, user.company, "rejected");
    setResponses(await supplierResponseService.list());
  }, []);

  /**
   * Accept a buyer requirement: records the response AND books a real order
   * (confirmed) into the shared order book the buyer already watches.
   */
  const accept = useCallback(async (requirementId: string, user: User) => {
    const req = getAllRequirements().find((r) => r.id === requirementId);
    if (!req) throw new Error("Requirement not found.");
    const candidates = getAllProduce()
      .filter(
        (p) =>
          (p.supplierId === user.id || p.supplierName === user.company) &&
          p.name === req.produceName &&
          p.quantityKg > 0 &&
          p.status !== "sold_out"
      )
      .map((p) => ({ produce: p, score: weightedScore(scoreFactors(req, p)) }))
      .sort((a, b) => b.score - a.score);
    if (candidates.length === 0) {
      throw new Error("No active produce available to fulfil this requirement.");
    }
    const best = candidates[0].produce;
    const quantityKg = Math.min(req.quantityKg, best.quantityKg);
    const placed = await ordersService.createOrder(req.buyerId, req.buyerCompany, {
      supplierId: best.supplierId,
      supplierName: best.supplierName,
      produceName: best.name,
      grade: best.grade,
      quantityKg,
      pricePerKg: best.pricePerKg,
      deliveryLocation: req.deliveryLocation,
      expectedDelivery: req.deliveryDeadline,
    });
    const confirmed =
      (await ordersService.updateOrderStatus(
        placed.id,
        "confirmed",
        `Accepted by ${user.company} against ${req.id}`
      )) ?? placed;
    await supplierResponseService.set(requirementId, user.id, user.company, "accepted");
    setResponses(await supplierResponseService.list());
    return confirmed;
  }, []);

  const value = useMemo<SupplierResponsesContextValue>(
    () => ({ responses, refresh, responseFor, respond, accept, reject }),
    [responses, refresh, responseFor, respond, accept, reject]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSupplierResponses(): SupplierResponsesContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSupplierResponses must be used within SupplierResponsesProvider");
  return ctx;
}

export type { SupplierResponse, SupplierResponseStatus };
