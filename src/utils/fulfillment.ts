import { ORDER_TRANSITIONS } from "../services";
import type { Order } from "../types";

/** Supplier-facing labels for each forward transition. */
const STEP_LABELS: Partial<Record<Order["status"], string>> = {
  confirmed: "Confirm order",
  packed: "Start preparing",
  shipped: "Dispatch",
  in_transit: "Mark in transit",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

/**
 * Valid next steps from a status, in fulfillment order with cancel last.
 * The UI only offers these — backward transitions are impossible to trigger.
 */
export function fulfillmentNext(
  status: Order["status"]
): { status: Order["status"]; label: string; terminal?: boolean }[] {
  const next = ORDER_TRANSITIONS[status].filter((s) => s !== "cancelled");
  const steps: { status: Order["status"]; label: string; terminal?: boolean }[] = next.map((s) => ({
    status: s,
    label: STEP_LABELS[s] ?? s,
  }));
  if (ORDER_TRANSITIONS[status].includes("cancelled")) {
    steps.push({ status: "cancelled", label: "Cancel order", terminal: true });
  }
  return steps;
}
