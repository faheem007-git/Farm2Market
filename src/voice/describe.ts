import type { DictKey } from "../i18n/en";
import { en } from "../i18n/en";
import { te } from "../i18n/te";
import { hi } from "../i18n/hi";
import type { Language } from "../i18n/LanguageContext";
import type { Order, Produce, Requirement } from "../types";

const DICTS = { en, te, hi } as const;

function num(n: number): string {
  return n.toLocaleString("en-IN");
}

/** Localized status word (display only — backend values unchanged). */
const STATUS_KEY: Record<string, DictKey> = {
  placed: "status.waiting",
  confirmed: "status.accepted",
  packed: "status.preparing",
  shipped: "status.ontheway",
  in_transit: "status.ontheway",
  delivered: "status.delivered",
  cancelled: "status.cancelled",
  open: "status.open",
  matched: "status.matched",
};

function statusWord(status: string, lang: Language): string {
  const key = STATUS_KEY[status];
  if (!key) return status;
  return DICTS[lang][key] ?? en[key];
}

/** Short spoken sentence for a produce listing, built from CURRENT data. */
export function describeProduce(p: Produce, lang: Language): string {
  const qty = `${num(p.quantityKg)} kilograms`;
  if (lang === "te") {
    return `మీ దగ్గర గ్రేడ్ ${p.grade} ${p.name} ${num(p.quantityKg)} కిలోలు ఉన్నాయి. కిలో ధర ${p.pricePerKg} రూపాయలు.`;
  }
  if (lang === "hi") {
    return `आपके पास ग्रेड ${p.grade} ${p.name} ${num(p.quantityKg)} किलोग्राम है। भाव ${p.pricePerKg} रुपये प्रति किलोग्राम है।`;
  }
  return `You have ${qty} of Grade ${p.grade} ${p.name.toLowerCase()}. The price is ${p.pricePerKg} rupees per kilogram.`;
}

/** Short spoken sentence for a buyer request, built from CURRENT data. */
export function describeRequirement(r: Requirement, lang: Language): string {
  if (lang === "te") {
    return `${r.buyerCompany}కు ${r.produceName} ${num(r.quantityKg)} కిలోలు కావాలి. గ్రేడ్ ${r.grade}. ధర కిలోకు ${r.priceMinPerKg} నుంచి ${r.priceMaxPerKg} రూపాయలు. ప్రాంతం ${r.deliveryLocation}.`;
  }
  if (lang === "hi") {
    return `${r.buyerCompany} को ${r.produceName} ${num(r.quantityKg)} किलोग्राम चाहिए। ग्रेड ${r.grade}। भाव ${r.priceMinPerKg} से ${r.priceMaxPerKg} रुपये प्रति किलोग्राम। स्थान ${r.deliveryLocation}।`;
  }
  return `${r.buyerCompany} wants ${num(r.quantityKg)} kilograms of ${r.produceName.toLowerCase()}, Grade ${r.grade}, at ${r.priceMinPerKg} to ${r.priceMaxPerKg} rupees per kilogram, in ${r.deliveryLocation}.`;
}

/** Short spoken sentence for a match, built from CURRENT data. */
export function describeMatch(
  req: Requirement,
  supplierName: string,
  score: number,
  lang: Language
): string {
  if (lang === "te") {
    return `${supplierName} మీ ${req.produceName}కు ${score} శాతం సరిపోతుంది. పరిమాణం ${num(req.quantityKg)} కిలోలు.`;
  }
  if (lang === "hi") {
    return `${supplierName} आपकी ${req.produceName} से ${score} प्रतिशत मेल खाता है। मात्रा ${num(req.quantityKg)} किलोग्राम।`;
  }
  return `${supplierName} is a ${score} percent match for your ${req.quantityKg.toLocaleString("en-IN")} kilograms of ${req.produceName.toLowerCase()}.`;
}

/** Short spoken sentence for an order status, built from CURRENT data. */
export function describeOrder(o: Order, lang: Language): string {
  const state = statusWord(o.status, lang);
  if (lang === "te") {
    return `మీ ${o.produceName} ఆర్డర్, ${num(o.quantityKg)} కిలోలు, ${o.buyerCompany} కోసం — ప్రస్తుత స్థితి: ${state}.`;
  }
  if (lang === "hi") {
    return `आपका ${o.produceName} ऑर्डर, ${num(o.quantityKg)} किलोग्राम, ${o.buyerCompany} के लिए — वर्तमान स्थिति: ${state}।`;
  }
  return `Your ${o.produceName.toLowerCase()} order for ${num(o.quantityKg)} kilograms, for ${o.buyerCompany}, is now ${state.toLowerCase()}.`;
}

export interface DashboardSummary {
  produce: { name: string; quantityKg: number }[];
  soldKg: number;
  soldTotal: number;
  newRequests: number;
  activeOrders: number;
  unread: number;
}

/** Short dashboard summary — never the whole page. */
export function describeDashboard(s: DashboardSummary, lang: Language): string {
  const top = s.produce
    .slice(0, 3)
    .map((p) => `${num(p.quantityKg)} kilograms of ${p.name.toLowerCase()}`)
    .join(", ");
  if (lang === "te") {
    return `మీ దగ్గర ${top || "పంట లేదు"}. ఇటీవల ${num(s.soldKg)} కిలోలు అమ్మారు. ${s.newRequests} కొత్త అభ్యర్థనలు, ${s.activeOrders} ప్రస్తుత ఆర్డర్లు ఉన్నాయి.`;
  }
  if (lang === "hi") {
    return `आपके पास ${top || "कोई फसल नहीं"}। हाल में ${num(s.soldKg)} किलोग्राम बेचा। ${s.newRequests} नए अनुरोध, ${s.activeOrders} वर्तमान ऑर्डर हैं।`;
  }
  return `You have ${top || "no produce listed"}. You recently sold ${num(s.soldKg)} kilograms. There are ${s.newRequests} new buyer requests and ${s.activeOrders} active orders.`;
}
