import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { useRequirements } from "../../hooks/useRequirements";
import { matchingService } from "../../services";
import { DEMO_SUPPLIERS } from "../../data/demoData";
import { useProduce } from "../../hooks/useProduce";
import { Badge, Button, Card, EmptyState, PageHeader, Select } from "../../components/common/ui";
import { ProduceCard } from "../../components/domain/cards";
import { MatchFactorBars, MatchScore } from "../../components/domain/matchScore";
import { RequestOrderModal } from "../../components/domain/RequestOrderModal";
import type { Match, Produce } from "../../types";

export default function SupplierPage() {
  const { supplierId } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { requirements } = useRequirements();
  const { startThread } = useChat();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [requestProduce, setRequestProduce] = useState<Produce | null>(null);

  const supplier = DEMO_SUPPLIERS.find((s) => s.id === supplierId);
  const { produce: allProduce } = useProduce();
  const listings = useMemo(
    () => allProduce.filter((p) => p.supplierId === supplierId),
    [allProduce, supplierId]
  );
  const active = useMemo(
    () => requirements.filter((r) => r.status === "open" || r.status === "matched"),
    [requirements]
  );
  const requirementId = params.get("requirement") ?? active[0]?.id ?? "";
  const requirement = active.find((r) => r.id === requirementId);

  useEffect(() => {
    if (!requirement) return;
    let cancelled = false;
    matchingService.findMatches(requirement.id).then((all) => {
      if (!cancelled) setMatch(all.find((m) => m.supplierId === supplierId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [requirement?.id, supplierId]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleMatch = requirement && match?.requirementId === requirement.id ? match : null;

  async function chat() {
    if (!user || !supplier) return;
    const conv = await startThread(
      user.id,
      user.company,
      supplier.id,
      supplier.name,
      requirement
        ? `${requirement.produceName} · ${requirement.quantityKg.toLocaleString("en-IN")} kg`
        : "General enquiry"
    );
    navigate(`/buyer/chat/${conv.id}`);
  }

  if (!supplier) {
    return (
      <div>
        <PageHeader title="Supplier not found" />
        <EmptyState title="Unknown supplier" body="Return to Discover to browse verified FPOs." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={supplier.name}
        subtitle={`${supplier.location} · ⭐ ${supplier.rating} · ${supplier.verified ? "Verified FPO" : "Unverified"}`}
        actions={
          <Button variant="secondary" onClick={chat}>
            <MessageCircle size={16} /> Chat
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="font-semibold">Profile</h2>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">Location</dt><dd className="font-medium">{supplier.location}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Rating</dt><dd className="font-medium">⭐ {supplier.rating} / 5</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Status</dt><dd>{supplier.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Live listings</dt><dd className="font-medium">{listings.length}</dd></div>
          </dl>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold">Match score</h2>
          <div className="mt-2 max-w-md">
            <Select
              label="Compare against requirement"
              value={requirement?.id ?? ""}
              onChange={(e) => setParams({ requirement: e.target.value })}
            >
              {active.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.quantityKg.toLocaleString("en-IN")} kg {r.produceName} · Grade {r.grade}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-3">
            {visibleMatch?.factors ? (
              <div className="flex flex-col gap-3">
                <MatchScore score={visibleMatch.score} factors={visibleMatch.factors} />
                <MatchFactorBars factors={visibleMatch.factors} />
              </div>
            ) : (
              <p className="text-sm text-stone-500">No matching produce for this requirement.</p>
            )}
          </div>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Available produce</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((p) => (
          <div key={p.id} className="flex flex-col gap-2">
            <ProduceCard produce={p} />
            <div className="px-1 text-xs text-stone-500">
              Harvested {p.harvestDate} · available till {p.availableUntil}
            </div>
            <div className="px-1 pb-1">
              <Button className="w-full" onClick={() => setRequestProduce(p)}>Request order</Button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm">
        <Link to="/buyer/discover" className="font-medium text-brand-700 hover:underline">← Back to Discover</Link>
      </p>

      {requestProduce && (
        <RequestOrderModal
          key={requestProduce.id}
          produce={requestProduce}
          defaultQuantityKg={Math.min(requestProduce.quantityKg, requirement?.quantityKg ?? requestProduce.quantityKg)}
          defaultDelivery={requirement?.deliveryDeadline ?? ""}
          onClose={() => setRequestProduce(null)}
          onCreated={(orderId) => {
            setRequestProduce(null);
            navigate(`/buyer/orders/${orderId}`);
          }}
        />
      )}
    </div>
  );
}
