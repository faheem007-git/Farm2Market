import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { en } from "./en";
import type { DictKey } from "./en";
import { te } from "./te";
import { hi } from "./hi";

export type Language = "en" | "te" | "hi";

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const LANGUAGE_KEY = "agripulse.language.v1";

const DICTS = { en, te, hi } as const;

function readLanguage(): Language {
  try {
    const raw = localStorage.getItem(LANGUAGE_KEY);
    if (raw === "te" || raw === "hi" || raw === "en") return raw;
    return "en";
  } catch {
    return "en";
  }
}

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  /** Translated label with English fallback (keys never change). */
  t: (key: DictKey) => string;
}

const Ctx = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readLanguage);

  const setLang = useCallback((l: Language) => {
    // Language only affects visible text: no reload, no logout, no data writes
    // outside its own key.
    setLangState(l);
    try {
      localStorage.setItem(LANGUAGE_KEY, l);
    } catch {
      /* private mode — session falls back to in-memory choice */
    }
  }, []);

  const t = useCallback(
    (key: DictKey): string => DICTS[lang][key] ?? en[key] ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
