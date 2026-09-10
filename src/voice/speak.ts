import type { Language } from "../i18n/LanguageContext";

const LOCALES: Record<Language, string[]> = {
  en: ["en-IN", "en-US", "en"],
  te: ["te-IN", "te"],
  hi: ["hi-IN", "hi"],
};

/** Fired whenever speech stops or is replaced, so buttons reset their state. */
export const SPEECH_EVENT = "agripulse:speech-state";

function emit(state: "started" | "stopped") {
  try {
    window.dispatchEvent(new CustomEvent(SPEECH_EVENT, { detail: state }));
  } catch {
    /* non-DOM test env */
  }
}

export function isVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Browsers load voices asynchronously. Single module-level listener (no React
// lifecycle involved, so no duplicate listeners or leaks) keeps the cache
// fresh via voiceschanged; every lookup also re-reads live voices.
let cachedVoices: SpeechSynthesisVoice[] = [];
let listenedSynth: unknown = null;

function voices(): SpeechSynthesisVoice[] {
  if (!isVoiceSupported()) return [];
  try {
    const synth = window.speechSynthesis;
    if (listenedSynth !== synth) {
      listenedSynth = synth;
      const refresh = () => {
        try {
          const latest = synth.getVoices();
          if (latest.length > 0) cachedVoices = latest;
        } catch {
          /* ignore device quirks */
        }
      };
      refresh();
      try {
        synth.addEventListener("voiceschanged", refresh);
      } catch {
        /* older impls without EventTarget — live reads still apply */
      }
    }
    const live = synth.getVoices();
    if (live.length > 0) {
      cachedVoices = live;
      return live;
    }
    return cachedVoices;
  } catch {
    return cachedVoices;
  }
}

/** A browser voice matching the requested language (base-language fallback). */
export function findVoice(lang: Language): SpeechSynthesisVoice | null {
  const prefs = LOCALES[lang];
  return (
    voices().find((v) =>
      prefs.some((p) => (v.lang || "").toLowerCase().startsWith(p.toLowerCase()))
    ) ?? null
  );
}

/** True only when the device can speak the requested language itself. */
export function hasVoiceFor(lang: Language): boolean {
  return isVoiceSupported() && findVoice(lang) !== null;
}

/** Stop any current speech. Safe to call when unsupported. */
export function stopSpeaking(): void {
  if (isVoiceSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore device quirks */
    }
  }
  emit("stopped");
}

/**
 * Speak text in the requested language. Cancels previous speech first so
 * messages never overlap. Returns false when unsupported OR when the device
 * has no voice for the requested language — Telugu/Hindi text is NEVER
 * spoken through an English voice. UI stays usable either way.
 */
export function speakText(
  text: string,
  lang: Language,
  onDone?: () => void
): boolean {
  if (!isVoiceSupported() || !text.trim()) return false;
  const match = findVoice(lang);
  if (!match) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = match.lang || LOCALES[lang][0];
    utterance.voice = match;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      emit("stopped");
      onDone?.();
    };
    utterance.onend = done;
    utterance.onerror = done;
    synth.speak(utterance);
    emit("started");
    return true;
  } catch {
    return false;
  }
}
