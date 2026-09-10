import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Package, Sparkles, Truck, Wheat } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useProduce } from "../../hooks/useProduce";
import { useRequirements } from "../../hooks/useRequirements";
import { useSupplierResponses, supplierListingsFor } from "../../hooks/useSupplierResponses";
import { isProduceSoldOut } from "../../types";
import { scoreFactors, weightedScore } from "../../utils/matching";
import { Badge, Card, PageHeader } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { useNotifications } from "../../hooks/useNotifications";
import { describeDashboard } from "../../voice/describe";
import { SpeakButton } from "../../voice/SpeakButton";
import { CropStat, FarmerStatus, cropEmoji } from "../../components/domain/farmerFriendly";

export default function SupplierDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { unread } = useNotifications();
  const { produce } = useProduce();
  const { requirements } = useRequirements();
  const { orders } = useOrders();
  const { responses } = useSupplierResponses();

  const mine = useMemo(() => supplierListingsFor(user), [produce, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeListings = useMemo(() => mine.filter((p) => !isProduceSoldOut(p)), [mine]);
  const availableKg = useMemo(
    () => activeListings.reduce((n, p) => n + p.quantityKg, 0),
    [activeListings]
  );

  const openRequirements = useMemo(
    () => requirements.filter((r) => r.status === "open" || r.status === "matched"),
    [requirements]
  );
  const myResponses = useMemo(
    () => responses.filter((r) => !user || r.supplierId === user.id),
    [responses, user]
  );
  const newRequests = useMemo(
    () =>
      openRequirements.filter(
        (r) => !myResponses.some((x) => x.requirementId === r.id)
      ),
    [openRequirements, myResponses]
  );

  // Potential matches: my active listings scored against every open requirement.
  const potentialMatches = useMemo(() => {
    let count = 0;
    openRequirements.forEach((req) => {
      activeListings.forEach((p) => {
        if (p.name === req.produceName && weightedScore(scoreFactors(req, p)) >= 60) count += 1;
      });
    });
    return count;
  }, [openRequirements, activeListings]);

  const myOrders = useMemo(
    () =>
      orders.filter(
        (o) => user && (o.supplierId === user.id || o.supplierName === user.company)
      ),
    [orders, user]
  );
  const activeOrders = useMemo(
    () => myOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled"),
    [myOrders]
  );
  const recentlySold = useMemo(
    () => myOrders.filter((o) => o.status === "delivered").slice(0, 3),
    [myOrders]
  );
  const needsConfirmation = useMemo(
    () => myOrders.filter((o) => o.status === "placed").length,
    [myOrders]
  );
  const attentionCount = newRequests.length + needsConfirmation;

  // Top opportunities: best (requirement × listing) pairs, best-first.
  const opportunities = useMemo(() => {
    const pairs: { reqId: string; company: string; produce: string; qty: number; score: number }[] = [];
    openRequirements.forEach((req) => {
      activeListings
        .filter((p) => p.name === req.produceName)
        .forEach((p) => {
          pairs.push({
            reqId: req.id,
            company: req.buyerCompany,
            produce: req.produceName,
            qty: Math.min(req.quantityKg, p.quantityKg),
            score: weightedScore(scoreFactors(req, p)),
          });
        });
    });
    return pairs.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [openRequirements, activeListings]);

  const stats = [
    { label: t("stat.available"), value: `${availableKg.toLocaleString("en-IN")} kg`, icon: <Wheat size={18} />, to: "/supplier/produce" },
    { label: t("stat.requests"), value: String(newRequests.length), icon: <ClipboardList size={18} />, to: "/supplier/requests" },
    { label: t("stat.matches"), value: String(potentialMatches), icon: <Sparkles size={18} />, to: "/supplier/matches" },
    { label: t("stat.activeOrders"), value: String(activeOrders.length), icon: <Truck size={18} />, to: "/supplier/orders" },
  ];

  function emojiFor(produceName: string): string {
    return mine.find((p) => p.name === produceName)?.imageEmoji ?? cropEmoji(produceName);
  }

  return (
    <div>
      <PageHeader
        title={`Namaste, ${user?.company ?? "Supplier"}`}
        subtitle={t("dash.subtitle")}
        actions={
          <SpeakButton
            context={t("dash.subtitle")}
            text={describeDashboard(
              {
                produce: activeListings.map((p) => ({ name: p.name, quantityKg: p.quantityKg })),
                soldKg: recentlySold.reduce((n, o) => n + o.quantityKg, 0),
                soldTotal: recentlySold.reduce((n, o) => n + o.totalAmount, 0),
                newRequests: newRequests.length,
                activeOrders: activeOrders.length,
                unread,
              },
              lang
            )}
          />
        }
      />

      {attentionCount > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4" >
          <p className="text-base font-bold text-amber-900" role="status">
            🔔 {attentionCount} {t("dash.attention")}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {newRequests.length > 0 && `${newRequests.length} ${newRequests.length === 1 ? t("dash.newReqOne") : t("dash.newReq")}`}
            {newRequests.length > 0 && needsConfirmation > 0 && " · "}
            {needsConfirmation > 0 && `${needsConfirmation} ${needsConfirmation === 1 ? t("dash.waitConfirmOne") : t("dash.waitConfirm")}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {newRequests.length > 0 && (
              <Link to="/supplier/requests" className="inline-flex min-h-[44px] items-center rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
                {t("dash.seeRequests")}
              </Link>
            )}
            {needsConfirmation > 0 && (
              <Link to="/supplier/orders" className="inline-flex min-h-[44px] items-center rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:border-amber-500">
                {t("dash.confirmOrders")}
              </Link>
            )}
          </div>
        </Card>
      )}

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

      <h2 className="mb-2 mt-6 text-lg font-bold text-stone-900">🌾 {t("dash.myProduce")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeListings.map((p) => (
          <Link key={p.id} to="/supplier/produce">
            <Card className="p-5 transition hover:border-brand-400">
              <CropStat
                emoji={p.imageEmoji}
                name={p.name}
                quantity={p.quantityKg.toLocaleString("en-IN")}
                sub={`₹${p.pricePerKg} / KG · Grade ${p.grade}`}
              />
            </Card>
          </Link>
        ))}
        {activeListings.length === 0 && (
          <Card className="p-5">
            <p className="font-semibold">{t("dash.noProduce")}</p>
            <Link to="/supplier/produce" className="mt-1 inline-flex min-h-[44px] items-center font-medium text-brand-700 hover:underline">
              {t("dash.addFirst")} →
            </Link>
          </Card>
        )}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-bold text-stone-900">🛒 {t("dash.recentlySold")}</h2>
      {recentlySold.length === 0 ? (
        <Card className="p-5 text-sm text-stone-500">{t("dash.noDelivered")}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentlySold.map((o) => (
            <Link key={o.id} to={`/supplier/orders/${o.id}`}>
              <Card className="p-5 transition hover:border-brand-400">
                <CropStat
                  emoji={emojiFor(o.produceName)}
                  name={o.produceName}
                  quantity={o.quantityKg.toLocaleString("en-IN")}
                  sub={`₹${o.pricePerKg} / KG · ₹${(o.quantityKg * o.pricePerKg).toLocaleString("en-IN")} · ${o.buyerCompany}`}
                />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-lg font-bold text-stone-900">🤝 {t("dash.buyersInterested")}</h2>
      {newRequests.length === 0 ? (
        <Card className="p-5 text-sm text-stone-500">{t("dash.allCaughtUp")}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newRequests.slice(0, 3).map((r) => (
            <Link key={r.id} to={`/supplier/buyers/${r.buyerId}?requirement=${r.id}`}>
              <Card className="p-5 transition hover:border-brand-400">
                <CropStat
                  emoji={emojiFor(r.produceName)}
                  name={r.buyerCompany}
                  quantity={r.quantityKg.toLocaleString("en-IN")}
                  sub={`${r.produceName} · Grade ${r.grade}`}
                />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">{t("dash.recentRequests")}</h2>
            <Link to="/supplier/requests" className="inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 hover:underline">{t("common.viewAll")}</Link>
          </div>
          <ul className="mt-3 divide-y divide-stone-100">
            {newRequests.slice(0, 4).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-semibold">{r.buyerCompany} · {r.quantityKg.toLocaleString("en-IN")} kg {r.produceName}</p>
                  <p className="text-xs text-stone-500">Grade {r.grade} · ₹{r.priceMinPerKg}–₹{r.priceMaxPerKg}/kg · {r.deliveryLocation} · by {r.deliveryDeadline}</p>
                </div>
                <FarmerStatus status={r.status} />
              </li>
            ))}
            {newRequests.length === 0 && <li className="py-2 text-sm text-stone-500">{t("dash.allCaughtUp")}</li>}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">{t("dash.produceOverview")}</h2>
            <Link to="/supplier/produce" className="inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 hover:underline">{t("common.manage")}</Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {mine.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2"><Package size={14} className="text-stone-400" /> {p.name} · Grade {p.grade}</span>
                <span className="font-semibold">{isProduceSoldOut(p) ? <Badge tone="red">Sold out</Badge> : `${p.quantityKg.toLocaleString("en-IN")} kg`}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">📦 {t("dash.activeOrders")}</h2>
            <Link to="/supplier/orders" className="inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 hover:underline">{t("common.viewAll")}</Link>
          </div>
          <ul className="mt-3 divide-y divide-stone-100">
            {activeOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-semibold">{o.id} · {o.quantityKg.toLocaleString("en-IN")} kg {o.produceName}</p>
                  <p className="text-xs text-stone-500">{o.buyerCompany} → {o.deliveryLocation} · ETA {o.expectedDelivery}</p>
                </div>
                <FarmerStatus status={o.status} />
              </li>
            ))}
            {activeOrders.length === 0 && <li className="py-2 text-sm text-stone-500">{t("dash.noActiveOrders")}</li>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-stone-900">{t("dash.opportunities")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {opportunities.map((o) => (
              <li key={`${o.reqId}-${o.produce}`} className="flex items-center justify-between gap-2">
                <span>{o.company} · {o.qty.toLocaleString("en-IN")} kg {o.produce}</span>
                <Badge tone={o.score >= 85 ? "green" : "amber"}>{o.score}%</Badge>
              </li>
            ))}
            {opportunities.length === 0 && <li className="text-sm text-stone-500">{t("dash.noOverlap")}</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-4 p-4">
          <h2 className="font-semibold text-stone-900">{t("dash.recentActivity")}</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
          {myOrders.slice(0, 3).map((o) => {
            const last = o.timeline[o.timeline.length - 1];
            return (
              <li key={o.id}>
                <Badge>{o.id}</Badge> {last?.note ?? o.status} · {last?.at ?? ""}
              </li>
            );
          })}
          {myOrders.length === 0 && <li>{t("dash.noActivity")}</li>}
        </ul>
      </Card>
    </div>
  );
}
