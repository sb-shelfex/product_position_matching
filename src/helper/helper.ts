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
        stackSize: p.stackSize,
        stacked: p.stacked,
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
        stackSize: p.stackSize,
        stacked: p.stacked,
      };
    });

  return results;
}

export function compareResult(preDefinedResult: any[], calculatedResult: any[], testNo: number) {
  const comparison: any[] = [];
  let total = Math.min(preDefinedResult.length, calculatedResult.length);
  let matchedCount = 0;

  for (let i = 0; i < total; i++) {
    const pre = preDefinedResult[i];
    const calc = calculatedResult[i];

    const positionMatched = Number(pre.position) === Number(calc.position);
    const statusMatched = pre.matchingStatus.toLowerCase() === calc.matchingStatus.toLowerCase();

    if (positionMatched || statusMatched) matchedCount++;

    comparison.push({
      index: i + 1,
      predefinedPosition: pre.position,
      calculatedPosition: calc.position,
      positionMatched,
      predefinedStatus: pre.matchingStatus,
      calculatedStatus: calc.matchingStatus,
      statusMatched,
    });
  }

  const analytics = {
    testNo,
    compared: Math.max(preDefinedResult.length, calculatedResult.length),
    matched: matchedCount,
    result: (matchedCount / Math.max(preDefinedResult.length, calculatedResult.length)) * 100,
  };

  return { comparison, analytics };
}

function centerY(box: any): number {
  if (!box?.length) return 0;
  const ys = box.map((p: any) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return (minY + maxY) / 2;
}

export function sortStackTopToBottom<T extends { boundingBox: any }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => centerY(a.boundingBox) - centerY(b.boundingBox));
}

export function compareStacks(capturedStack: any[], planogramStack: any[]) {
  const minLen = Math.min(capturedStack.length, planogramStack.length);
  const matches: any = [];

  let matchedPairs = 0;

  for (let i = 0; i < minLen; i++) {
    const c = capturedStack[i];
    const p = planogramStack[i];
    const isMatch = c.skuCode === p.skuCode;

    // push match result summary
    matches.push({
      capturedIndex: i,
      planogramIndex: i,
      capturedSku: c.skuCode,
      planogramSku: p.skuCode,
      status: isMatch ? "matched" : "sku_mismatch",
    });

    // 🔄 also embed the relationship directly into the captured stack item
    capturedStack[i] = {
      ...c,
      matchedPlanogramProduct: p,
      stackMatchingStatus: isMatch ? "matched" : "sku_mismatch",
    };

    if (isMatch) matchedPairs++;
  }

  const extraCaptured = Math.max(0, capturedStack.length - planogramStack.length);
  const missingInCaptured = Math.max(0, planogramStack.length - capturedStack.length);

  const comparedPairs = minLen;
  const denom = comparedPairs + extraCaptured + missingInCaptured || 1;
  const accuracy = matchedPairs / denom;

  // decide overall status
  let overall: any;
  if (matchedPairs === comparedPairs && extraCaptured === 0 && missingInCaptured === 0) {
    overall = "matched";
  } else if (matchedPairs > 0) {
    overall = "partial_match";
  } else {
    overall = "mismatch";
  }

  // 🔁 Mark any extra captured stack items (no planogram counterpart)
  if (extraCaptured > 0) {
    for (let i = minLen; i < capturedStack.length; i++) {
      capturedStack[i] = {
        ...capturedStack[i],
        matchedPlanogramProduct: undefined,
        stackMatchingStatus: "extra_captured",
      };
    }
  }

  return {
    overall,
    matches,
    summary: {
      comparedPairs,
      matchedPairs,
      extraCaptured,
      missingInCaptured,
      accuracy,
    },
  };
}
