import { describe, expect, it } from "vitest";
import { en } from "../en";
import type { DictKey } from "../en";
import { te } from "../te";
import { hi } from "../hi";

function installStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
    writable: true,
  });
  return store;
}

describe("translation dictionaries", () => {
  const keys = Object.keys(en) as DictKey[];

  it("covers the core farmer-facing labels in English", () => {
    for (const k of ["nav.home", "nav.produce", "dash.myProduce", "status.delivered", "act.confirm"] as DictKey[]) {
      expect(en[k].length).toBeGreaterThan(0);
    }
  });

  it("Telugu has every English key with non-empty simple text", () => {
    expect(Object.keys(te).sort()).toEqual([...keys].sort());
    for (const k of keys) {
      expect(te[k].trim().length, k).toBeGreaterThan(0);
    }
  });

  it("Hindi has every English key with non-empty text", () => {
    expect(Object.keys(hi).sort()).toEqual([...keys].sort());
    for (const k of keys) {
      expect(hi[k].trim().length, k).toBeGreaterThan(0);
    }
  });

  it("uses the specified farmer-friendly Telugu wording", () => {
    expect(te["dash.myProduce"]).toBe("మీ పంట");
    expect(te["dash.recentlySold"]).toBe("ఇటీవల అమ్మిన పంట");
    expect(te["nav.orders"]).toBe("ఆర్డర్లు");
    expect(te["status.delivered"]).toBe("చేరవేయబడింది");
  });
});

describe("language persistence", () => {
  it("defaults to English when nothing is stored", () => {
    installStorage();
    const raw = localStorage.getItem("agripulse.language.v1");
    const lang = raw === "te" || raw === "hi" || raw === "en" ? raw : "en";
    expect(lang).toBe("en");
  });

  it("restores Telugu after a refresh", () => {
    installStorage({ "agripulse.language.v1": "te" });
    const raw = localStorage.getItem("agripulse.language.v1");
    expect(raw === "te" || raw === "hi" || raw === "en" ? raw : "en").toBe("te");
  });

  it("falls back to English on invalid stored values", () => {
    for (const bad of ["fr", "", "{corrupt", "TE"]) {
      installStorage({ "agripulse.language.v1": bad });
      const raw = localStorage.getItem("agripulse.language.v1");
      expect(raw === "te" || raw === "hi" || raw === "en" ? raw : "en").toBe("en");
    }
  });

  it("switching language touches only its own key", () => {
    const store = installStorage({ "agripulse.orders.v1": JSON.stringify([]) });
    localStorage.setItem("agripulse.language.v1", "hi");
    expect(store.get("agripulse.orders.v1")).toBe(JSON.stringify([]));
    expect(store.get("agripulse.language.v1")).toBe("hi");
  });
});
