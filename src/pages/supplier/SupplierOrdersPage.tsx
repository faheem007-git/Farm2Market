import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../hooks/useToast";
import { useLanguage } from "../../i18n/LanguageContext";
import { describeOrder } from "../../voice/describe";
import { SpeakButton } from "../../voice/SpeakButton";
import { Button, Card, Loading, PageHeader, Tabs } from "../../components/common/ui";
import { FarmerEmpty, FarmerStatus, cropEmoji } from "../../components/domain/farmerFriendly";
import type { Order, OrderStatus } from "../../types";

type Tab = "All" | "Accepted" | "Active" | "Completed";
const TABS: Tab[] = ["All", "Accepted", "Active", "Completed"];

const ACTIVE: OrderStatus[] = ["packed", "shipped", "in_transit"];

function tabOf(o: Order): Exclude<Tab, "All"> | "New" {
  if (o.status === "placed") return "New";
  if (o.status === "confirmed") return "Accepted";
  if (ACTIVE.includes(o.status)) return "Active";
  return "Completed";
}

export default function SupplierOrdersPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { orders, loading, setStatus } = useOrders();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const mine = useMemo(
    () => orders.filter((o) => user && (o.supplierId === user.id || o.supplierName === user.company)),
    [orders, user]
  );

  const counts = useMemo(() => {
    // New (placed) requests surface in the All tab action row, not in a tab.
    const c: Record<Tab, number> = { All: mine.length, Accepted: 0, Active: 0, Completed: 0 };
    mine.forEach((o) => {
      const t = tabOf(o);
      if (t !== "New") c[t] += 1;
    });
    return c;
  }, [mine]);

  const visible = useMemo(() => {
    if (tab === "All") return mine;
    return mine.filter((o) => tabOf(o) === tab);
  }, [mine, tab]);

  const needsConfirmation = useMemo(() => mine.filter((o) => o.status === "placed"), [mine]);

  async function confirm(id: string) {
    setBusyId(id);
    try {
      const updated = await setStatus(id, "confirmed", `Confirmed by ${user?.company ?? "supplier"}`);
      if (!updated) throw new Error("Transition rejected by shared order book.");
      push({ title: "Order confirmed", body: id, kind: "success" });
    } catch (e) {
      push({ title: "Confirm failed", body: e instanceof Error ? e.message : "Try again.", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const tabLabels: Record<Tab, string> = {
    All: t("ord.tabAll"),
    Accepted: t("ord.tabAccepted"),
    Active: t("ord.tabActive"),
    Completed: t("ord.tabCompleted"),
  };

  return (
    <div>
      <PageHeader title={t("ord.title")} subtitle={t("ord.subtitle")} />
      <Tabs
        tabs={TABS.map((key) => `${tabLabels[key]} (${counts[key]})`)}
        active={`${tabLabels[tab]} (${counts[tab]})`}
        onChange={(label) => {
          const found = TABS.find((key) => label.startsWith(tabLabels[key]));
          if (found) setTab(found);
        }}
      />

      {tab === "All" && needsConfirmation.length > 0 && (
        <Card className="mt-4 border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">🔔 {t("ord.needsConfirm")} ({needsConfirmation.length})</h2>
          <ul className="mt-2 space-y-2">
            {needsConfirmation.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><strong>{o.id}</strong> · {o.buyerCompany} · {o.quantityKg.toLocaleString("en-IN")} kg {o.produceName}</span>
                <Button disabled={busyId === o.id} className="min-h-[44px]" onClick={() => confirm(o.id)}>{t("common.confirmOrder")}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <Loading label={t("ord.loading")} />
        ) : visible.length === 0 ? (
          <FarmerEmpty
            emoji="📦"
            title={`${tabLabels[tab]} — ${t("ord.noneFound")}`}
            body={t("ord.acceptedBody")}
          />
        ) : (
          visible.map((o) => (
            <Link key={o.id} to={`/supplier/orders/${o.id}`} aria-label={`${t("ord.one")} ${o.id}`}>
              <Card className="p-5 transition hover:border-brand-400">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">📦 {t("ord.one")} {o.id}</p>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-5xl" role="img" aria-label={o.produceName}>{cropEmoji(o.produceName)}</span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{o.produceName} · Grade {o.grade} · {o.buyerCompany}</p>
                    <p className="text-3xl font-bold leading-tight text-stone-900">
                      {o.quantityKg.toLocaleString("en-IN")} <span className="text-lg font-semibold text-stone-500">KG</span>
                    </p>
                    <p className="text-sm font-bold text-brand-800">
                      ₹{o.pricePerKg} / KG · Total ₹{o.totalAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-stone-500">→ {o.deliveryLocation} · ETA {o.expectedDelivery}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <FarmerStatus status={o.status} />
                    <SpeakButton context={`${t("ord.one")} ${o.id}`} text={describeOrder(o, lang)} />
                  </span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
