import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeDashboard,
  describeMatch,
  describeOrder,
  describeProduce,
  describeRequirement,
} from "../describe";
import { isVoiceSupported, hasVoiceFor, speakText, stopSpeaking } from "../speak";
import type { Order, Produce, Requirement } from "../../types";

const produce: Produce = {
  id: "p-test",
  name: "Tomatoes",
  grade: "A",
  quantityKg: 6000,
  pricePerKg: 27,
  supplierId: "u-supplier-1",
  supplierName: "Ravi FPO",
  location: "Rajahmundry",
  harvestDate: "2026-09-05",
  availableUntil: "2026-09-20",
  imageEmoji: "🍅",
};

const requirement: Requirement = {
  id: "r-test",
  buyerId: "u-buyer-1",
  buyerCompany: "ABC Foods",
  produceName: "Tomatoes",
  grade: "A",
  quantityKg: 5000,
  priceMinPerKg: 25,
  priceMaxPerKg: 30,
  deliveryLocation: "Hyderabad",
  deliveryDeadline: "2026-09-15",
  status: "open",
  createdAt: "2026-09-08",
};

const order: Order = {
  id: "ORD-1",
  buyerId: "u-buyer-1",
  buyerCompany: "ABC Foods",
  supplierId: "u-supplier-1",
  supplierName: "Ravi FPO",
  produceName: "Tomatoes",
  grade: "A",
  quantityKg: 5000,
  pricePerKg: 27,
  totalAmount: 135000,
  status: "shipped",
  deliveryLocation: "Hyderabad",
  expectedDelivery: "2026-09-15",
  createdAt: "2026-09-09",
  timeline: [],
};

describe("spoken descriptions use current data", () => {
  it("describes produce equivalently to the card", () => {
    const text = describeProduce(produce, "en");
    expect(text).toContain("6,000");
    expect(text).toContain("27");
    expect(text).toContain("Grade A");
  });

  it("describes buyer requests with key facts", () => {
    const text = describeRequirement(requirement, "en");
    expect(text).toContain("ABC Foods");
    expect(text).toContain("5,000");
    expect(text).toContain("Hyderabad");
  });

  it("describes matches and orders from live records", () => {
    expect(describeMatch(requirement, "Ravi FPO", 94, "en")).toContain("94");
    const spoken = describeOrder(order, "en");
    expect(spoken).toContain("5,000");
    // shipped voices as the farmer-friendly "On the Way", like the UI status.
    expect(spoken.toLowerCase()).toContain("on the way");
  });

  it("speaks Telugu and Hindi from the same data", () => {
    expect(describeProduce(produce, "te")).toContain("6,000");
    expect(describeProduce(produce, "hi")).toContain("6,000");
    expect(describeRequirement(requirement, "te")).toContain("ABC Foods");
    expect(describeRequirement(requirement, "hi")).toContain("ABC Foods");
    expect(describeOrder(order, "te")).not.toBe(describeOrder(order, "en"));
    expect(describeOrder(order, "hi")).not.toBe(describeOrder(order, "en"));
  });

  it("summarizes the dashboard briefly", () => {
    const text = describeDashboard(
      {
        produce: [{ name: "Tomatoes", quantityKg: 6000 }],
        soldKg: 500,
        soldTotal: 13500,
        newRequests: 2,
        activeOrders: 1,
        unread: 3,
      },
      "en"
    );
    expect(text).toContain("6,000");
    expect(text).toContain("500");
    expect(text.length).toBeLessThan(400);
  });
});

describe("speech engine safety", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported and never crashes without a browser", () => {
    expect(isVoiceSupported()).toBe(false);
    expect(speakText("hello", "en")).toBe(false);
    expect(() => stopSpeaking()).not.toThrow();
  });

  it("cancels previous speech before starting (no overlap)", () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal("window", {
      speechSynthesis: {
        cancel,
        speak,
        getVoices: () => [{ lang: "te-IN" }],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    expect(isVoiceSupported()).toBe(true);
    expect(speakText("మీ పంట", "te")).toBe(true);
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(() => stopSpeaking()).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("uses a Telugu voice for Telugu and Hindi voice for Hindi", () => {
    const speak = vi.fn();
    let spoken: { lang: string; voice: unknown } | null = null;
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
        spoken = this as unknown as { lang: string; voice: unknown };
      }
    }
    const voices = [{ lang: "en-IN" }, { lang: "te-IN" }, { lang: "hi-IN" }];
    vi.stubGlobal("window", {
      speechSynthesis: {
        cancel: vi.fn(),
        speak,
        getVoices: () => voices,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    expect(speakText("మీ పంట", "te")).toBe(true);
    expect(spoken!.lang).toBe("te-IN");
    expect(spoken!.voice).toEqual({ lang: "te-IN" });
    expect(speakText("आपकी फसल", "hi")).toBe(true);
    expect(spoken!.lang).toBe("hi-IN");
    expect(spoken!.voice).toEqual({ lang: "hi-IN" });
    expect(speakText("Your produce", "en")).toBe(true);
    expect(spoken!.lang).toBe("en-IN");
  });

  it("never falls back to English for Telugu or Hindi (no wrong-voice speech)", () => {
    const speak = vi.fn();
    vi.stubGlobal("window", {
      // Device has ONLY an English voice.
      speechSynthesis: {
        cancel: vi.fn(),
        speak,
        getVoices: () => [{ lang: "en-US" }],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    });
    expect(hasVoiceFor("te")).toBe(false);
    expect(hasVoiceFor("hi")).toBe(false);
    expect(speakText("మీ పంట", "te")).toBe(false);
    expect(speakText("आपकी फसल", "hi")).toBe(false);
    expect(speak).not.toHaveBeenCalled();
    // English still works on its own voice.
    expect(hasVoiceFor("en")).toBe(true);
    expect(speakText("Your produce", "en")).toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("accepts a same-base-language voice when the regional one is missing", () => {
    const speak = vi.fn();
    vi.stubGlobal("window", {
      speechSynthesis: {
        cancel: vi.fn(),
        speak,
        getVoices: () => [{ lang: "te" }],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    });
    expect(hasVoiceFor("te")).toBe(true);
    expect(speakText("మీ పంట", "te")).toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("picks up voices that arrive late via voiceschanged", () => {
    let current: { lang: string }[] = [];
    let changedHandler: (() => void) | null = null;
    const speak = vi.fn();
    vi.stubGlobal("window", {
      speechSynthesis: {
        cancel: vi.fn(),
        speak,
        getVoices: () => current,
        addEventListener: (_ev: string, fn: () => void) => {
          changedHandler = fn;
        },
        removeEventListener: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    });
    expect(hasVoiceFor("hi")).toBe(false);
    // Voices arrive asynchronously; browser fires voiceschanged.
    current = [{ lang: "hi-IN" }];
    expect(changedHandler).not.toBeNull();
    changedHandler!();
    expect(hasVoiceFor("hi")).toBe(true);
    expect(speakText("आपकी फसल", "hi")).toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
