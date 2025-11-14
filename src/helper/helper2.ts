import { skusData } from "../datas/skus";
import { findRepresentativeWidth } from "./getClusterData";

/**
 * Try to get "actual" (original) width for a product SKU.
 *  - First tries common fields on the product object (originalWidth, actualWidth, planWidth, width).
 *  - If not found, calls fetchActualWidthFromDB which is a placeholder you should replace with real cache/db lookup.
 */
async function getActualWidthBySku(sku: string, productCandidate?: any): Promise<number | null> {
  if (!sku && !productCandidate) return null;

  // 1) If productCandidate provided and has fields, prefer them
  const candidates = [productCandidate];
  for (const c of candidates) {
    if (!c) continue;
    const maybe = c.originalWidth ?? c.actualWidth ?? c.planWidth ?? c.width ?? c.productWidth ?? null;
    if (maybe != null && !Number.isNaN(Number(maybe)) && Number(maybe) > 0) {
      return Number(maybe);
    }
  }

  // 2) fallback to DB/cache lookup (implement this to use your store)
  const fromDb = await fetchActualWidthFromDB(sku);
  if (fromDb != null && !Number.isNaN(Number(fromDb)) && Number(fromDb) > 0) return Number(fromDb);

  return null;
}

/**
 * Placeholder for async DB/cache retrieval. Replace this function with your actual cache/db call.
 * Should return a number (original product width in the same "planogram" units) or null.
 */
async function fetchActualWidthFromDB(sku: string): Promise<number | null> {
  // TODO: replace with your cache/db call (Redis / DB / REST) to fetch original width for SKU.
  // Example:
  // const record = await myCache.get(`width:${sku}`);
  // return record ? Number(record) : null;

  return null; // default placeholder
}

// Compute width (x-span) from a bounding box array: [ [x1,y1],[x2,y2],[x3,y3],[x4,y4] ]
function measuredWidthFromBoundingBox(box: number[][]): number {
  if (!Array.isArray(box) || box.length === 0) return 0;
  const xs = box.map((pt) => pt[0]);
  return Math.abs(Math.max(...xs) - Math.min(...xs));
}

// Remove outliers using IQR method. Returns filtered array.
function filterOutliersIQR(values: number[]) {
  if (!values || values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return sorted.filter((v) => v >= lower && v <= upper);
}

//  Median helper
function median(values: number[]) {
  if (!values || values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Given an array of products (captured or planogram), compute representative scale(s).
 *
 * For each product:
 *  - measure width from bounding box (pixels)
 *  - find actualWidth (planogram/original unit) from provided product object or db/cache
 *  - per-product scale = measuredWidth / actualWidth (unitless)
 *  - optional sfScaledToRef = scale * referenceWidth (if you want that value too)
 *
 * Remove outliers (IQR) and return medians.
 */
export async function computeRepresentativeScaleFromProducts(
  products: any[],
  opts?: {
    minConfidence?: number;
    referenceWidth?: number;
    source?: "captured" | "planogram";
  }
) {
  const MIN_CONFIDENCE = opts?.minConfidence ?? 0.5;
  const referenceWidth = opts?.referenceWidth ?? 1000;

  const perProductScales: number[] = [];
  const perProductScaledToRef: number[] = [];

  for (const p of products || []) {
    // for captured items check confidence when available
    // const confidence = p?.Confidence != null ? parseFloat(p.Confidence) : 1;
    // if (confidence < MIN_CONFIDENCE) continue;

    const box = p["Bounding-Box"] ?? p.boundingBox ?? null;
    const measured = measuredWidthFromBoundingBox(box);
    if (!measured || measured <= 0) continue;

    // try to get actual/original width
    const skuCode = p["SKU-Code"] ?? p.skuCode ?? p.sku ?? null;
    // const actualWidth = (await getActualWidthBySku(sku, p)) ?? (p.actualWidth ?? p.originalWidth ?? null);
    const actualWidth = skusData.find((s) => s.code === skuCode)?.width ?? null;

    // if actualWidth not present, skip (can't compute scale)
    if (!actualWidth || actualWidth <= 0) continue;

    const scale = measured / Number(actualWidth); // unitless
    const sfScaled = scale * referenceWidth; // scaled to reference width (if you want)
    if (!Number.isFinite(scale) || Number.isNaN(scale)) continue;

    perProductScales.push(scale);
    perProductScaledToRef.push(sfScaled);
  }

  // Not enough data
  if (perProductScales.length === 0) {
    return {
      representativeScale: null,
      representativeScaledToRef: null,
      count: 0,
      rawScales: [],
      rawScaledToRef: [],
    };
  }

  const repScale = findRepresentativeWidth(perProductScales);
  const repScaledToRef = findRepresentativeWidth(perProductScaledToRef);

  return {
    representativeScale: repScale, // unitless (measured / actual)
    representativeScaledToRef: repScaledToRef, // scale * referenceWidth
    count: perProductScales.length,
    rawScales: perProductScales,
    rawScaledToRef: perProductScaledToRef,
  };
}
