import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useRequirements } from "../../hooks/useRequirements";
import { matchingService } from "../../services";
import { useProduce } from "../../hooks/useProduce";
import { Button, Card, EmptyState, Loading, PageHeader, Select } from "../../components/common/ui";
import { MatchFactorBars, MatchScore } from "../../components/domain/matchScore";
import { RequestOrderModal } from "../../components/domain/RequestOrderModal";
import type { Match, Produce } from "../../types";

export default function MatchesPage() {
  const { user } = useAuth();
  const { requirements } = useRequirements();
  const { produce: allProduce } = useProduce();
  const { startThread } = useChat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestFor, setRequestFor] = useState<Match | null>(null);

  const active = useMemo(
    () => requirements.filter((r) => (r.status === "open" || r.status === "matched") && (!user || r.buyerId === user.id)),
    [requirements, user]
  );
  const selectedId = params.get("requirement") ?? active[0]?.id ?? "";
  const selected = active.find((r) => r.id === selectedId) ?? active[0];

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    matchingService.findMatches(selected.id).then((m) => {
      if (!cancelled) {
        setMatches(m);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleMatches = selected ? matches.filter((m) => m.requirementId === selected.id) : [];

  async function chatWith(match: Match) {
    if (!user) return;
    const conv = await startThread(
      user.id,
      user.company,
      match.supplierId,
      match.supplierName,
      `${selected?.produceName} · ${selected?.quantityKg.toLocaleString("en-IN")} kg`
    );
    navigate(`/buyer/chat/${conv.id}`);
  }

  function produceFor(match: Match): Produce | undefined {
    return allProduce.find((p) => p.id === match.produceId);
  }

  return (
    <div>
      <PageHeader
        title="Matches"
        subtitle="Deterministic scores from grade, quantity, price, distance and availability."
      />

      {active.length === 0 ? (
        <EmptyState
          title="No active requirements"
          body="Publish a requirement first — matches appear here."
        />
      ) : (
        <>
          <div className="mb-4 max-w-md">
            <Select
              label="Requirement"
              value={selected?.id ?? ""}
              onChange={(e) => setParams({ requirement: e.target.value })}
            >
              {active.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.quantityKg.toLocaleString("en-IN")} kg {r.produceName} · Grade {r.grade} · {r.deliveryLocation}
                </option>
              ))}
            </Select>
          </div>

          {loading ? (
            <Loading label="Scoring suppliers…" />
          ) : visibleMatches.length === 0 ? (
            <EmptyState title="No matches yet" body="No listings carry this product right now." />
          ) : (
            <div className="space-y-3">
              {visibleMatches.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-52 flex-1">
                      <Link
                        to={`/buyer/suppliers/${m.supplierId}?requirement=${m.requirementId}`}
                        className="font-semibold text-stone-900 hover:text-brand-800 hover:underline"
                      >
                        {m.supplierName}
                      </Link>
                      <p className="mt-0.5 text-sm text-stone-500">
                        ₹{m.pricePerKg}/kg · {m.quantityKg.toLocaleString("en-IN")} kg · {m.distanceKm} km
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-xs text-stone-600">
                        {m.reasons.map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    </div>
                    <MatchScore score={m.score} factors={m.factors} />
                  </div>
                  {m.factors && (
                    <details className="mt-3 rounded-md bg-stone-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-stone-700">
                        How this score is built
                      </summary>
                      <div className="mt-2"><MatchFactorBars factors={m.factors} /></div>
                    </details>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => setRequestFor(m)}>Request order</Button>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/buyer/suppliers/${m.supplierId}?requirement=${m.requirementId}`)}
                    >
                      Supplier details
                    </Button>
                    <Button variant="ghost" onClick={() => chatWith(m)}>
                      <MessageCircle size={16} /> Chat
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {requestFor && (() => {
        const produce = produceFor(requestFor);
        return produce ? (
          <RequestOrderModal
            key={produce.id}
            produce={produce}
            matchId={requestFor.id}
            defaultQuantityKg={requestFor.quantityKg}
            defaultDelivery={selected?.deliveryDeadline ?? ""}
            onClose={() => setRequestFor(null)}
            onCreated={(orderId) => {
              setRequestFor(null);
              navigate(`/buyer/orders/${orderId}`);
            }}
          />
        ) : null;
      })()}
    </div>
  );
}
