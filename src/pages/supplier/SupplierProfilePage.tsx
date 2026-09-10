import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useProduce } from "../../hooks/useProduce";
import { DEMO_SUPPLIERS } from "../../data/demoData";
import { isProduceSoldOut } from "../../types";
import { useLanguage } from "../../i18n/LanguageContext";
import { Button, Card, PageHeader } from "../../components/common/ui";

export default function SupplierProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { produce } = useProduce();
  const { orders } = useOrders();
  const navigate = useNavigate();

  const directory = DEMO_SUPPLIERS.find(
    (s) => user && (s.id === user.id || s.name === user.company)
  );
  const myOrders = useMemo(
    () => orders.filter((o) => user && (o.supplierId === user.id || o.supplierName === user.company)),
    [orders, user]
  );
  const availableKg = useMemo(
    () =>
      produce
        .filter((p) => user && (p.supplierId === user.id || p.supplierName === user.company) && !isProduceSoldOut(p))
        .reduce((n, p) => n + p.quantityKg, 0),
    [produce, user]
  );

  return (
    <div>
      <PageHeader title={t("prof.title")} subtitle={t("prof.subtitle")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">{user?.company}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("dl.contact")}</dt><dd className="font-medium">{directory?.contact ?? user?.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("dl.email")}</dt><dd className="font-medium">{user?.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("dl.phone")}</dt><dd className="font-medium">{directory?.phone ?? user?.phone ?? "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("dl.village")}</dt><dd className="font-medium">{directory?.village ?? user?.location}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("dl.farmSize")}</dt><dd className="font-medium">{directory?.farmSizeAcres ? `${directory.farmSizeAcres} acres` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("dl.rating")}</dt><dd className="font-medium">⭐ {directory?.rating ?? "—"} / 5</dd></div>
          </dl>
          <Button
            variant="secondary"
            className="mt-4 min-h-[44px]"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={16} /> {t("prof.signOut")}
          </Button>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">{t("prof.supplySummary")}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("prof.availableProduce")}</dt><dd className="font-medium">{availableKg.toLocaleString("en-IN")} kg</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("prof.ordersReceived")}</dt><dd className="font-medium">{myOrders.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">{t("prof.delivered")}</dt><dd className="font-medium">{myOrders.filter((o) => o.status === "delivered").length}</dd></div>
          </dl>
          <Link to="/supplier/produce" className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 hover:underline">
            {t("prod.title")} →
          </Link>
          <br />
          <Link to="/supplier/settings" className="mt-1 inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 hover:underline">
            {t("set.title")} →
          </Link>
        </Card>
      </div>
    </div>
  );
}
