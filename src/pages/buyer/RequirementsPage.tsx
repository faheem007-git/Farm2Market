import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useRequirements } from "../../hooks/useRequirements";
import { useToast } from "../../hooks/useToast";
import { matchingService } from "../../services";
import type { RequirementInput } from "../../services";
import { Badge, Button, Card, EmptyState, Input, Loading, Modal, PageHeader, Select, StatusIndicator, Tabs, Textarea } from "../../components/common/ui";
import type { Requirement } from "../../types";

type Tab = "Active" | "Pending" | "Fulfilled" | "Closed";
const TABS: Tab[] = ["Active", "Pending", "Fulfilled", "Closed"];

function tabOf(r: Requirement): Tab {
  if (r.status === "pending") return "Pending";
  if (r.status === "fulfilled") return "Fulfilled";
  if (r.status === "closed" || r.status === "cancelled") return "Closed";
  return "Active";
}

const PRODUCT_OPTIONS = ["Tomatoes", "Onions", "Green Chillies"];

interface FormErrors {
  produceName?: string;
  quantityKg?: string;
  price?: string;
  destination?: string;
  date?: string;
}

export default function RequirementsPage() {
  const { user } = useAuth();
  const { requirements, loading, create, setStatus } = useRequirements();
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("Active");
  const [modalOpen, setModalOpen] = useState(params.has("new"));
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<RequirementInput>({
    produceName: params.get("new") ?? "Tomatoes",
    category: "Vegetables",
    grade: "A",
    quantityKg: 1000,
    unit: "kg",
    priceMinPerKg: 25,
    priceMaxPerKg: 30,
    deliveryLocation: "Hyderabad",
    deliveryDeadline: "2026-09-20",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Buyer workspace shows only this buyer's demand; suppliers see all buyers.
  const mine = useMemo(
    () => requirements.filter((r) => !user || r.buyerId === user.id),
    [requirements, user]
  );

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { Active: 0, Pending: 0, Fulfilled: 0, Closed: 0 };
    mine.forEach((r) => {
      c[tabOf(r)] += 1;
    });
    return c;
  }, [mine]);

  const visible = useMemo(
    () => mine.filter((r) => tabOf(r) === tab),
    [mine, tab]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const entries = await Promise.all(
        mine.map(async (r) => {
          const m = await matchingService.findMatches(r.id);
          return [r.id, m.length] as const;
        })
      );
      if (!cancelled) setMatchCounts(Object.fromEntries(entries));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mine]);

  function set<K extends keyof RequirementInput>(key: K, value: RequirementInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!PRODUCT_OPTIONS.includes(form.produceName)) e.produceName = "Choose a valid product.";
    if (!Number.isFinite(form.quantityKg) || form.quantityKg <= 0) e.quantityKg = "Quantity must be a positive number.";
    if (!Number.isFinite(form.priceMinPerKg) || !Number.isFinite(form.priceMaxPerKg) || form.priceMinPerKg <= 0 || form.priceMaxPerKg <= 0)
      e.price = "Prices must be positive numbers.";
    else if (form.priceMinPerKg > form.priceMaxPerKg) e.price = "Minimum price cannot exceed maximum price.";
    if (!form.deliveryLocation.trim()) e.destination = "Destination is required.";
    if (!form.deliveryDeadline || Number.isNaN(new Date(form.deliveryDeadline).getTime())) e.date = "Required date must be a valid date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;
    setSaving(true);
    try {
      const created = await create(user.id, user.company, form);
      push({ title: "Requirement published", body: `${created.quantityKg.toLocaleString("en-IN")} kg ${created.produceName} → ${created.deliveryLocation}`, kind: "success" });
      setModalOpen(false);
      setParams({});
      setTab("Active");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Requirements"
        subtitle="Publish demand once — verified FPOs match on grade, price and distance."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New requirement
          </Button>
        }
      />

      <Tabs tabs={TABS.map((t) => `${t} (${counts[t]})`)} active={`${tab} (${counts[tab]})`} onChange={(t) => setTab(t.slice(0, t.lastIndexOf(" (")) as Tab)} />

      <div className="mt-4 space-y-3">
        {loading ? (
          <Loading label="Loading requirements…" />
        ) : visible.length === 0 ? (
          <EmptyState title={`No ${tab.toLowerCase()} requirements`} body={tab === "Active" ? "Publish your first requirement to get matches." : "Requirements with this status will appear here."} />
        ) : (
          visible.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-stone-900">
                    {r.quantityKg.toLocaleString("en-IN")} {r.unit ?? "kg"} {r.produceName}
                  </h3>
                  <p className="mt-0.5 text-sm text-stone-500">
                    Grade {r.grade} · ₹{r.priceMinPerKg}–₹{r.priceMaxPerKg}/kg · {r.deliveryLocation} · by {r.deliveryDeadline}
                  </p>
                  {r.description && <p className="mt-1 text-sm text-stone-600">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/buyer/matches?requirement=${r.id}`} className="hover:opacity-80">
                    <Badge tone="blue">{matchCounts[r.id] ?? 0} matches</Badge>
                  </Link>
                  <StatusIndicator status={r.status} />
                </div>
              </div>
              {(r.status === "open" || r.status === "matched") && (
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setStatus(r.id, "closed")}>Close requirement</Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <Modal open={modalOpen} title="New requirement" onClose={() => { setModalOpen(false); setParams({}); }}>
        <form onSubmit={onSubmit} className="grid gap-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Product *" value={form.produceName} onChange={(e) => set("produceName", e.target.value)}>
              {PRODUCT_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Select label="Category" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option>Vegetables</option>
              <option>Fruits</option>
              <option>Spices</option>
            </Select>
          </div>
          {errors.produceName && <p className="text-xs text-red-700">{errors.produceName}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Quantity *" type="number" min={1} value={form.quantityKg} onChange={(e) => set("quantityKg", Number(e.target.value))} error={errors.quantityKg} />
            <Select label="Unit" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              <option>kg</option>
              <option>quintal</option>
              <option>tonne</option>
            </Select>
            <Select label="Quality *" value={form.grade} onChange={(e) => set("grade", e.target.value as RequirementInput["grade"])}>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Minimum price (₹/kg) *" type="number" min={1} value={form.priceMinPerKg} onChange={(e) => set("priceMinPerKg", Number(e.target.value))} />
            <Input label="Maximum price (₹/kg) *" type="number" min={1} value={form.priceMaxPerKg} onChange={(e) => set("priceMaxPerKg", Number(e.target.value))} />
          </div>
          {errors.price && <p className="text-xs text-red-700">{errors.price}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Destination *" placeholder="Hyderabad" value={form.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)} error={errors.destination} />
            <Input label="Required date *" type="date" value={form.deliveryDeadline} onChange={(e) => set("deliveryDeadline", e.target.value)} error={errors.date} />
          </div>
          <Textarea label="Description" placeholder="Grade, packaging, delivery slot…" value={form.description} onChange={(e) => set("description", e.target.value)} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => { setModalOpen(false); setParams({}); }}>Cancel</Button>
            <Button type="submit" loading={saving}>Publish requirement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
