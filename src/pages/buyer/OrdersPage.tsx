import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "../../hooks/useOrders";
import { useAuth } from "../../hooks/useAuth";
import { Card, EmptyState, Loading, PageHeader, StatusIndicator, Tabs } from "../../components/common/ui";
import type { Order, OrderStatus } from "../../types";

type Tab = "All" | "Requested" | "Accepted" | "Active" | "Completed";
const TABS: Tab[] = ["All", "Requested", "Accepted", "Active", "Completed"];

const ACTIVE: OrderStatus[] = ["packed", "shipped", "in_transit"];

function tabOf(o: Order): Exclude<Tab, "All"> {
  if (o.status === "placed") return "Requested";
  if (o.status === "confirmed") return "Accepted";
  if (ACTIVE.includes(o.status)) return "Active";
  return "Completed";
}

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("All");

  // Buyer workspace shows only this buyer's book; the shared store holds all buyers.
  const mine = useMemo(
    () => orders.filter((o) => !user || o.buyerId === user.id),
    [orders, user]
  );

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { All: mine.length, Requested: 0, Accepted: 0, Active: 0, Completed: 0 };
    mine.forEach((o) => {
      c[tabOf(o)] += 1;
    });
    return c;
  }, [mine]);

  const visible = useMemo(
    () => (tab === "All" ? mine : mine.filter((o) => tabOf(o) === tab)),
    [mine, tab]
  );

  return (
    <div>
      <PageHeader title="Orders" subtitle="Requests, fulfilment and delivery — one shared order book." />
      <Tabs tabs={TABS.map((t) => `${t} (${counts[t]})`)} active={`${tab} (${counts[tab]})`} onChange={(t) => setTab(t.slice(0, t.lastIndexOf(" (")) as Tab)} />
      <div className="mt-4 space-y-3">
        {loading ? (
          <Loading label="Loading orders…" />
        ) : visible.length === 0 ? (
          <EmptyState title={`No ${tab.toLowerCase()} orders`} body="Request an order from Matches or Supplier Details." />
        ) : (
          visible.map((o) => (
            <Link key={o.id} to={`/buyer/orders/${o.id}`}>
              <Card className="p-4 transition hover:border-brand-400">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-900">
                      {o.id} · {o.quantityKg.toLocaleString("en-IN")} kg {o.produceName}
                    </h3>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {o.supplierName} → {o.deliveryLocation} · ordered {o.createdAt} · ETA {o.expectedDelivery}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-bold text-brand-800">₹{o.pricePerKg}/kg</span>
                      <span className="text-stone-500"> · Total ₹{o.totalAmount.toLocaleString("en-IN")}</span>
                    </p>
                  </div>
                  <StatusIndicator status={o.status} />
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
