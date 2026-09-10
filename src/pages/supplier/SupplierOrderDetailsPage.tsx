import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useOrders } from "../../hooks/useOrders";
import { useToast } from "../../hooks/useToast";
import { Button, Card, PageHeader, StatusIndicator } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { describeOrder } from "../../voice/describe";
import { SpeakButton } from "../../voice/SpeakButton";
import type { DictKey } from "../../i18n/en";
import { FarmerEmpty } from "../../components/domain/farmerFriendly";
import { OrderTimeline } from "../../components/domain/cards";
import { FarmerTracking } from "../../components/domain/farmerFriendly";
import { TrackingTimeline } from "../../components/domain/matchScore";
import { fulfillmentNext } from "../../utils/fulfillment";

export default function SupplierOrderDetailsPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { orders, setStatus } = useOrders();
  const { startThread } = useChat();
  const { push } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const found = orders.find((o) => o.id === orderId);
  // Suppliers open only their own orders from the shared book.
  const order =
    found && user && (found.supplierId === user.id || found.supplierName === user.company)
      ? found
      : undefined;

  const nextSteps = order ? fulfillmentNext(order.status) : [];

  /** Visible action labels (display only — statuses stay backend values). */
  const stepLabel: Record<string, DictKey> = {
    confirmed: "act.confirm",
    packed: "act.prepare",
    shipped: "act.dispatch",
    in_transit: "act.intransit",
    delivered: "act.delivered",
    cancelled: "act.cancel",
  };

  async function advance(to: Parameters<typeof setStatus>[1], toastTitle: string) {
    if (!order) return;
    setBusy(true);
    try {
      // Stored timeline notes stay in English (shared record); only UI labels translate.
      const note = `${to} — ${user?.company ?? "supplier"}`;
      const updated = await setStatus(order.id, to, note);
      if (!updated) throw new Error("Transition rejected by shared order book.");
      push({ title: toastTitle, body: order.id, kind: "success" });
    } catch (e) {
      push({ title: "Update failed", body: e instanceof Error ? e.message : "Try again.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function chat() {
    if (!user || !order) return;
    const conv = await startThread(
      order.buyerId,
      order.buyerCompany,
      user.id,
      user.company,
      `${order.id} · ${order.quantityKg.toLocaleString("en-IN")} kg ${order.produceName}`
    );
    navigate(`/supplier/chat/${conv.id}`);
  }

  if (!order) {
    return (
      <div>
        <PageHeader title={t("det.notFound")} />
        <FarmerEmpty emoji="📦" title={t("det.unknown")} body={t("det.otherSupplier")} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${order.id} · ${order.buyerCompany}`}
        subtitle={`${order.quantityKg.toLocaleString("en-IN")} kg ${order.produceName} → ${order.deliveryLocation}`}
        actions={
          <Button variant="secondary" onClick={chat}>
            <MessageCircle size={16} /> {t("nav.chat")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("det.summary")}</h2>
            <StatusIndicator status={order.status} />
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.buyer")}</dt><dd className="font-medium">{order.buyerCompany}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.product")}</dt><dd className="font-medium">{order.produceName} · Grade {order.grade}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.quantity")}</dt><dd className="font-medium">{order.quantityKg.toLocaleString("en-IN")} kg</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.price")}</dt><dd className="font-medium">₹{order.pricePerKg}/kg</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.total")}</dt><dd className="font-bold text-brand-800">₹{order.totalAmount.toLocaleString("en-IN")}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.destination")}</dt><dd className="font-medium">{order.deliveryLocation}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.orderDate")}</dt><dd className="font-medium">{order.createdAt}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.expected")}</dt><dd className="font-medium">{order.expectedDelivery}</dd></div>
          </dl>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t("det.fulfillment")}</h2>
            <SpeakButton context={`${t("ord.one")} ${order.id}`} text={describeOrder(order, lang)} />
          </div>
          <div className="mt-3"><FarmerTracking order={order} /></div>
          <div className="mt-4"><TrackingTimeline order={order} /></div>
          {nextSteps.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {nextSteps.map((s) => (
                <Button
                  key={s.status}
                  variant={s.terminal ? "danger" : "primary"}
                  className="min-h-[48px] text-base"
                  disabled={busy}
                  onClick={() => advance(s.status, t(stepLabel[s.status]))}
                >
                  {t(stepLabel[s.status])}
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">{t("det.noActions")} — {order.status}.</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">{t("det.history")}</h2>
          <OrderTimeline order={order} />
        </Card>
      </div>

      <p className="mt-4 text-sm">
        <Link to="/supplier/orders" className="font-medium text-brand-700 hover:underline">← {t("common.back")} {t("ord.title")}</Link>
      </p>
    </div>
  );
}
