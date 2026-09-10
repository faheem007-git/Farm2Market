import { Badge, Card, StatusIndicator } from "../common/ui";
import type { Match, Order, Produce, Requirement } from "../../types";

export function ProduceCard({ produce }: { produce: Produce }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-3xl" aria-hidden>{produce.imageEmoji}</div>
        <Badge tone="green">Grade {produce.grade}</Badge>
      </div>
      <h3 className="mt-2 font-semibold text-stone-900">{produce.name}</h3>
      <p className="text-sm text-stone-500">{produce.supplierName} · {produce.location}</p>
      <p className="mt-2 text-sm">
        <span className="font-bold text-brand-800">₹{produce.pricePerKg}/kg</span>
        <span className="text-stone-500"> · {produce.quantityKg.toLocaleString("en-IN")} kg</span>
      </p>
    </Card>
  );
}

export function SupplierCard({ supplier }: { supplier: { name: string; location: string; rating: number; verified: boolean; produce: string } }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-900">{supplier.name}</h3>
        {supplier.verified && <Badge tone="green">Verified</Badge>}
      </div>
      <p className="mt-1 text-sm text-stone-500">{supplier.location} · ⭐ {supplier.rating}</p>
      <p className="mt-2 text-sm text-stone-700">{supplier.produce}</p>
    </Card>
  );
}

export function BuyerRequestCard({ requirement }: { requirement: Requirement }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-900">{requirement.quantityKg.toLocaleString("en-IN")} kg {requirement.produceName}</h3>
        <StatusIndicator status={requirement.status} />
      </div>
      <p className="mt-1 text-sm text-stone-500">{requirement.buyerCompany} → {requirement.deliveryLocation} · by {requirement.deliveryDeadline}</p>
      <p className="mt-2 text-sm font-medium text-brand-800">₹{requirement.priceMinPerKg}–₹{requirement.priceMaxPerKg}/kg · Grade {requirement.grade}</p>
    </Card>
  );
}

export function MatchScoreCard({ match }: { match: Match }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-900">{match.supplierName}</span>
        <Badge tone={match.score >= 85 ? "green" : "amber"}>{match.score}% match</Badge>
      </div>
      <p className="mt-1 text-sm text-stone-500">₹{match.pricePerKg}/kg · {match.quantityKg.toLocaleString("en-IN")} kg · {match.distanceKm} km</p>
      <ul className="mt-2 list-disc pl-5 text-xs text-stone-600">
        {match.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </Card>
  );
}

export function OrderTimeline({ order }: { order: Order }) {
  return (
    <ol className="mt-3 space-y-3 border-l-2 border-brand-100 pl-4">
      {order.timeline.map((t) => (
        <li key={t.at + t.status}>
          <p className="text-sm font-semibold capitalize text-stone-800">{t.status.replace(/_/g, " ")}</p>
          <p className="text-xs text-stone-500">{t.at}{t.note ? ` · ${t.note}` : ""}</p>
        </li>
      ))}
      <li>
        <StatusIndicator status={order.status} />
      </li>
    </ol>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: { id: number; title: string; body?: string; kind: string }[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] space-y-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="w-80 max-w-full rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{t.title}</p>
            <button type="button" onClick={() => onDismiss(t.id)} className="text-stone-400 hover:text-stone-700" aria-label="Dismiss">✕</button>
          </div>
          {t.body && <p className="mt-0.5 text-xs text-stone-500">{t.body}</p>}
        </div>
      ))}
    </div>
  );
}
