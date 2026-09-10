export type Role = "buyer" | "supplier" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  company: string;
  location: string;
  phone?: string;
  avatarUrl?: string;
}

export interface BuyerProfile extends User {
  role: "buyer";
  company: string;
  demandVolumeKgPerMonth?: number;
}

export interface SupplierProfile extends User {
  role: "supplier";
  farmSizeAcres?: number;
  village?: string;
  verified: boolean;
  rating: number;
}

export type ProduceGrade = "A" | "B" | "C";

export interface Produce {
  id: string;
  name: string; // Tomatoes | Onions | Green Chillies
  variety?: string;
  category?: string;
  grade: ProduceGrade;
  quantityKg: number;
  unit?: string;
  pricePerKg: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  supplierId: string;
  supplierName: string;
  location: string;
  harvestDate: string;
  availableFrom?: string;
  availableUntil: string;
  description?: string;
  status?: "active" | "sold_out";
  imageEmoji: string;
}

/** Sold out when explicitly marked or quantity reaches zero. */
export function isProduceSoldOut(p: Produce): boolean {
  return p.status === "sold_out" || p.quantityKg <= 0;
}

export interface Requirement {
  id: string;
  buyerId: string;
  buyerCompany: string;
  produceName: string;
  category?: string;
  grade: ProduceGrade;
  quantityKg: number;
  unit?: string;
  priceMinPerKg: number;
  priceMaxPerKg: number;
  deliveryLocation: string;
  deliveryDeadline: string;
  description?: string;
  status: "open" | "matched" | "pending" | "fulfilled" | "closed" | "cancelled";
  createdAt: string;
}

/** Weighted match factor scores (0–100 each). Weights: product 30, quantity 20, quality 20, price 15, location 10, availability 5. */
export interface MatchFactors {
  product: number;
  quantity: number;
  quality: number;
  price: number;
  location: number;
  availability: number;
}

export interface Match {
  id: string;
  requirementId: string;
  produceId: string;
  supplierId: string;
  supplierName: string;
  score: number; // 0-100
  pricePerKg: number;
  quantityKg: number;
  distanceKm: number;
  gradeMatch: boolean;
  reasons: string[];
  factors?: MatchFactors;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  matchId?: string;
  buyerId: string;
  buyerCompany: string;
  supplierId: string;
  supplierName: string;
  produceName: string;
  grade: ProduceGrade;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryLocation: string;
  expectedDelivery: string;
  createdAt: string;
  timeline: { status: OrderStatus; at: string; note?: string }[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
  read: boolean;
}

/** Shared buyer/supplier chat thread. Supplier side (Request 4+) uses the same shape. */
export interface Conversation {
  id: string;
  buyerId: string;
  buyerCompany: string;
  supplierId: string;
  supplierName: string;
  subject: string;
  lastMessage: string;
  lastAt: string;
  unreadBuyer: number;
  unreadSupplier: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  /** Role-wide broadcast (e.g. all suppliers) when userId is "*". */
  audienceRole?: Role | null;
  title: string;
  body: string;
  kind: "info" | "success" | "warning" | "error";
  link?: string;
  createdAt: string;
  read: boolean;
}
