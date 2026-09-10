import { Globe } from "lucide-react";
import { LANGUAGES, useLanguage } from "./LanguageContext";
import type { Language } from "./LanguageContext";

/** Clear language picker (presentation only — never touches session data). */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <label
      className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm font-medium text-stone-700 hover:border-brand-600"
      title={t("nav.language")}
    >
      <Globe size={16} aria-hidden />
      <span className={compact ? "sr-only" : "hidden sm:inline"}>{t("nav.language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        aria-label={t("nav.language")}
        className="max-w-28 bg-transparent text-sm font-semibold outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
