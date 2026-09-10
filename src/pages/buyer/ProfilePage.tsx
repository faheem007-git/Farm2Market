import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useRequirements } from "../../hooks/useRequirements";
import { Button, Card, PageHeader } from "../../components/common/ui";

const PREF_KEY = "agripulse.buyer-prefs.v1";

function readPrefs(): { matches: boolean; orders: boolean; prices: boolean } {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to defaults */
  }
  return { matches: true, orders: true, prices: false };
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { requirements } = useRequirements();
  const { orders } = useOrders();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(readPrefs);

  const myRequirements = !user ? requirements : requirements.filter((r) => r.buyerId === user.id);
  const myOrders = !user ? orders : orders.filter((o) => o.buyerId === user.id);
  const myActiveCount = myRequirements.filter((r) => r.status === "open" || r.status === "matched").length;

  const monthlyVolumeKg = myRequirements
    .filter((r) => r.status === "open" || r.status === "matched")
    .reduce((n, r) => n + r.quantityKg, 0);
  const completedOrders = myOrders.filter((o) => o.status === "delivered").length;

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Company, procurement and account preferences."
        actions={
          <Link to="/buyer/settings" className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-brand-600 hover:text-brand-800">
            <Settings size={16} /> Settings
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">{user?.name}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Company</dt><dd className="font-medium">{user?.company}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Location</dt><dd className="font-medium">{user?.location}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Phone</dt><dd className="font-medium">{user?.phone ?? "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Role</dt><dd className="font-medium capitalize">{user?.role}</dd></div>
          </dl>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={16} /> Sign out
          </Button>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">Procurement</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Open demand</dt><dd className="font-medium">{monthlyVolumeKg.toLocaleString("en-IN")} kg</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Active requirements</dt><dd className="font-medium">{myActiveCount}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Orders placed</dt><dd className="font-medium">{myOrders.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Completed</dt><dd className="font-medium">{completedOrders}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Buying hub</dt><dd className="font-medium">{user?.location}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">Notifications</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(
              [
                ["matches", "New match alerts"],
                ["orders", "Order status updates"],
                ["prices", "Daily price digest"],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <span>{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={label}
                  onClick={() => toggle(key)}
                  className={`relative h-6 w-11 rounded-full transition ${prefs[key] ? "bg-brand-600" : "bg-stone-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
