import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, PackageCheck, Search, Sparkles, Truck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useRequirements } from "../../hooks/useRequirements";
import { useOrders } from "../../hooks/useOrders";
import { matchingService } from "../../services";
import { useProduce } from "../../hooks/useProduce";
import { Badge, Card, PageHeader, StatusIndicator } from "../../components/common/ui";
import { ProduceCard } from "../../components/domain/cards";
import type { Match } from "../../types";

/** Past-season baseline shown alongside live demo orders (labelled). */
const PAST_SEASON_COMPLETED = 9;

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { requirements } = useRequirements();
  const { orders } = useOrders();
  const { produce: allProduce } = useProduce();
  const [newMatches, setNewMatches] = useState(0);
  const [bestMatch, setBestMatch] = useState<Match | null>(null);

  // Buyer home scopes to this buyer's book; the shared store also holds other buyers.
  const myRequirements = useMemo(
    () => requirements.filter((r) => !user || r.buyerId === user.id),
    [requirements, user]
  );
  const myOrders = useMemo(
    () => orders.filter((o) => !user || o.buyerId === user.id),
    [orders, user]
  );
  const myActiveCount = useMemo(
    () => myRequirements.filter((r) => r.status === "open" || r.status === "matched").length,
    [myRequirements]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const lists = await Promise.all(
        myRequirements
          .filter((r) => r.status === "open" || r.status === "matched")
          .map((r) => matchingService.findMatches(r.id))
      );
      if (!cancelled) {
        const all = lists.flat();
        setNewMatches(all.length);
        setBestMatch(all.length > 0 ? all.reduce((a, b) => (b.score > a.score ? b : a)) : null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [myRequirements]);

  const activeOrders = useMemo(
    () => myOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled"),
    [myOrders]
  );
  const completedLive = useMemo(
    () => myOrders.filter((o) => o.status === "delivered").length,
    [myOrders]
  );
  const recommended = useMemo(
    () => [...allProduce].sort((a, b) => `${a.grade}-${a.pricePerKg}`.localeCompare(`${b.grade}-${b.pricePerKg}`)).slice(0, 3),
    [allProduce]
  );
  const totalVolumeKg = useMemo(
    () => myRequirements.filter((r) => r.status === "open" || r.status === "matched").reduce((n, r) => n + r.quantityKg, 0),
    [myRequirements]
  );

  const stats = [
    { label: "Active Requirements", value: String(myActiveCount), icon: <ClipboardList size={18} />, to: "/buyer/requirements" },
    { label: "New Matches", value: String(newMatches), icon: <Sparkles size={18} />, to: "/buyer/matches" },
    { label: "Active Orders", value: String(activeOrders.length), icon: <Truck size={18} />, to: "/buyer/orders" },
    { label: "Completed Orders", value: String(completedLive + PAST_SEASON_COMPLETED), icon: <PackageCheck size={18} />, to: "/buyer/orders" },
  ];

  return (
    <div>
      <PageHeader
        title={`Namaste, ${user?.company ?? "Buyer"}`}
        subtitle="Procurement at a glance — demand, matches and inbound supply."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="p-4 transition hover:border-brand-400">
              <div className="flex items-center justify-between">
                <span className="text-brand-700">{s.icon}</span>
                <ArrowRight size={14} className="text-stone-300" />
              </div>
              <p className="mt-2 text-2xl font-bold text-stone-900">{s.value}</p>
              <p className="text-sm text-stone-500">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/buyer/discover" className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
          <Search size={16} /> Discover produce
        </Link>
        <Link to="/buyer/requirements" className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-brand-600 hover:text-brand-800">
          <ClipboardList size={16} /> Post requirement
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold text-stone-900">Active orders</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {activeOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-semibold">{o.id} · {o.quantityKg.toLocaleString("en-IN")} kg {o.produceName}</p>
                  <p className="text-xs text-stone-500">{o.supplierName} → {o.deliveryLocation} · ETA {o.expectedDelivery}</p>
                </div>
                <StatusIndicator status={o.status} />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold text-stone-900">Procurement overview</h2>
          <p className="mt-2 text-sm text-stone-500">Open demand volume</p>
          <p className="text-2xl font-bold text-brand-800">{totalVolumeKg.toLocaleString("en-IN")} kg</p>
          <div className="mt-3 space-y-2 text-sm">
            {["Tomatoes", "Onions", "Green Chillies"].map((p) => {
              const vol = myRequirements
                .filter((r) => r.produceName === p && (r.status === "open" || r.status === "matched"))
                .reduce((n, r) => n + r.quantityKg, 0);
              const pct = totalVolumeKg ? Math.round((vol / totalVolumeKg) * 100) : 0;
              return (
                <div key={p}>
                  <div className="flex justify-between text-xs"><span>{p}</span><span>{vol.toLocaleString("en-IN")} kg</span></div>
                  <div className="mt-1 h-2 rounded-full bg-stone-100">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 font-semibold text-stone-900">Recommended produce</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommended.map((p) => <ProduceCard key={p.id} produce={p} />)}
      </div>

      <Card className="mt-6 p-4">
        <h2 className="font-semibold text-stone-900">Recent activity</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
          {bestMatch && (
            <li><Badge tone="blue">Match</Badge> {bestMatch.supplierName} {bestMatch.score}% vs your tomato requirement</li>
          )}
          <li><Badge>Order</Badge> ORD-1042 shipped from Rajahmundry · ETA Sep 14</li>
          <li><Badge tone="green">Order</Badge> ORD-1043 confirmed by Green Farms (3,000 kg Onions)</li>
        </ul>
      </Card>
    </div>
  );
}
