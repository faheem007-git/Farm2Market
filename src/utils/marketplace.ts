/** Distances (km) from the buyer's hub (Hyderabad) to growing regions. */
const DISTANCE_KM: Record<string, number> = {
  Hyderabad: 15,
  Secunderabad: 25,
  Rajahmundry: 210,
  Kurnool: 210,
  Guntur: 270,
  Nashik: 560,
};

export function distanceKm(location: string): number {
  return DISTANCE_KM[location] ?? 300;
}

export type DiscoverSort =
  | "best-match"
  | "lowest-price"
  | "highest-availability"
  | "nearest"
  | "recently-added";

export const SORT_LABELS: Record<DiscoverSort, string> = {
  "best-match": "Best Match",
  "lowest-price": "Lowest Price",
  "highest-availability": "Highest Availability",
  nearest: "Nearest",
  "recently-added": "Recently Added",
};

const GRADE_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

/** Demo "best match": grade first, then price, then quantity. */
export function bestMatchScore(pricePerKg: number, grade: string, quantityKg: number): number {
  return (GRADE_RANK[grade] ?? 9) * 100000 - quantityKg / 1000 + pricePerKg / 100;
}
