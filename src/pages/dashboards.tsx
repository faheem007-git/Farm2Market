import { useAuth } from "../hooks/useAuth";
import { DEMO_ORDERS, DEMO_REQUIREMENTS, DEMO_SUPPLIERS } from "../data/demoData";
import { BuyerRequestCard, SupplierCard } from "../components/domain/cards";
import { Card, PageHeader, StatusIndicator } from "../components/common/ui";

export function BuyerDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title={`Namaste, ${user?.company ?? "Buyer"}`} subtitle="Your demand, live supplier matches, and active orders." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-stone-500">Open requirement</p><p className="text-xl font-bold">5,000 kg Tomatoes</p><p className="text-sm text-stone-500">₹25–₹30 · Hyderabad · Sep 15</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-500">Best match</p><p className="text-xl font-bold">Ravi FPO · 94%</p><p className="text-sm text-stone-500">₹27/kg · Rajahmundry</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-500">Active order</p><p className="text-xl font-bold">ORD-1042</p><p className="mt-1"><StatusIndicator status={DEMO_ORDERS[0].status} /></p></Card>
      </div>
      <h2 className="mb-2 mt-6 font-semibold">Your requirement</h2>
      {DEMO_REQUIREMENTS.map((r) => <BuyerRequestCard key={r.id} requirement={r} />)}
      <h2 className="mb-2 mt-6 font-semibold">Verified suppliers</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {DEMO_SUPPLIERS.map((s) => <SupplierCard key={s.id} supplier={s} />)}
      </div>
    </div>
  );
}

export function SupplierDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title={`Namaste, ${user?.company ?? "Supplier"}`} subtitle="Your listings, incoming demand, and fulfilment." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-stone-500">Live listing</p><p className="text-xl font-bold">6,000 kg Tomatoes</p><p className="text-sm text-stone-500">Grade A · ₹27/kg · Rajahmundry</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-500">Open demand near you</p><p className="text-xl font-bold">ABC Foods · 5,000 kg</p><p className="text-sm text-stone-500">Hyderabad · Sep 15</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-500">Order in transit</p><p className="text-xl font-bold">ORD-1042 · 2,000 kg</p><p className="mt-1"><StatusIndicator status="in_transit" /></p></Card>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Platform overview" subtitle="Marketplace health (demo snapshot)." />
      <div className="grid gap-4 md:grid-cols-4">
        {[["Suppliers", "3 verified"], ["Buyers", "1 active"], ["Volume listed", "10,500 kg"], ["GMV in transit", "₹54,000"]].map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-xs text-stone-500">{k}</p><p className="text-lg font-bold">{v}</p></Card>
        ))}
      </div>
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle="Full experience ships in Requests 2–6. Foundation route is live." />
      <Card className="p-6 text-sm text-stone-500">This section is intentionally minimal in Request 1.</Card>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-5xl font-bold text-brand-800">404</p>
      <p className="mt-2 font-semibold">Page not found</p>
      <a href="/login" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">Back to sign in</a>
    </div>
  );
}
