import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useProduce } from "../../hooks/useProduce";
import { useRequirements } from "../../hooks/useRequirements";
import { useSupplierResponses, supplierListingsFor } from "../../hooks/useSupplierResponses";
import { useToast } from "../../hooks/useToast";
import { Badge, Button, Card, PageHeader } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { describeMatch } from "../../voice/describe";
import { SpeakButton } from "../../voice/SpeakButton";
import { FarmerEmpty, MatchChecklist, cropEmoji } from "../../components/domain/farmerFriendly";
import { MatchFactorBars, MatchScore } from "../../components/domain/matchScore";
import { isProduceSoldOut } from "../../types";
import { scoreFactors, weightedScore } from "../../utils/matching";

export default function SupplierMatchesPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { produce } = useProduce();
  const { requirements } = useRequirements();
  const { accept } = useSupplierResponses();
  const { startThread } = useChat();
  const { push } = useToast();
  const navigate = useNavigate();

  const mine = useMemo(() => supplierListingsFor(user), [produce, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeListings = useMemo(() => mine.filter((p) => !isProduceSoldOut(p)), [mine]);

  // Same engine as buyer Matches: every open requirement scored against my
  // active listings, best listing wins, ranked best-first.
  const ranked = useMemo(() => {
    return requirements
      .filter((r) => r.status === "open" || r.status === "matched")
      .map((req) => {
        const scored = activeListings
          .filter((p) => p.name === req.produceName)
          .map((p) => {
            const factors = scoreFactors(req, p);
            return { produce: p, factors, score: weightedScore(factors) };
          })
          .sort((a, b) => b.score - a.score);
        return { req, best: scored[0] ?? null };
      })
      .filter((x) => x.best !== null)
      .sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0));
  }, [requirements, activeListings]);

  async function chatWith(buyerId: string, buyerCompany: string, subject: string) {
    if (!user) return;
    const conv = await startThread(buyerId, buyerCompany, user.id, user.company, subject);
    navigate(`/supplier/chat/${conv.id}`);
  }

  async function acceptReq(reqId: string) {
    if (!user) return;
    try {
      const order = await accept(reqId, user);
      push({ title: "Request accepted", body: `${order.id} booked as confirmed`, kind: "success" });
      navigate(`/supplier/orders/${order.id}`);
    } catch (e) {
      push({ title: "Accept failed", body: e instanceof Error ? e.message : "Try again.", kind: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title={t("match.title")}
        subtitle={t("match.subtitle")}
      />
      {ranked.length === 0 ? (
        <FarmerEmpty
          emoji="🤝"
          title={t("match.noMatches")}
          body={t("match.noMatchesBody")}
          action={
            <Button onClick={() => navigate("/supplier/produce")}>{t("common.goProduce")}</Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {ranked.map(({ req, best }) => (
            <Card key={req.id} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {best!.score >= 85 ? `🤝 ${t("match.good")}` : `🤝 ${t("match.plain")}`}
              </p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-52 flex-1">
                  <Link to={`/supplier/buyers/${req.buyerId}?requirement=${req.id}`} className="text-lg font-bold text-stone-900 hover:text-brand-800 hover:underline">
                    {req.buyerCompany}
                  </Link>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-4xl" role="img" aria-label={req.produceName}>{cropEmoji(req.produceName)}</span>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{req.produceName}</p>
                      <p className="text-2xl font-bold leading-tight text-stone-900">
                        {req.quantityKg.toLocaleString("en-IN")} <span className="text-base font-semibold text-stone-500">KG</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-brand-800">{best!.score}<span className="text-base">%</span></p>
                      <p className="text-xs font-medium text-stone-500">Match</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    Grade {req.grade} · ₹{req.priceMinPerKg}–₹{req.priceMaxPerKg}/kg · {req.deliveryLocation} · by {req.deliveryDeadline}
                  </p>
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-stone-500">{t("match.bestFit")}:</p>
                    <p className="text-xs text-stone-500">
                      {best!.produce.quantityKg.toLocaleString("en-IN")} kg {best!.produce.name} Grade {best!.produce.grade} @ ₹{best!.produce.pricePerKg}/kg
                    </p>
                  </div>
                  <div className="mt-2 max-w-sm"><MatchChecklist factors={best!.factors} /></div>
                </div>
                <MatchScore score={best!.score} factors={best!.factors} compact />
              </div>
              <details className="mt-3 rounded-md bg-stone-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-stone-700">{t("match.how")}</summary>
                <div className="mt-2"><MatchFactorBars factors={best!.factors} /></div>
              </details>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button className="min-h-[44px]" onClick={() => acceptReq(req.id)}>{t("common.accept")}</Button>
                <Button variant="secondary" className="min-h-[44px]" onClick={() => navigate(`/supplier/buyers/${req.buyerId}?requirement=${req.id}`)}>
                  {t("common.buyerDetails")}
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-[44px]"
                  onClick={() => chatWith(req.buyerId, req.buyerCompany, `${req.quantityKg.toLocaleString("en-IN")} kg ${req.produceName}`)}
                >
                  <MessageCircle size={16} /> {t("nav.chat")}
                </Button>
                <Badge tone={best!.score >= 85 ? "green" : "amber"}>{t("req.youMatch")} {best!.score}%</Badge>
                <SpeakButton context={`${req.buyerCompany}, ${req.produceName}`} text={describeMatch(req, req.buyerCompany, best!.score, lang)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
