import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import type { Language } from "../i18n/LanguageContext";
import { SPEECH_EVENT, hasVoiceFor, isVoiceSupported, speakText, stopSpeaking } from "./speak";

/**
 * Optional 🔊 Listen / ⏹ Stop toggle. Text UI always remains the source of
 * truth; this only reads it aloud. Renders a graceful disabled state when
 * the device has no speech support.
 */
export function SpeakButton({
  text,
  context,
}: {
  /** Full sentence to speak (built from current data by the caller). */
  text: string;
  /** Short label of what will be read, for accessibility. */
  context: string;
}) {
  const { lang, t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  // Language this notice belongs to; shown only while it matches selection.
  const [noVoiceLang, setNoVoiceLang] = useState<Language | null>(null);
  const supported = isVoiceSupported();

  useEffect(() => {
    function onState(e: Event) {
      if ((e as CustomEvent).detail === "stopped") setPlaying(false);
    }
    window.addEventListener(SPEECH_EVENT, onState);
    return () => window.removeEventListener(SPEECH_EVENT, onState);
  }, []);

  // The unavailable-voice note belongs to the current language selection.
  function toggle() {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    if (!hasVoiceFor(lang)) {
      // Never speak Telugu/Hindi text through a wrong-language voice.
      setNoVoiceLang(lang);
      return;
    }
    setNoVoiceLang(null);
    const started = speakText(text, lang, () => setPlaying(false));
    setPlaying(started);
  }

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title={t("voice.unsupported")}
        aria-label={t("voice.unsupported")}
        className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-400"
      >
        <span aria-hidden>🔇</span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? `Stop reading: ${context}` : `Listen: ${context}`}
        title={playing ? "Stop" : "Listen"}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition ${
          playing
            ? "border-brand-700 bg-brand-700 text-white"
            : "border-stone-300 bg-white text-stone-700 hover:border-brand-600 hover:text-brand-800"
        }`}
      >
        <span aria-hidden>{playing ? "⏹" : "🔊"}</span>
        {playing ? "Stop" : "Listen"}
      </button>
      {noVoiceLang === lang && (
        <span role="status" className="text-xs text-stone-500">
          {t("voice.noVoice")}
        </span>
      )}
    </span>
  );
}
