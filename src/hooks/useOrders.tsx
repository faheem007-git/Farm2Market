import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getAllOrders, ordersService } from "../services";
import type { OrderInput } from "../services";
import type { Order } from "../types";

interface OrdersContextValue {
  orders: Order[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (
    buyerId: string,
    buyerCompany: string,
    input: OrderInput
  ) => Promise<Order>;
  setStatus: (id: string, status: Order["status"], note?: string) => Promise<Order | null>;
  activeCount: number;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  // Initial state reads localStorage synchronously, so no mount effect needed.

  // Cross-tab sync: another tab (or role session) changed the shared order book.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "agripulse.orders.v1") {
        void ordersService.listOrders().then(setOrders);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const [orders, setOrders] = useState<Order[]>(() => getAllOrders());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await ordersService.listOrders());
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (buyerId: string, buyerCompany: string, input: OrderInput) => {
      const created = await ordersService.createOrder(buyerId, buyerCompany, input);
      setOrders(await ordersService.listOrders());
      return created;
    },
    []
  );

  const setStatus = useCallback(
    async (id: string, status: Order["status"], note?: string) => {
      const updated = await ordersService.updateOrderStatus(id, status, note);
      setOrders(await ordersService.listOrders());
      return updated;
    },
    []
  );

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      loading,
      refresh,
      create,
      setStatus,
      activeCount: orders.filter(
        (o) => o.status !== "delivered" && o.status !== "cancelled"
      ).length,
    }),
    [orders, loading, refresh, create, setStatus]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
