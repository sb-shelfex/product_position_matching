/**
 * Given bounding box data (with widths) for each SKU,
 * calculate the scaling factor between captured and planogram widths.
 * 
 * Tunable parameters are defined at the top for easy adjustment.
 */
export function getScalingFactors(boundingBoxData: any[]) {
  // 🔧 Tunable Parameters (Thresholds)
  const STD_DEV_MULTIPLIER = 1.5;          // Determines how far from mean to treat as outlier
  const MODE_CLUSTER_TOLERANCE = 2;        // Width difference allowed when averaging around mode
  const ROUNDING_PRECISION = 0.5;          // Width rounding step when finding mode (0.5 units)
  const DECIMAL_PRECISION = 3;             // Rounding precision for final scaling factor

  // Helper to find "representative" width
  function findRepresentativeWidth(widths: number[]): number {
    if (!widths || widths.length === 0) return 0;

    // Sort widths for stable processing
    const sorted = [...widths].sort((a, b) => a - b);

    // Compute mean and standard deviation
    const mean = sorted.reduce((sum, w) => sum + w, 0) / sorted.length;
    const variance =
      sorted.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) /
      sorted.length;
    const stdDev = Math.sqrt(variance);

    // Filter out outliers beyond mean ± STD_DEV_MULTIPLIER * stdDev
    const filtered = sorted.filter(
      (w) => w >= mean - STD_DEV_MULTIPLIER * stdDev && w <= mean + STD_DEV_MULTIPLIER * stdDev
    );

    if (filtered.length === 0) return mean;

    // Round to nearest ROUNDING_PRECISION (e.g., 0.5) and find most frequent width
    const freqMap = new Map<number, number>();
    filtered.forEach((w) => {
      const rounded = Math.round(w / ROUNDING_PRECISION) * ROUNDING_PRECISION;
      freqMap.set(rounded, (freqMap.get(rounded) || 0) + 1);
    });

    let modeWidth = 0;
    let maxCount = 0;
    freqMap.forEach((count, width) => {
      if (count > maxCount) {
        maxCount = count;
        modeWidth = width;
      }
    });

    // Average all values near that mode width (within ±MODE_CLUSTER_TOLERANCE)
    const cluster = filtered.filter(
      (w) => Math.abs(w - modeWidth) <= MODE_CLUSTER_TOLERANCE
    );
    const avgCluster = cluster.reduce((sum, w) => sum + w, 0) / cluster.length;

    return avgCluster;
  }

  // Compute scaling factors
  const results = boundingBoxData.map((item) => {
    const planogramWidths = item.planogram_boundingBoxes.map((b: any) => b.width);
    const capturedWidths = item.captured_boundingBoxes.map((b: any) => b.width);

    const planogramRepWidth = findRepresentativeWidth(planogramWidths);
    const capturedRepWidth = findRepresentativeWidth(capturedWidths);

    const scalingFactor =
      planogramRepWidth > 0
        ? capturedRepWidth / planogramRepWidth
        : 0;

    return {
      sku: item.sku,
      planogramWidth: planogramRepWidth,
      capturedWidth: capturedRepWidth,
      scalingFactor: Number(scalingFactor.toFixed(DECIMAL_PRECISION)),
    };
  });

  return results;
}

/**
 * Given scaling factors for multiple SKUs, find the representative global scaling factor.
 * 
 * It removes outliers, finds the most common cluster of values,
 * and averages them to produce a stable scaling factor.
 */
export function getRepresentativeScalingFactor(results: any[]) {
  // 🔧 Tunable Parameters
  const STD_DEV_MULTIPLIER = 1.5;      // Outlier cutoff (based on std deviation)
  const MODE_CLUSTER_TOLERANCE = 0.05; // ± range around dominant value (5%)
  const ROUNDING_PRECISION = 0.01;     // Precision for grouping (0.01 = 1%)
  const DECIMAL_PRECISION = 3;         // Final output precision

  // Extract scaling factors
  const scalingFactors = results
    .map((r) => r.scalingFactor)
    .filter((v) => typeof v === "number" && v > 0);

  if (scalingFactors.length === 0) return 0;

  // Sort for stable processing
  const sorted = [...scalingFactors].sort((a, b) => a - b);

  // Compute mean and std deviation
  const mean = sorted.reduce((sum, s) => sum + s, 0) / sorted.length;
  const variance =
    sorted.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  // Remove outliers (mean ± 1.5 * stdDev)
  const filtered = sorted.filter(
    (s) => s >= mean - STD_DEV_MULTIPLIER * stdDev && s <= mean + STD_DEV_MULTIPLIER * stdDev
  );

  if (filtered.length === 0) return Number(mean.toFixed(DECIMAL_PRECISION));

  // Round and find most frequent scaling factor
  const freqMap = new Map<number, number>();
  filtered.forEach((s) => {
    const rounded = Math.round(s / ROUNDING_PRECISION) * ROUNDING_PRECISION;
    freqMap.set(rounded, (freqMap.get(rounded) || 0) + 1);
  });

  let mode = 0, maxCount = 0;
  freqMap.forEach((count, val) => {
    if (count > maxCount) {
      maxCount = count;
      mode = val;
    }
  });

  // Average all values close to the mode
  const cluster = filtered.filter((s) => Math.abs(s - mode) <= MODE_CLUSTER_TOLERANCE);
  const avgCluster = cluster.reduce((sum, s) => sum + s, 0) / cluster.length;

  return Number(avgCluster.toFixed(DECIMAL_PRECISION));
}

