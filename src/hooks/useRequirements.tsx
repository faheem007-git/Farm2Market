import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getAllRequirements,
  requirementsService,
} from "../services";
import type { RequirementInput } from "../services";
import type { Requirement } from "../types";

interface RequirementsContextValue {
  requirements: Requirement[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (
    buyerId: string,
    buyerCompany: string,
    input: RequirementInput
  ) => Promise<Requirement>;
  setStatus: (id: string, status: Requirement["status"]) => Promise<void>;
  activeCount: number;
}

const RequirementsContext = createContext<RequirementsContextValue | null>(null);

export function RequirementsProvider({ children }: { children: ReactNode }) {
  const [requirements, setRequirements] = useState<Requirement[]>(() =>
    getAllRequirements()
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRequirements(await requirementsService.listRequirements());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial state reads localStorage synchronously, so no mount effect needed.

  // Cross-tab sync: another tab (or role session) changed shared requirements.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "agripulse.requirements.v1") {
        void requirementsService.listRequirements().then(setRequirements);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const create = useCallback(
    async (buyerId: string, buyerCompany: string, input: RequirementInput) => {
      const created = await requirementsService.createRequirement(
        buyerId,
        buyerCompany,
        input
      );
      setRequirements(await requirementsService.listRequirements());
      return created;
    },
    []
  );

  const setStatus = useCallback(
    async (id: string, status: Requirement["status"]) => {
      await requirementsService.updateRequirementStatus(id, status);
      setRequirements(await requirementsService.listRequirements());
    },
    []
  );

  const value = useMemo<RequirementsContextValue>(
    () => ({
      requirements,
      loading,
      refresh,
      create,
      setStatus,
      activeCount: requirements.filter(
        (r) => r.status === "open" || r.status === "matched"
      ).length,
    }),
    [requirements, loading, refresh, create, setStatus]
  );

  return (
    <RequirementsContext.Provider value={value}>
      {children}
    </RequirementsContext.Provider>
  );
}

export function useRequirements(): RequirementsContextValue {
  const ctx = useContext(RequirementsContext);
  if (!ctx)
    throw new Error("useRequirements must be used within RequirementsProvider");
  return ctx;
}
