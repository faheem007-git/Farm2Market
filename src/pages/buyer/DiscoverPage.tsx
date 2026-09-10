import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Package, Search } from "lucide-react";
import { useProduce } from "../../hooks/useProduce";
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select } from "../../components/common/ui";
import { ProduceCard } from "../../components/domain/cards";
import { distanceKm, SORT_LABELS } from "../../utils/marketplace";
import type { DiscoverSort } from "../../utils/marketplace";
import type { Produce } from "../../types";

type Availability = "all" | "available" | "expiring";

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export default function DiscoverPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [grade, setGrade] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [minQty, setMinQty] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");
  const [sort, setSort] = useState<DiscoverSort>("best-match");
  const [selected, setSelected] = useState<Produce | null>(null);
  const { produce: allProduce } = useProduce();

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(allProduce.map((p) => p.name)))],
    [allProduce]
  );
  const locations = useMemo(
    () => ["All", ...Array.from(new Set(allProduce.map((p) => p.location)))],
    [allProduce]
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const max = maxPrice === "" ? Infinity : Number(maxPrice);
    const min = minQty === "" ? 0 : Number(minQty);
    const filtered = allProduce.filter((p) => {
      if (q && !`${p.name} ${p.variety ?? ""} ${p.supplierName} ${p.location}`.toLowerCase().includes(q)) return false;
      if (category !== "All" && p.name !== category) return false;
      if (location !== "All" && p.location !== location) return false;
      if (grade !== "All" && p.grade !== grade) return false;
      if (p.pricePerKg > max) return false;
      if (p.quantityKg < min) return false;
      if (availability === "available" && daysUntil(p.availableUntil) < 0) return false;
      if (availability === "expiring" && (daysUntil(p.availableUntil) < 0 || daysUntil(p.availableUntil) > 7)) return false;
      return true;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "lowest-price":
        sorted.sort((a, b) => a.pricePerKg - b.pricePerKg);
        break;
      case "highest-availability":
        sorted.sort((a, b) => b.quantityKg - a.quantityKg);
        break;
      case "nearest":
        sorted.sort((a, b) => distanceKm(a.location) - distanceKm(b.location));
        break;
      case "recently-added":
        sorted.sort((a, b) => b.harvestDate.localeCompare(a.harvestDate));
        break;
      default:
        sorted.sort((a, b) =>
          `${a.grade}-${a.pricePerKg}`.localeCompare(`${b.grade}-${b.pricePerKg}`)
        );
    }
    return sorted;
  }, [allProduce, search, category, location, grade, maxPrice, minQty, availability, sort]);

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setLocation("All");
    setGrade("All");
    setMaxPrice("");
    setMinQty("");
    setAvailability("all");
    setSort("best-match");
  }

  return (
    <div>
      <PageHeader
        title="Discover produce"
        subtitle={`${results.length} of ${allProduce.length} live listings from verified FPOs`}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, variety, supplier…"
                aria-label="Search listings"
                className="w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600"
              />
            </div>
          </div>
          <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as DiscoverSort)}>
            {(Object.keys(SORT_LABELS) as DiscoverSort[]).map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </Select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <Select aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)}>
            {locations.map((l) => <option key={l}>{l}</option>)}
          </Select>
          <Select aria-label="Quality grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {["All", "A", "B", "C"].map((g) => <option key={g}>{g === "All" ? g : `Grade ${g}`}</option>)}
          </Select>
          <Input aria-label="Max price per kg" type="number" min={0} placeholder="Max ₹/kg" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <Input aria-label="Min quantity kg" type="number" min={0} placeholder="Min kg" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
          <Select aria-label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
            <option value="all">Any availability</option>
            <option value="available">Available now</option>
            <option value="expiring">Expiring ≤ 7 days</option>
          </Select>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={clearFilters}>Clear all</Button>
        </div>
      </Card>

      {results.length === 0 ? (
        <EmptyState title="No listings match" body="Loosen a filter or try a different search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <ProduceCard produce={p} />
              <div className="flex items-center justify-between px-1 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {distanceKm(p.location)} km · till {p.availableUntil}</span>
                <span className="inline-flex items-center gap-1"><Package size={12} /> {p.variety}</span>
              </div>
              <div className="flex gap-2 px-1 pb-1">
                <Button variant="secondary" className="flex-1" onClick={() => setSelected(p)}>View supplier</Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/buyer/requirements?new=${encodeURIComponent(p.name)}`)}
                >
                  Request quote
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={selected !== null} title={selected ? `${selected.supplierName} — ${selected.name}` : ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-2 text-sm">
            <p><Badge tone="green">Grade {selected.grade}</Badge> <Badge>{selected.location}</Badge></p>
            <p><strong>{selected.quantityKg.toLocaleString("en-IN")} kg</strong> @ <strong>₹{selected.pricePerKg}/kg</strong> ({selected.variety})</p>
            <p className="text-stone-500">Harvested {selected.harvestDate} · available till {selected.availableUntil} · {distanceKm(selected.location)} km from Hyderabad</p>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  const name = selected.name;
                  setSelected(null);
                  navigate(`/buyer/requirements?new=${encodeURIComponent(name)}`);
                }}
              >
                Create requirement
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
