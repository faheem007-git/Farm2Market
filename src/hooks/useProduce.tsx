import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getAllProduce, produceService } from "../services";
import type { ProduceInput } from "../services";
import type { Produce } from "../types";

interface ProduceContextValue {
  produce: Produce[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (
    supplierId: string,
    supplierName: string,
    input: ProduceInput
  ) => Promise<Produce>;
  update: (id: string, patch: Partial<Produce>) => Promise<Produce | null>;
  refreshSilent: () => Promise<void>;
}

const ProduceContext = createContext<ProduceContextValue | null>(null);

export function ProduceProvider({ children }: { children: ReactNode }) {
  // Initial state reads localStorage synchronously, so no mount effect needed.
  const [produce, setProduce] = useState<Produce[]>(() => getAllProduce());
  const [loading, setLoading] = useState(false);

  // Cross-tab sync: another tab (or role session) changed shared produce.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "agripulse.produce.v1") {
        void produceService.listProduce().then(setProduce);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const reload = useCallback(async () => {
    setProduce(await produceService.listProduce());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await reload();
    } finally {
      setLoading(false);
    }
  }, [reload]);

  const create = useCallback(
    async (supplierId: string, supplierName: string, input: ProduceInput) => {
      const created = await produceService.createProduce(supplierId, supplierName, input);
      await reload();
      return created;
    },
    [reload]
  );

  const update = useCallback(
    async (id: string, patch: Partial<Produce>) => {
      const updated = await produceService.updateProduce(id, patch);
      await reload();
      return updated;
    },
    [reload]
  );

  const value = useMemo<ProduceContextValue>(
    () => ({ produce, loading, refresh, create, update, refreshSilent: reload }),
    [produce, loading, refresh, create, update, reload]
  );

  return <ProduceContext.Provider value={value}>{children}</ProduceContext.Provider>;
}

export function useProduce(): ProduceContextValue {
  const ctx = useContext(ProduceContext);
  if (!ctx) throw new Error("useProduce must be used within ProduceProvider");
  return ctx;
}
