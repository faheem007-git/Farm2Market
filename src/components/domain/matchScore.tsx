import { MATCH_WEIGHTS } from "../../utils/matching";
import { Badge, Card } from "../common/ui";
import type { MatchFactors, Order, OrderStatus } from "../../types";

const FACTOR_LABELS: { key: keyof MatchFactors; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "quality", label: "Quality" },
  { key: "price", label: "Price" },
  { key: "location", label: "Location" },
  { key: "availability", label: "Availability" },
];

function toneFor(score: number): "green" | "amber" | "red" {
  if (score >= 85) return "green";
  if (score >= 65) return "amber";
  return "red";
}

/** Reusable score ring + weighted factor breakdown. */
export function MatchScore({
  score,
  factors,
  compact = false,
}: {
  score: number;
  factors?: MatchFactors;
  compact?: boolean;
}) {
  const tone = toneFor(score);
  const ring =
    tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-red-700";
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0" role="img" aria-label={`${score}% match`}>
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
          <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="7" className="stroke-stone-200" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (score / 100) * circumference}
            className={tone === "green" ? "stroke-green-600" : tone === "amber" ? "stroke-amber-500" : "stroke-red-500"}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${ring}`}>
          {score}
        </span>
      </div>
      {!compact && factors && (
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {FACTOR_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <dt className="text-stone-500">
                {label} <span className="text-stone-400">· {MATCH_WEIGHTS[key]}%</span>
              </dt>
              <dd className="font-semibold text-stone-800">{factors[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function MatchFactorBars({ factors }: { factors: MatchFactors }) {
  return (
    <div className="space-y-2">
      {FACTOR_LABELS.map(({ key, label }) => (
        <div key={key}>
          <div className="flex justify-between text-xs">
            <span className="text-stone-600">
              {label} <span className="text-stone-400">(weight {MATCH_WEIGHTS[key]}%)</span>
            </span>
            <span className="font-semibold">{factors[key]}/100</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-stone-100">
            <div
              className={`h-1.5 rounded-full ${factors[key] >= 85 ? "bg-green-600" : factors[key] >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${factors[key]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Tracking ---------------- */

const TRACK_STAGES: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "requested", label: "Requested", statuses: ["placed"] },
  { key: "accepted", label: "Accepted", statuses: ["confirmed"] },
  { key: "preparing", label: "Preparing", statuses: ["packed"] },
  { key: "dispatched", label: "Dispatched", statuses: ["shipped", "in_transit"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
];

export function trackStageIndex(status: OrderStatus): number {
  const i = TRACK_STAGES.findIndex((s) => s.statuses.includes(status));
  return i === -1 ? 0 : i;
}

/** Shipment timeline with the current stage highlighted. Reads the same
 *  order records supplier actions will update in Request 4+. */
export function TrackingTimeline({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
        This order was cancelled. See timeline below for history.
      </Card>
    );
  }
  const current = trackStageIndex(order.status);
  return (
    <ol className="space-y-0" aria-label="Shipment tracking">
      {TRACK_STAGES.map((stage, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li key={stage.key} className="relative flex gap-3 pb-6 last:pb-0">
            {i < TRACK_STAGES.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-6 h-full w-0.5 ${done || isCurrent ? "bg-brand-600" : "bg-stone-200"}`}
              />
            )}
            <span
              aria-hidden
              className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? "bg-brand-600 text-white"
                  : isCurrent
                    ? "border-2 border-brand-600 bg-white text-brand-700"
                    : "border border-stone-300 bg-white text-stone-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div>
              <p className={`text-sm font-semibold ${isCurrent ? "text-brand-800" : done ? "text-stone-800" : "text-stone-400"}`}>
                {stage.label}
                {isCurrent && <Badge tone="green"><span className="ml-1">current</span></Badge>}
              </p>
              {isCurrent && order.timeline.length > 0 && (
                <p className="text-xs text-stone-500">
                  {order.timeline[order.timeline.length - 1].at}
                  {order.timeline[order.timeline.length - 1].note
                    ? ` · ${order.timeline[order.timeline.length - 1].note}`
                    : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
