import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useProduce } from "../../hooks/useProduce";
import { useRequirements } from "../../hooks/useRequirements";
import { useSupplierResponses, supplierListingsFor } from "../../hooks/useSupplierResponses";
import type { SupplierResponseStatus } from "../../hooks/useSupplierResponses";
import { useToast } from "../../hooks/useToast";
import { DEMO_BUYERS } from "../../data/demoData";
import { Badge, Button, Card, Loading, PageHeader, Tabs } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { describeRequirement } from "../../voice/describe";
import { SpeakButton } from "../../voice/SpeakButton";
import { FarmerEmpty, FarmerStatus, cropEmoji, friendlyDate } from "../../components/domain/farmerFriendly";
import { scoreFactors, weightedScore } from "../../utils/matching";
import type { Requirement } from "../../types";

type Tab = "New" | "Responded" | "Accepted" | "Rejected";
const TABS: Tab[] = ["New", "Responded", "Accepted", "Rejected"];

const TAB_STATUS: Record<Exclude<Tab, "New">, SupplierResponseStatus> = {
  Responded: "responded",
  Accepted: "accepted",
  Rejected: "rejected",
};

export default function BuyerRequestsPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { requirements, loading } = useRequirements();
  const { produce } = useProduce();
  const { responses, respond, accept, reject } = useSupplierResponses();
  const { startThread } = useChat();
  const { push } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("New");
  const [busyId, setBusyId] = useState<string | null>(null);

  const mine = useMemo(() => supplierListingsFor(user), [produce, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const myResponses = useMemo(
    () => responses.filter((r) => !user || r.supplierId === user.id),
    [responses, user]
  );
  const openRequirements = useMemo(
    () => requirements.filter((r) => r.status === "open" || r.status === "matched"),
    [requirements]
  );

  function responseFor(reqId: string) {
    return myResponses.find((r) => r.requirementId === reqId) ?? null;
  }

  /** Best score of my listings against a requirement (null when no overlap). */
  function bestScore(req: Requirement): number | null {
    const scores = mine
      .filter((p) => p.name === req.produceName && p.quantityKg > 0 && p.status !== "sold_out")
      .map((p) => weightedScore(scoreFactors(req, p)));
    return scores.length > 0 ? Math.max(...scores) : null;
  }

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { New: 0, Responded: 0, Accepted: 0, Rejected: 0 };
    openRequirements.forEach((r) => {
      const resp = responseFor(r.id);
      if (!resp) c.New += 1;
      else if (resp.status === "responded") c.Responded += 1;
      else if (resp.status === "accepted") c.Accepted += 1;
      else c.Rejected += 1;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequirements, myResponses]);

  const visible = useMemo(() => {
    if (tab === "New") return openRequirements.filter((r) => !responseFor(r.id));
    const want = TAB_STATUS[tab];
    return openRequirements.filter((r) => responseFor(r.id)?.status === want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequirements, myResponses, tab]);

  async function run(id: string, fn: () => Promise<unknown>, done: string) {
    if (!user) return;
    setBusyId(id);
    try {
      await fn();
      push({ title: done, kind: "success" });
    } catch (e) {
      push({ title: "Action failed", body: e instanceof Error ? e.message : "Try again.", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function chatWith(req: Requirement) {
    if (!user) return;
    const conv = await startThread(
      req.buyerId,
      req.buyerCompany,
      user.id,
      user.company,
      `${req.quantityKg.toLocaleString("en-IN")} kg ${req.produceName} · Grade ${req.grade}`
    );
    navigate(`/supplier/chat/${conv.id}`);
  }

  async function acceptAndNotify(req: Requirement) {
    if (!user) return;
    setBusyId(`accept-${req.id}`);
    try {
      const order = await accept(req.id, user);
      push({ title: t("buyer.accepted"), body: `${order.id} booked as confirmed`, kind: "success" });
    } catch (e) {
      push({ title: "Accept failed", body: e instanceof Error ? e.message : "Try again.", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const tabLabels = [t("req.tabNew"), t("req.tabResponded"), t("req.tabAccepted"), t("req.tabRejected")];

  return (
    <div>
      <PageHeader title={t("req.title")} subtitle={t("req.subtitle")} />
      <Tabs
        tabs={TABS.map((key, i) => `${tabLabels[i]} (${counts[key]})`)}
        active={`${tabLabels[TABS.indexOf(tab)]} (${counts[tab]})`}
        onChange={(label) => {
          const i = tabLabels.findIndex((l) => label.startsWith(l));
          if (i >= 0) setTab(TABS[i]);
        }}
      />

      <div className="mt-4 space-y-3">
        {loading ? (
          <Loading label={t("req.loading")} />
        ) : visible.length === 0 ? (
          <FarmerEmpty
            emoji="🤝"
            title={`${tabLabels[TABS.indexOf(tab)]} — ${t("req.noneFound")}`}
            body={t("req.newDemand")}
          />
        ) : (
          visible.map((r) => {
            const score = bestScore(r);
            const buyer = DEMO_BUYERS.find((b) => b.id === r.buyerId);
            return (
              <Card key={r.id} className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">🤝 {t("req.one")}</p>
                <Link to={`/supplier/buyers/${r.buyerId}?requirement=${r.id}`} className="mt-1 block text-lg font-bold text-stone-900 hover:text-brand-800 hover:underline">
                  {r.buyerCompany}
                </Link>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-5xl" role="img" aria-label={r.produceName}>{cropEmoji(r.produceName)}</span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{r.produceName}</p>
                    <p className="text-3xl font-bold leading-tight text-stone-900">
                      {r.quantityKg.toLocaleString("en-IN")} <span className="text-lg font-semibold text-stone-500">{(r.unit ?? "kg").toUpperCase()}</span>
                    </p>
                    <p className="text-sm font-bold text-brand-800">Grade {r.grade} · ₹{r.priceMinPerKg}–₹{r.priceMaxPerKg} / KG</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-stone-500">📍 {r.deliveryLocation} · 📅 {friendlyDate(r.deliveryDeadline)}</p>
                {buyer && <p className="text-xs text-stone-400">{buyer.contact} · {buyer.phone}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {score !== null ? (
                    <Badge tone={score >= 85 ? "green" : score >= 60 ? "amber" : "red"}>{t("req.youMatch")} {score}%</Badge>
                  ) : (
                    <Badge>{t("req.noOverlap")}</Badge>
                  )}
                  <FarmerStatus status={r.status} />
                  <SpeakButton context={`${r.buyerCompany}, ${r.produceName}`} text={describeRequirement(r, lang)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" className="min-h-[44px]" onClick={() => navigate(`/supplier/buyers/${r.buyerId}?requirement=${r.id}`)}>
                    {t("common.view")}
                  </Button>
                  {(!responseFor(r.id) || responseFor(r.id)?.status === "responded") && (
                    <>
                      <Button
                        variant="secondary"
                        className="min-h-[44px]"
                        disabled={busyId === `resp-${r.id}`}
                        onClick={() => run(`resp-${r.id}`, () => respond(r.id, user!), t("buyer.responded"))}
                      >
                        {t("common.respond")}
                      </Button>
                      <Button
                        className="min-h-[44px]"
                        disabled={busyId === `accept-${r.id}`}
                        onClick={() => acceptAndNotify(r)}
                      >
                        {t("common.accept")}
                      </Button>
                      <Button
                        variant="danger"
                        className="min-h-[44px]"
                        disabled={busyId === `rej-${r.id}`}
                        onClick={() => run(`rej-${r.id}`, () => reject(r.id, user!), t("buyer.rejected"))}
                      >
                        {t("common.reject")}
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="min-h-[44px]" onClick={() => chatWith(r)}>
                    <MessageCircle size={16} /> {t("nav.chat")}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
