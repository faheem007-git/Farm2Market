import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../hooks/useToast";
import { Button, Input, Modal } from "../common/ui";
import type { Produce } from "../../types";

/**
 * Shared buyer action: matched listing → real order in `placed` state.
 * Callers render with key={produce.id} so form state resets per listing.
 */
export function RequestOrderModal({
  produce,
  matchId,
  defaultQuantityKg,
  defaultDelivery,
  onClose,
  onCreated,
}: {
  produce: Produce;
  matchId?: string;
  defaultQuantityKg: number;
  defaultDelivery: string;
  onClose: () => void;
  onCreated: (orderId: string) => void;
}) {
  const { user } = useAuth();
  const { create } = useOrders();
  const { push } = useToast();
  const [quantityKg, setQuantityKg] = useState<number>(defaultQuantityKg);
  const [expectedDelivery, setExpectedDelivery] = useState(defaultDelivery);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!user) return;
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    if (quantityKg > produce.quantityKg) {
      setError(`Only ${produce.quantityKg.toLocaleString("en-IN")} kg available.`);
      return;
    }
    if (!expectedDelivery) {
      setError("Expected delivery date is required.");
      return;
    }
    setSaving(true);
    try {
      const order = await create(user.id, user.company, {
        matchId,
        supplierId: produce.supplierId,
        supplierName: produce.supplierName,
        produceName: produce.name,
        grade: produce.grade,
        quantityKg: Math.round(quantityKg),
        pricePerKg: produce.pricePerKg,
        deliveryLocation: user.location,
        expectedDelivery,
      });
      push({
        title: "Request sent",
        body: `${order.id} · ${order.quantityKg.toLocaleString("en-IN")} kg ${order.produceName} from ${order.supplierName}`,
        kind: "success",
      });
      onCreated(order.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Request ${produce.name} from ${produce.supplierName}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3" noValidate>
        <p className="text-sm text-stone-600">
          Grade {produce.grade} · <strong>₹{produce.pricePerKg}/kg</strong> ·{" "}
          {produce.quantityKg.toLocaleString("en-IN")} kg available in {produce.location}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Quantity (kg) *"
            type="number"
            min={1}
            max={produce.quantityKg}
            value={quantityKg || ""}
            onChange={(e) => setQuantityKg(Number(e.target.value))}
          />
          <Input
            label="Expected delivery *"
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
          />
        </div>
        <p className="text-sm font-semibold">
          Estimated total: ₹{(Math.round(quantityKg || 0) * produce.pricePerKg).toLocaleString("en-IN")}
        </p>
        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Send request</Button>
        </div>
      </form>
    </Modal>
  );
}
