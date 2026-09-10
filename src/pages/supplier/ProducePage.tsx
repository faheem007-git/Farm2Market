import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProduce } from "../../hooks/useProduce";
import { useToast } from "../../hooks/useToast";
import { supplierListingsFor } from "../../hooks/useSupplierResponses";
import type { ProduceInput } from "../../services";
import { Badge, Button, Card, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea } from "../../components/common/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { describeProduce } from "../../voice/describe";
import { SpeakButton } from "../../voice/SpeakButton";
import { FarmerEmpty, friendlyDate } from "../../components/domain/farmerFriendly";
import { isProduceSoldOut } from "../../types";
import type { Produce } from "../../types";

type Tab = "Active" | "Sold Out";
const PRODUCT_OPTIONS = ["Tomatoes", "Onions", "Green Chillies"];

interface ProduceFormState extends ProduceInput {}

const EMPTY_FORM: ProduceFormState = {
  name: "Tomatoes",
  variety: "",
  category: "Vegetables",
  grade: "A",
  quantityKg: 1000,
  unit: "kg",
  pricePerKg: 25,
  location: "",
  availableFrom: "2026-09-10",
  availableUntil: "2026-09-24",
  description: "",
};

function ProduceForm({
  initial,
  heading,
  submitLabel,
  onSubmit,
  saving,
}: {
  initial: ProduceFormState;
  heading: string;
  submitLabel: string;
  onSubmit: (form: ProduceFormState) => Promise<string | null>;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProduceFormState>(initial);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  function set<K extends keyof ProduceFormState>(key: K, value: ProduceFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!PRODUCT_OPTIONS.includes(form.name)) return setError("Choose a valid product.");
    if (!Number.isFinite(form.quantityKg) || form.quantityKg < 0) return setError("Quantity must be zero or more.");
    if (!Number.isFinite(form.pricePerKg) || form.pricePerKg <= 0) return setError("Price must be a positive number.");
    if (!form.location.trim()) return setError("Location is required.");
    if (!form.availableFrom || !form.availableUntil) return setError("Availability dates are required.");
    if (form.availableFrom > form.availableUntil) return setError("Available From cannot be after Available To.");
    setError("");
    const err = await onSubmit(form);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <h3 className="font-semibold">{heading}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label={`${t("form.product")} *`} value={form.name} onChange={(e) => set("name", e.target.value)}>
          {PRODUCT_OPTIONS.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Select label={t("form.category")} value={form.category} onChange={(e) => set("category", e.target.value)}>
          <option>Vegetables</option>
          <option>Fruits</option>
          <option>Spices</option>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t("form.variety")} placeholder="Desi Hybrid" value={form.variety} onChange={(e) => set("variety", e.target.value)} />
        <Select label={`${t("form.quality")} *`} value={form.grade} onChange={(e) => set("grade", e.target.value as ProduceFormState["grade"])}>
          <option>A</option>
          <option>B</option>
          <option>C</option>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label={`${t("form.quantity")} *`} type="number" min={0} value={form.quantityKg} onChange={(e) => set("quantityKg", Number(e.target.value))} />
        <Select label={t("form.unit")} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
          <option>kg</option>
          <option>quintal</option>
          <option>tonne</option>
        </Select>
        <Input label={`${t("form.price")} *`} type="number" min={1} value={form.pricePerKg} onChange={(e) => set("pricePerKg", Number(e.target.value))} />
      </div>
      <Input label={`${t("form.location")} *`} placeholder="Rajahmundry" value={form.location} onChange={(e) => set("location", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={`${t("form.from")} *`} type="date" value={form.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />
        <Input label={`${t("form.to")} *`} type="date" value={form.availableUntil} onChange={(e) => set("availableUntil", e.target.value)} />
      </div>
      <Textarea label={t("form.description")} placeholder="Grade, packaging, harvest notes…" value={form.description} onChange={(e) => set("description", e.target.value)} />
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export default function ProducePage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { produce, loading, create, update } = useProduce();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("Active");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Produce | null>(null);
  const [viewing, setViewing] = useState<Produce | null>(null);
  const [qtyFor, setQtyFor] = useState<Produce | null>(null);
  const [qtyValue, setQtyValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const mine = useMemo(() => supplierListingsFor(user), [produce, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(
    () => ({
      Active: mine.filter((p) => !isProduceSoldOut(p)).length,
      "Sold Out": mine.filter((p) => isProduceSoldOut(p)).length,
    }),
    [mine]
  );
  const visible = useMemo(
    () => mine.filter((p) => (tab === "Active" ? !isProduceSoldOut(p) : isProduceSoldOut(p))),
    [mine, tab]
  );

  async function handleAdd(form: ProduceFormState): Promise<string | null> {
    if (!user) return "Not signed in.";
    setSaving(true);
    try {
      const created = await create(user.id, user.company, {
        ...form,
        location: form.location.trim() || user.location,
      });
      push({ title: "Produce listed", body: `${created.quantityKg.toLocaleString("en-IN")} kg ${created.name} @ ₹${created.pricePerKg}/kg`, kind: "success" });
      setAdding(false);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(form: ProduceFormState): Promise<string | null> {
    if (!editing) return "Nothing to update.";
    setSaving(true);
    try {
      await update(editing.id, { ...form, harvestDate: form.availableFrom, status: form.quantityKg <= 0 ? "sold_out" : "active" });
      push({ title: "Listing updated", body: `${form.name} @ ₹${form.pricePerKg}/kg`, kind: "success" });
      setEditing(null);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveQuantity() {
    if (!qtyFor || qtyValue < 0) return;
    await update(qtyFor.id, {
      quantityKg: Math.round(qtyValue),
      status: qtyValue <= 0 ? "sold_out" : "active",
    });
    push({ title: "Quantity updated", body: `${qtyFor.name}: ${Math.round(qtyValue).toLocaleString("en-IN")} kg`, kind: "success" });
    setQtyFor(null);
  }

  async function toggleSoldOut(p: Produce) {
    const currentlyOut = isProduceSoldOut(p);
    await update(p.id, currentlyOut ? { status: "active" } : { status: "sold_out" });
    push({
      title: currentlyOut ? "Relisted" : "Marked sold out",
      body: p.name,
      kind: currentlyOut ? "success" : "info",
    });
  }

  return (
    <div>
      <PageHeader
        title={t("prod.title")}
        subtitle={t("prod.subtitle")}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> {t("common.addProduce")}
          </Button>
        }
      />

      <Tabs tabs={[`${t("prod.active")} (${counts.Active})`, `${t("prod.soldOutTab")} (${counts["Sold Out"]})`]} active={tab === "Active" ? `${t("prod.active")} (${counts.Active})` : `${t("prod.soldOutTab")} (${counts["Sold Out"]})`} onChange={(label) => setTab(label.startsWith(t("prod.active")) ? "Active" : "Sold Out")} />

      <div className="mt-4">
        {loading ? (
          <Loading label="Loading produce…" />
        ) : visible.length === 0 ? (
          tab === "Active" ? (
            <FarmerEmpty
              emoji="🌾"
              title={t("prod.noActive")}
              body={t("prod.addFirst")}
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus size={16} /> {t("common.addProduce")}
                </Button>
              }
            />
          ) : (
            <FarmerEmpty
              emoji="📦"
              title={t("prod.nothingOut")}
              body={t("prod.soldOutBody")}
            />
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-5xl" role="img" aria-label={p.name}>{p.imageEmoji}</span>
                  {isProduceSoldOut(p) ? <Badge tone="red">{t("common.soldOut")}</Badge> : <Badge tone="green">{t("form.quality")} {p.grade}</Badge>}
                </div>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{p.name}</h3>
                <p className="text-xs text-stone-400">{p.variety || p.category}</p>
                <p className="text-3xl font-bold leading-tight text-stone-900">
                  {p.quantityKg.toLocaleString("en-IN")} <span className="text-lg font-semibold text-stone-500">{(p.unit ?? "kg").toUpperCase()}</span>
                </p>
                <p className="mt-1 text-base font-bold text-brand-800">₹{p.pricePerKg} / KG</p>
                <p className="mt-1 text-sm text-stone-500">📍 {p.location}</p>
                <p className="text-xs text-stone-400">Till {friendlyDate(p.availableUntil)}</p>
                <div className="mt-2">
                  <SpeakButton context={`${p.name}, ${p.quantityKg} kg`} text={describeProduce(p, lang)} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="min-h-[44px]" onClick={() => setViewing(p)}>👁 {t("common.view")}</Button>
                  <Button variant="secondary" className="min-h-[44px]" onClick={() => setEditing(p)}><Pencil size={14} /> {t("common.edit")}</Button>
                  <Button variant="secondary" className="min-h-[44px]" onClick={() => { setQtyFor(p); setQtyValue(p.quantityKg); }}>{t("common.updateQty")}</Button>
                  <Button variant={isProduceSoldOut(p) ? "primary" : "ghost"} className="min-h-[44px]" onClick={() => toggleSoldOut(p)}>
                    {isProduceSoldOut(p) ? t("common.relist") : t("common.soldOut")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={adding} title={t("prod.addTitle")} onClose={() => setAdding(false)}>
        <ProduceForm
          initial={{ ...EMPTY_FORM, location: user?.location ?? "" }}
          heading={t("prod.newListing")}
          submitLabel={t("common.publish")}
          onSubmit={handleAdd}
          saving={saving}
        />
      </Modal>

      <Modal open={editing !== null} title={t("prod.editTitle")} onClose={() => setEditing(null)}>
        {editing && (
          <ProduceForm
            key={editing.id}
            initial={{
              name: editing.name,
              variety: editing.variety ?? "",
              category: editing.category ?? "Vegetables",
              grade: editing.grade,
              quantityKg: editing.quantityKg,
              unit: editing.unit ?? "kg",
              pricePerKg: editing.pricePerKg,
              location: editing.location,
              availableFrom: editing.availableFrom ?? editing.harvestDate,
              availableUntil: editing.availableUntil,
              description: editing.description ?? "",
            }}
            heading={`${editing.name} · ${editing.location}`}
            submitLabel={t("common.saveChanges")}
            onSubmit={handleEdit}
            saving={saving}
          />
        )}
      </Modal>

      <Modal open={viewing !== null} title={viewing ? `${viewing.name} · ${viewing.location}` : ""} onClose={() => setViewing(null)}>
        {viewing && (
          <dl className="grid gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">{t("form.variety")}</dt><dd className="font-medium">{viewing.variety || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("form.quality")}</dt><dd className="font-medium">{viewing.grade}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("form.quantity")}</dt><dd className="font-medium">{viewing.quantityKg.toLocaleString("en-IN")} {viewing.unit ?? "kg"}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("form.price")}</dt><dd className="font-medium">₹{viewing.pricePerKg}/kg</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">{t("form.from")} → {t("form.to")}</dt><dd className="font-medium">{viewing.availableFrom ?? viewing.harvestDate} → {viewing.availableUntil}</dd></div>
            {viewing.description && <p className="pt-1 text-stone-600">{viewing.description}</p>}
          </dl>
        )}
      </Modal>

      <Modal open={qtyFor !== null} title={qtyFor ? `${t("prod.qtyTitle")} · ${qtyFor.name}` : ""} onClose={() => setQtyFor(null)}>
        {qtyFor && (
          <div className="grid gap-3">
            <Input label={t("prod.qtyLabel")} type="number" min={0} value={qtyValue} onChange={(e) => setQtyValue(Number(e.target.value))} />
            <p className="text-xs text-stone-500">{t("prod.qtyHint")}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setQtyFor(null)}>{t("common.cancel")}</Button>
              <Button onClick={saveQuantity}>{t("common.saveQty")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
