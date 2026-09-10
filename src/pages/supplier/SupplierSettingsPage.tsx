import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useLanguage } from "../../i18n/LanguageContext";
import { LanguageSelector } from "../../i18n/LanguageSelector";
import { Button, Card, Input, PageHeader, Select } from "../../components/common/ui";

const SETTINGS_KEY = "agripulse.supplier-settings.v1";
const NOTIF_KEY = "agripulse.supplier-prefs.v1";

interface SupplierSettings {
  supplyRadiusKm: number;
  minOrderKg: number;
  priceUpdateFrequency: string;
}

function readSettings(): SupplierSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { supplyRadiusKm: 400, minOrderKg: 500, priceUpdateFrequency: "weekly", ...JSON.parse(raw) };
  } catch {
    /* defaults below */
  }
  return { supplyRadiusKm: 400, minOrderKg: 500, priceUpdateFrequency: "weekly" };
}

function readNotifs(): { requests: boolean; orders: boolean; prices: boolean } {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* defaults below */
  }
  return { requests: true, orders: true, prices: false };
}

export default function SupplierSettingsPage() {
  const { logout } = useAuth();
  const { push } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SupplierSettings>(readSettings);
  const [notifs, setNotifs] = useState(readNotifs);

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    push({ title: t("set.saved"), kind: "success" });
  }

  function toggle(key: keyof typeof notifs) {
    setNotifs((p) => {
      const next = { ...p, [key]: !p[key] };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div>
      <PageHeader title={t("set.title")} subtitle={t("set.subtitle")} />
      <div className="grid max-w-3xl gap-4">
        <Card className="grid gap-3 p-5">
          <h2 className="font-semibold">{t("nav.language")}</h2>
          <div><LanguageSelector /></div>
        </Card>
        <Card className="grid gap-3 p-5">
          <h2 className="font-semibold">{t("set.supplyPrefs")}</h2>
          <Input
            label={t("set.supplyRadius")}
            type="number"
            min={50}
            value={settings.supplyRadiusKm}
            onChange={(e) => setSettings((s) => ({ ...s, supplyRadiusKm: Number(e.target.value) }))}
          />
          <Input
            label={t("set.minQty")}
            type="number"
            min={1}
            value={settings.minOrderKg}
            onChange={(e) => setSettings((s) => ({ ...s, minOrderKg: Number(e.target.value) }))}
          />
          <Select label={t("set.priceRefresh")} value={settings.priceUpdateFrequency} onChange={(e) => setSettings((s) => ({ ...s, priceUpdateFrequency: e.target.value }))}>
            <option>daily</option>
            <option>weekly</option>
            <option>per-harvest</option>
          </Select>
          <div><Button onClick={save}>{t("set.saveSettings")}</Button></div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">{t("set.notifications")}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(
              [
                ["requests", t("set.newRequests")],
                ["orders", t("set.orderUpdates")],
                ["prices", t("set.priceAlerts")],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <span>{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifs[key]}
                  aria-label={label}
                  onClick={() => toggle(key)}
                  className={`relative h-6 w-11 rounded-full transition ${notifs[key] ? "bg-brand-600" : "bg-stone-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${notifs[key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">{t("set.account")}</h2>
          <Button
            variant="secondary"
            className="mt-3 min-h-[44px]"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={16} /> {t("prof.signOut")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
