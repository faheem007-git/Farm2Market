import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ClipboardList, Home, LogOut, MessageCircle, Package, Search, Sparkles, Sprout, User, Wheat } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { useLanguage } from "../../i18n/LanguageContext";
import { LanguageSelector } from "../../i18n/LanguageSelector";
import { Button } from "../common/ui";

function linkClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-brand-50 hover:text-brand-800"}`;
}

interface NavEntry {
  to: string;
  label: string;
  end: boolean;
  icon?: ReactNode;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();
  const { items, unread, refresh, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  // Live bell: direct + role-broadcast notifications for this signed-in user.
  useEffect(() => {
    if (user && role) void refresh(user.id, role);
  }, [user, role, refresh, location.pathname]);

  const buyerLinks: NavEntry[] = [
    { to: "/buyer", label: "Home", end: true },
    { to: "/buyer/discover", label: "Discover", end: false },
    { to: "/buyer/requirements", label: "Requirements", end: false },
    { to: "/buyer/matches", label: "Matches", end: false },
    { to: "/buyer/orders", label: "Orders", end: false },
    { to: "/buyer/chat", label: "Chat", end: false },
    { to: "/buyer/profile", label: "Profile", end: false },
  ];
  const supplierLinks: NavEntry[] = [
    { to: "/supplier", label: t("nav.home"), end: true, icon: <Home size={15} aria-hidden /> },
    { to: "/supplier/produce", label: t("nav.produce"), end: false, icon: <Wheat size={15} aria-hidden /> },
    { to: "/supplier/requests", label: t("nav.requests"), end: false, icon: <ClipboardList size={15} aria-hidden /> },
    { to: "/supplier/matches", label: t("nav.matches"), end: false, icon: <Sparkles size={15} aria-hidden /> },
    { to: "/supplier/orders", label: t("nav.orders"), end: false, icon: <Package size={15} aria-hidden /> },
    { to: "/supplier/chat", label: t("nav.chat"), end: false, icon: <MessageCircle size={15} aria-hidden /> },
    { to: "/supplier/profile", label: t("nav.profile"), end: false, icon: <User size={15} aria-hidden /> },
  ];
  const adminLinks: NavEntry[] = [{ to: "/admin", label: "Overview", end: true }];
  const links = role === "buyer" ? buyerLinks : role === "supplier" ? supplierLinks : adminLinks;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/buyer/discover?q=${encodeURIComponent(q)}` : "/buyer/discover");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-700 text-white">
              <Sprout size={20} />
            </span>
            <div>
              <p className="text-base font-bold leading-tight text-stone-900">AgriPulse</p>
              <p className="text-xs leading-tight text-stone-500">Farmer → Buyer Exchange</p>
            </div>
          </div>
          {role === "buyer" && (
            <form onSubmit={onSearch} className="order-3 flex w-full min-w-0 items-center gap-2 md:order-2 md:w-auto md:flex-1" role="search">
              <div className="relative w-full md:max-w-sm">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tomatoes, FPOs, locations…"
                  aria-label="Search marketplace"
                  className="w-full rounded-md border border-stone-300 bg-stone-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 focus:bg-white"
                />
              </div>
            </form>
          )}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}><span className="inline-flex items-center gap-1.5">{l.icon}{l.label}</span></NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {role === "supplier" && <LanguageSelector />}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications((s) => !s);
                  if (!showNotifications) void markAllRead();
                }}
                className="relative rounded-md border border-stone-300 bg-white p-2 text-stone-600 hover:border-brand-600 hover:text-brand-800"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Notifications</p>
                  {items.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-stone-500">You are all caught up.</p>
                  ) : (
                    <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
                      {items.slice(0, 15).map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className="block w-full px-2 py-2 text-left hover:bg-brand-50"
                            onClick={() => {
                              setShowNotifications(false);
                              if (n.link) navigate(n.link);
                            }}
                          >
                            <p className="text-sm font-semibold text-stone-800">
                              {!n.read && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                              {n.title}
                            </p>
                            <p className="text-xs text-stone-500">{n.body}</p>
                            <p className="text-[11px] text-stone-400">{n.createdAt}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(role === "buyer" ? "/buyer/profile" : "/login")}
              className="hidden text-right sm:block"
              aria-label="Profile"
            >
              <p className="text-sm font-semibold text-stone-800">{user?.name}</p>
              <p className="text-xs text-stone-500">{user?.company} · {role}</p>
            </button>
            <Button
              variant="secondary"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Primary mobile">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}><span className="inline-flex items-center gap-1.5 whitespace-nowrap">{l.icon}{l.label}</span></NavLink>
            ))}
          </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6" key={location.pathname}>{children}</main>
    </div>
  );
}
