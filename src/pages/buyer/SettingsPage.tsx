import { useState } from "react";
import { useToast } from "../../hooks/useToast";
import { Button, Card, Input, PageHeader, Select } from "../../components/common/ui";

const SETTINGS_KEY = "agripulse.buyer-settings.v1";

interface BuyerSettings {
  hub: string;
  minScore: number;
  volumeUnit: string;
}

function readSettings(): BuyerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { hub: "Hyderabad", minScore: 70, volumeUnit: "kg", ...JSON.parse(raw) };
  } catch {
    /* defaults below */
  }
  return { hub: "Hyderabad", minScore: 70, volumeUnit: "kg" };
}

export default function SettingsPage() {
  const { push } = useToast();
  const [settings, setSettings] = useState<BuyerSettings>(readSettings);

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    push({ title: "Settings saved", body: `Hub ${settings.hub} · min score ${settings.minScore}`, kind: "success" });
  }

  function resetDemo() {
    ["agripulse.orders.v1", "agripulse.requirements.v1", "agripulse.chat.v1"].forEach((k) =>
      localStorage.removeItem(k)
    );
    push({ title: "Demo data reset", body: "Seed data restored on reload.", kind: "info" });
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Matching and workspace preferences." />
      <div className="grid max-w-3xl gap-4">
        <Card className="grid gap-3 p-5">
          <h2 className="font-semibold">Matching</h2>
          <Select label="Delivery hub (distances measured from here)" value={settings.hub} onChange={(e) => setSettings((s) => ({ ...s, hub: e.target.value }))}>
            <option>Hyderabad</option>
            <option>Vijayawada</option>
            <option>Bengaluru</option>
          </Select>
          <Input
            label="Minimum match score to highlight (0–100)"
            type="number"
            min={0}
            max={100}
            value={settings.minScore}
            onChange={(e) => setSettings((s) => ({ ...s, minScore: Number(e.target.value) }))}
          />
          <Select label="Volume unit" value={settings.volumeUnit} onChange={(e) => setSettings((s) => ({ ...s, volumeUnit: e.target.value }))}>
            <option>kg</option>
            <option>quintal</option>
            <option>tonne</option>
          </Select>
          <div><Button onClick={save}>Save settings</Button></div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Demo workspace</h2>
          <p className="mt-1 text-sm text-stone-500">Clear requests, orders and chat threads created in this browser and restore seed data.</p>
          <div className="mt-3"><Button variant="danger" onClick={resetDemo}>Reset demo data</Button></div>
        </Card>
      </div>
    </div>
  );
}
