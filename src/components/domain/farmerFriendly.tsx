import { MATCH_WEIGHTS } from "../../utils/matching";
import { useLanguage } from "../../i18n/LanguageContext";
import type { DictKey } from "../../i18n/en";
import { Card, StatusIndicator } from "../common/ui";
import type { MatchFactors, Order, OrderStatus } from "../../types";
import type { ReactNode } from "react";

/** Crop emoji fallback when a listing emoji is unavailable. */
export function cropEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("onion")) return "🧅";
  if (n.includes("chilli") || n.includes("chili")) return "🌶️";
  if (n.includes("tomato")) return "🍅";
  if (n.includes("potato")) return "🥔";
  return "🌾";
}

/** Large crop visual: icon + name + big quantity, readable at a glance. */
export function CropStat({
  emoji,
  name,
  quantity,
  unit = "KG",
  sub,
}: {
  emoji: string;
  name: string;
  quantity: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-5xl" role="img" aria-label={name}>
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{name}</p>
        <p className="text-3xl font-bold leading-tight text-stone-900">
          {quantity} <span className="text-lg font-semibold text-stone-500">{unit}</span>
        </p>
        {sub && <p className="truncate text-sm font-medium text-brand-800">{sub}</p>}
      </div>
    </div>
  );
}

/** Friendly status: emoji + dot + the existing status label (values unchanged). */
const STATUS_META: Record<string, { emoji: string; dot: string; label: DictKey }> = {
  placed: { emoji: "⏳", dot: "bg-amber-400", label: "status.waiting" },
  confirmed: { emoji: "✅", dot: "bg-green-500", label: "status.accepted" },
  packed: { emoji: "📦", dot: "bg-blue-500", label: "status.preparing" },
  shipped: { emoji: "🚚", dot: "bg-orange-500", label: "status.ontheway" },
  in_transit: { emoji: "🚚", dot: "bg-orange-500", label: "status.ontheway" },
  delivered: { emoji: "🟢", dot: "bg-green-600", label: "status.delivered" },
  cancelled: { emoji: "❌", dot: "bg-red-500", label: "status.cancelled" },
  open: { emoji: "🟡", dot: "bg-amber-400", label: "status.open" },
  matched: { emoji: "🤝", dot: "bg-blue-500", label: "status.matched" },
  pending: { emoji: "⏳", dot: "bg-amber-400", label: "status.waiting" },
  fulfilled: { emoji: "✅", dot: "bg-green-600", label: "status.done" },
  closed: { emoji: "🔒", dot: "bg-stone-400", label: "status.closed" },
};

export function FarmerStatus({ status }: { status: string }) {
  const { t } = useLanguage();
  const meta = STATUS_META[status] ?? { emoji: "•", dot: "bg-stone-400", label: null as unknown as DictKey };
  const plain = meta.label ? t(meta.label) : status;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden>
        {meta.emoji} <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`} />
      </span>
      <StatusIndicator status={`${plain} · ${status.replace(/_/g, " ")}`} />
    </span>
  );
}

/** Simple label for order tracking stages (display only). */
export function stageLabel(status: OrderStatus): string {
  switch (status) {
    case "placed":
      return "⏳ Waiting";
    case "confirmed":
      return "✅ Accepted";
    case "packed":
      return "📦 Preparing";
    case "shipped":
    case "in_transit":
      return "🚚 On the Way";
    case "delivered":
      return "🟢 Delivered";
    case "cancelled":
      return "❌ Cancelled";
  }
}

/** Readable date for low-literacy users (display only, input values unchanged). */
export function friendlyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Visual empty state: big icon + short words + the caller's action button. */
export function FarmerEmpty({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="text-5xl" role="img" aria-label={title}>
        {emoji}
      </p>
      <p className="mt-3 text-lg font-bold uppercase tracking-wide text-stone-900">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

const CHECKLIST: { key: keyof MatchFactors; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "quality", label: "Quality" },
  { key: "price", label: "Price" },
  { key: "location", label: "Location" },
  { key: "availability", label: "Availability" },
];

/** ✓/✗ factor checklist (display only — scores come from the real engine). */
export function MatchChecklist({ factors }: { factors: MatchFactors }) {
  return (
    <ul className="grid grid-cols-2 gap-1 text-sm" aria-label="Match details">
      {CHECKLIST.map(({ key, label }) => {
        const pass = factors[key] >= 60;
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className={pass ? "text-green-700" : "text-red-600"}>
              {pass ? "✓" : "✗"}
            </span>
            <span className={pass ? "font-medium text-stone-800" : "text-stone-500"}>
              {label}
            </span>
            <span className="text-xs text-stone-400">{MATCH_WEIGHTS[key]}%</span>
          </li>
        );
      })}
    </ul>
  );
}

const FARMER_STAGES: { key: string; emoji: string; label: DictKey; statuses: OrderStatus[] }[] = [
  { key: "accepted", emoji: "✅", label: "track.accepted", statuses: ["placed", "confirmed"] },
  { key: "preparing", emoji: "📦", label: "track.preparing", statuses: ["packed"] },
  { key: "dispatched", emoji: "🚚", label: "track.dispatched", statuses: ["shipped", "in_transit"] },
  { key: "delivered", emoji: "🏠", label: "track.delivered", statuses: ["delivered"] },
];

/** Compact emoji fulfillment strip (display only — same order, same statuses). */
export function FarmerTracking({ order }: { order: Order }) {
  const { t } = useLanguage();
  if (order.status === "cancelled") {
    return <p className="text-lg font-bold text-red-700">❌ {t("status.cancelled")}</p>;
  }
  const current = Math.max(
    0,
    FARMER_STAGES.findIndex((s) => s.statuses.includes(order.status))
  );
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Order status">
      {FARMER_STAGES.map((stage, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li key={stage.key} className="flex items-center gap-1">
            <span
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${
                isCurrent
                  ? "border-brand-700 bg-brand-700 text-white"
                  : done
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-stone-200 bg-white text-stone-400"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span aria-hidden>{stage.emoji}</span> {t(stage.label)}
            </span>
            {i < FARMER_STAGES.length - 1 && (
              <span aria-hidden className="text-stone-300">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
