import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useProduce } from "../../hooks/useProduce";
import { useRequirements } from "../../hooks/useRequirements";
import { useSupplierResponses, supplierListingsFor } from "../../hooks/useSupplierResponses";
import { useToast } from "../../hooks/useToast";
import { DEMO_BUYERS } from "../../data/demoData";
import { Badge, Button, Card, PageHeader, Select, StatusIndicator } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { FarmerEmpty } from "../../components/domain/farmerFriendly";
import { MatchFactorBars } from "../../components/domain/matchScore";
import { scoreFactors, weightedScore } from "../../utils/matching";

export default function BuyerDetailsPage() {
  const { buyerId } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { requirements } = useRequirements();
  const { produce } = useProduce();
  const { responseFor, respond, accept, reject } = useSupplierResponses();
  const { startThread } = useChat();
  const { push } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const buyer = DEMO_BUYERS.find((b) => b.id === buyerId);
  const buyerReqs = useMemo(
    () => requirements.filter((r) => r.buyerId === buyerId && (r.status === "open" || r.status === "matched")),
    [requirements, buyerId]
  );
  const requirementId = params.get("requirement") ?? buyerReqs[0]?.id ?? "";
  const requirement = buyerReqs.find((r) => r.id === requirementId);
  const mine = useMemo(() => supplierListingsFor(user), [produce, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const scored = useMemo(() => {
    if (!requirement) return [];
    return mine
      .filter((p) => p.name === requirement.produceName)
      .map((p) => {
        const factors = scoreFactors(requirement, p);
        return { produce: p, factors, score: weightedScore(factors) };
      })
      .sort((a, b) => b.score - a.score);
  }, [mine, requirement]);

  const response = user && requirement ? responseFor(requirement.id, user.id) : null;

  async function chat() {
    if (!user || !requirement || !buyer) return;
    const conv = await startThread(
      requirement.buyerId,
      requirement.buyerCompany,
      user.id,
      user.company,
      `${requirement.quantityKg.toLocaleString("en-IN")} kg ${requirement.produceName}`
    );
    navigate(`/supplier/chat/${conv.id}`);
  }

  async function doAccept() {
    if (!user || !requirement) return;
    setBusy(true);
    try {
      const order = await accept(requirement.id, user);
      push({ title: t("buyer.accepted"), body: `${order.id} booked as confirmed`, kind: "success" });
    } catch (e) {
      push({ title: "Accept failed", body: e instanceof Error ? e.message : "Try again.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  if (!buyer) {
    return (
      <div>
        <PageHeader title={t("buyer.title")} />
        <FarmerEmpty emoji="🤝" title={t("buyer.title")} body={t("req.newDemand")} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={buyer.company}
        subtitle={`${buyer.contact} · ${buyer.phone} · ${buyer.location}`}
        actions={
          <Button variant="secondary" onClick={chat} disabled={!requirement}>
            <MessageCircle size={16} /> {t("nav.chat")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-semibold">{t("dl.buyer")}</h2>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.company")}</dt><dd className="font-medium">{buyer.company}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.contact")}</dt><dd className="font-medium">{buyer.contact}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.phone")}</dt><dd className="font-medium">{buyer.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.hub")}</dt><dd className="font-medium">{buyer.location}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("dl.monthlyVolume")}</dt><dd className="font-medium">{buyer.monthlyVolumeKg.toLocaleString("en-IN")} kg</dd></div>
          </dl>
          {buyerReqs.length > 1 && (
            <div className="mt-3">
              <Select label={t("buyer.title")} value={requirement?.id ?? ""} onChange={(e) => setParams({ requirement: e.target.value })}>
                {buyerReqs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.quantityKg.toLocaleString("en-IN")} kg {r.produceName} · Grade {r.grade}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold">{t("buyer.title")}</h2>
            {requirement && (
              <div className="flex items-center gap-2">
                {response && <Badge tone={response.status === "accepted" ? "green" : response.status === "rejected" ? "red" : "blue"}>{response.status}</Badge>}
                <StatusIndicator status={requirement.status} />
              </div>
            )}
          </div>
          {!requirement ? (
            <p className="mt-2 text-sm text-stone-500">{t("buyer.noOpen")}</p>
          ) : (
            <>
              <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-2"><dt className="text-stone-500">{t("dl.product")}</dt><dd className="font-medium">{requirement.produceName} · Grade {requirement.grade}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-stone-500">{t("dl.quantity")}</dt><dd className="font-medium">{requirement.quantityKg.toLocaleString("en-IN")} {requirement.unit ?? "kg"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-stone-500">{t("dl.priceBand")}</dt><dd className="font-medium">₹{requirement.priceMinPerKg}–₹{requirement.priceMaxPerKg}/kg</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-stone-500">{t("dl.destination")}</dt><dd className="font-medium">{requirement.deliveryLocation}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-stone-500">{t("dl.requiredBy")}</dt><dd className="font-medium">{requirement.deliveryDeadline}</dd></div>
              </dl>
              {requirement.description && <p className="mt-2 text-sm text-stone-600">{requirement.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {(!response || response.status === "responded") && (
                  <>
                    <Button variant="secondary" className="min-h-[44px]" disabled={busy} onClick={() => user && respond(requirement.id, user).then(() => push({ title: t("buyer.responded"), kind: "success" }))}>
                      {t("common.respond")}
                    </Button>
                    <Button disabled={busy} className="min-h-[44px]" onClick={doAccept}>{t("common.accept")}</Button>
                    <Button variant="danger" className="min-h-[44px]" disabled={busy} onClick={() => user && reject(requirement.id, user).then(() => push({ title: t("buyer.rejected"), kind: "info" }))}>
                      {t("common.reject")}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">{t("buyer.yourMatch")}</h2>
      {!requirement ? (
        <FarmerEmpty emoji="🤝" title={t("buyer.noOpen")} body="" />
      ) : scored.length === 0 ? (
        <FarmerEmpty emoji="🌾" title={t("buyer.noOverlapTitle")} body={t("buyer.noOverlapBody")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scored.map(({ produce: p, factors, score }) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.quantityKg.toLocaleString("en-IN")} kg {p.name} · Grade {p.grade}</h3>
                <Badge tone={score >= 85 ? "green" : score >= 60 ? "amber" : "red"}>{score}%</Badge>
              </div>
              <p className="mt-0.5 text-sm text-stone-500">₹{p.pricePerKg}/kg · {p.location} · till {p.availableUntil}</p>
              <div className="mt-2"><MatchFactorBars factors={factors} /></div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm">
        <Link to="/supplier/requests" className="font-medium text-brand-700 hover:underline">← {t("common.back")} {t("req.title")}</Link>
      </p>
    </div>
  );
}
