export function getMatchingProductSkuCodes(planogram: any[], captured: any[]) {
  // Create a Set for quick lookup of SKU-Codes from planogram
  const planogramSkus = new Set(planogram.map((p) => p["SKU-Code"]));

  // Filter captured SKUs that exist in planogram and make them unique
  const matchingSkus = Array.from(new Set(captured.filter((p) => planogramSkus.has(p["SKU-Code"])).map((p) => p["SKU-Code"])));

  return matchingSkus;
}

export function getBoundingBoxesBySku(matchingSkus: string[], planogram: any[], captured: any[]) {
  // Helper function to compute width
  const getWidth = (box: number[][]) => {
    if (!Array.isArray(box) || box.length < 2) return 0;
    const x1 = box[0][0];
    const x2 = box[2]?.[0] ?? x1; // fallback in case of malformed box
    return Math.abs(x2 - x1);
  };

  const results = matchingSkus.map((sku) => {
    const planogram_boundingBoxes = planogram
      .filter((p) => p["SKU-Code"] === sku)
      .map((p) => ({
        box: p["Bounding-Box"],
        width: getWidth(p["Bounding-Box"]),
      }));

    const captured_boundingBoxes = captured
      .filter((p) => p["SKU-Code"] === sku)
      .map((p) => ({
        box: p["Bounding-Box"],
        width: getWidth(p["Bounding-Box"]),
      }));

    return {
      sku,
      planogram_boundingBoxes,
      captured_boundingBoxes,
    };
  });

  return results;
}

export function getScaledWidthsBySku(captured: any[], overallScalingFactor: number) {
  // Adjustable thresholds
  const MIN_CONFIDENCE = 0.5; // Minimum confidence for valid detection

  const results = captured
    .filter((p) => parseFloat(p.Confidence) >= MIN_CONFIDENCE)
    .map((p) => {
      const box = p["Bounding-Box"];

      // Each bounding box has 4 points: [ [x1, y1], [x2, y2], [x3, y3], [x4, y4] ]
      // Width = difference between rightmost and leftmost x-values
      const xValues = box.map((point: number[]) => point[0]);
      const width = Math.abs(Math.max(...xValues) - Math.min(...xValues));

      // Apply overall scaling factor
      const comparableWidth = width / overallScalingFactor;

      return {
        skuCode: p["SKU-Code"],
        product: p.product,
        position: p.Position,
        confidence: parseFloat(p.Confidence),
        originalWidth: width,
        comparableWidth,
        boundingBox: box,
      };
    });

  return results;
}

export function getPlanogramWidths(planogram: any[]) {
  // Adjustable thresholds (if needed in future)
  const MIN_CONFIDENCE = 0.0; // Usually planogram data doesn't have confidence, but kept for flexibility

  const results = planogram
    .filter((p) => !p.Confidence || parseFloat(p.Confidence) >= MIN_CONFIDENCE)
    .map((p) => {
      const box = p["Bounding-Box"];

      // Calculate width from x-coordinates
      const xValues = box.map((point: number[]) => point[0]);
      const width = Math.abs(Math.max(...xValues) - Math.min(...xValues));

      return {
        skuCode: p["SKU-Code"],
        product: p.product || null,
        position: p.Position || null,
        width,
        boundingBox: box,
      };
    });

  return results;
}
