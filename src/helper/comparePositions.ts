export function recalculateCapturedPositions(
  planogram: {
    skuCode: string;
    product: string;
    position: string;
    width: number;
    boundingBox: number[][];
  }[],
  captured: {
    skuCode: string;
    product: string;
    position: string;
    confidence: number;
    originalWidth: number;
    comparableWidth: number;
    boundingBox: number[][];
    recalculatedPosition?: number[];
  }[]
) {
  // 🔧 Adjustable thresholds
  const WIDTH_TOLERANCE_PERCENT = 10; // +/- tolerance for matching widths (e.g., 10%)
  const ROUNDING_THRESHOLD = 0.5; // >= 0.5 means next captured goes to next planogram product

  const updatedCaptured = [...captured]; // clone to avoid mutating input
  let pIndex = 0;
  let cIndex = 0;

  while (pIndex < planogram.length && cIndex < updatedCaptured.length) {
    const planogramItem = planogram[pIndex];
    let remainingPlanogramWidth = planogramItem.width;
    const matchedCaptured: typeof captured = [];

    // collect captured widths until they approximately match planogram width
    while (remainingPlanogramWidth > 0 && cIndex < updatedCaptured.length) {
      const capturedItem = updatedCaptured[cIndex];
      const diff = Math.abs(remainingPlanogramWidth - capturedItem.comparableWidth);
      const diffPercent = (diff / planogramItem.width) * 100;

      // ✅ CASE 1: Nearly equal widths (within tolerance)
      if (diffPercent <= WIDTH_TOLERANCE_PERCENT) {
        matchedCaptured.push(capturedItem);
        remainingPlanogramWidth = 0;
        cIndex++;
        break;
      }

      // ✅ CASE 2: Captured width smaller → accumulate
      if (capturedItem.comparableWidth < remainingPlanogramWidth) {
        matchedCaptured.push(capturedItem);
        remainingPlanogramWidth -= capturedItem.comparableWidth;
        cIndex++;
        continue;
      }

      // ✅ CASE 3: Captured width larger (covers multiple planogram products)
      if (capturedItem.comparableWidth > remainingPlanogramWidth) {
        matchedCaptured.push(capturedItem);

        // calculate how many planogram widths it approximately covers
        let coverageCount = 1;
        let remainingWidth = capturedItem.comparableWidth - remainingPlanogramWidth;
        let tempIndex = pIndex + 1;

        while (tempIndex < planogram.length && remainingWidth >= planogram[tempIndex].width * (1 - WIDTH_TOLERANCE_PERCENT / 100)) {
          remainingWidth -= planogram[tempIndex].width;
          coverageCount++;
          tempIndex++;
        }

        // assign all planogram positions this captured covers
        const positionsCovered = Array.from({ length: coverageCount }, (_, i) => Number(planogram[pIndex + i].position));

        capturedItem["recalculatedPosition"] = positionsCovered;
        updatedCaptured[cIndex] = capturedItem;

        // advance indices
        pIndex += coverageCount;
        cIndex++;
        continue;
      }
    }

    // ✅ CASE 4: multiple captured items matched to one planogram product
    if (matchedCaptured.length > 0) {
      const totalCapturedWidth = matchedCaptured.reduce((sum, c) => sum + c.comparableWidth, 0);

      const widthDiffRatio = Math.abs(totalCapturedWidth - planogramItem.width) / planogramItem.width;

      matchedCaptured.forEach((cItem, i) => {
        let recalculatedPos: number;

        // ✅ If exactly one captured matches this planogram product, keep same position
        if (matchedCaptured.length === 1 && widthDiffRatio < ROUNDING_THRESHOLD) {
          recalculatedPos = Number(planogramItem.position);
        } else {
          recalculatedPos = Number(planogramItem.position) + (i + 1) / 100;
        }

        // Apply rounding adjustment for boundary case
        if (widthDiffRatio >= ROUNDING_THRESHOLD && i === matchedCaptured.length - 1) {
          recalculatedPos = Number(planogramItem.position) + 1;
        }

        cItem["recalculatedPosition"] = [parseFloat(recalculatedPos.toFixed(2))];
        updatedCaptured[captured.indexOf(cItem)] = cItem;
      });

      pIndex++;
    }
  }

  // ✅ handle remaining captured (planogram exhausted)
  while (cIndex < updatedCaptured.length) {
    updatedCaptured[cIndex]["recalculatedPosition"] = [];
    cIndex++;
  }

  return updatedCaptured;
}
