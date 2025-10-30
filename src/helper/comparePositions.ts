// export function recalculateCapturedPositions(
//   planogram: {
//     skuCode: string;
//     product: string;
//     position: string;
//     width: number;
//     boundingBox: number[][];
//   }[],
//   captured: {
//     skuCode: string;
//     product: string;
//     position: string;
//     confidence: number;
//     originalWidth: number;
//     comparableWidth: number;
//     boundingBox: number[][];
//     recalculatedPosition?: number[];
//   }[]
// ) {
//   // 🔧 Adjustable thresholds
//   const WIDTH_TOLERANCE_PERCENT = 10; // +/- tolerance for matching widths (e.g., 10%)
//   const ROUNDING_THRESHOLD = 0.5; // >= 0.5 means next captured goes to next planogram product

//   const updatedCaptured = [...captured]; // clone to avoid mutating input
//   let pIndex = 0;
//   let cIndex = 0;

//   while (pIndex < planogram.length && cIndex < updatedCaptured.length) {
//     const planogramItem = planogram[pIndex];
//     let remainingPlanogramWidth = planogramItem.width;
//     const matchedCaptured: typeof captured = [];

//     // collect captured widths until they approximately match planogram width
//     while (remainingPlanogramWidth > 0 && cIndex < updatedCaptured.length) {
//       const capturedItem = updatedCaptured[cIndex];
//       const diff = Math.abs(remainingPlanogramWidth - capturedItem.comparableWidth);
//       const diffPercent = (diff / planogramItem.width) * 100;

//       // ✅ CASE 1: Nearly equal widths (within tolerance)
//       if (diffPercent <= WIDTH_TOLERANCE_PERCENT) {
//         matchedCaptured.push(capturedItem);
//         remainingPlanogramWidth = 0;
//         cIndex++;
//         break;
//       }

//       // ✅ CASE 2: Captured width smaller → accumulate
//       if (capturedItem.comparableWidth < remainingPlanogramWidth) {
//         matchedCaptured.push(capturedItem);
//         remainingPlanogramWidth -= capturedItem.comparableWidth;
//         cIndex++;
//         continue;
//       }

//       // ✅ CASE 3: Captured width larger (covers multiple planogram products)
//       if (capturedItem.comparableWidth > remainingPlanogramWidth) {
//         matchedCaptured.push(capturedItem);

//         // calculate how many planogram widths it approximately covers
//         let coverageCount = 1;
//         let remainingWidth = capturedItem.comparableWidth - remainingPlanogramWidth;
//         let tempIndex = pIndex + 1;

//         while (tempIndex < planogram.length && remainingWidth >= planogram[tempIndex].width * (1 - WIDTH_TOLERANCE_PERCENT / 100)) {
//           remainingWidth -= planogram[tempIndex].width;
//           coverageCount++;
//           tempIndex++;
//         }

//         // assign all planogram positions this captured covers
//         const positionsCovered = Array.from(
//           { length: coverageCount },
//           (_, i) => {
//             const planogramItem = planogram[pIndex + i];
//             return planogramItem ? Number(planogramItem.position) : null;
//           }
//         ).filter((pos) => pos !== null);


//         capturedItem["recalculatedPosition"] = positionsCovered;
//         updatedCaptured[cIndex] = capturedItem;

//         // advance indices
//         pIndex += coverageCount;
//         cIndex++;
//         continue;
//       }
//     }

//     // ✅ CASE 4: multiple captured items matched to one planogram product
//     if (matchedCaptured.length > 0) {
//       const totalCapturedWidth = matchedCaptured.reduce((sum, c) => sum + c.comparableWidth, 0);

//       const widthDiffRatio = Math.abs(totalCapturedWidth - planogramItem.width) / planogramItem.width;

//       matchedCaptured.forEach((cItem, i) => {
//         let recalculatedPos: number;

//         // ✅ If exactly one captured matches this planogram product, keep same position
//         if (matchedCaptured.length === 1 && widthDiffRatio < ROUNDING_THRESHOLD) {
//           recalculatedPos = Number(planogramItem.position);
//         } else {
//           recalculatedPos = Number(planogramItem.position) + (i + 1) / 100;
//         }

//         // Apply rounding adjustment for boundary case
//         if (widthDiffRatio >= ROUNDING_THRESHOLD && i === matchedCaptured.length - 1) {
//           recalculatedPos = Number(planogramItem.position) + 1;
//         }

//         cItem["recalculatedPosition"] = [parseFloat(recalculatedPos.toFixed(2))];
//         updatedCaptured[captured.indexOf(cItem)] = cItem;
//       });

//       pIndex++;
//     }
//   }

//   // ✅ handle remaining captured (planogram exhausted)
//   while (cIndex < updatedCaptured.length) {
//     updatedCaptured[cIndex]["recalculatedPosition"] = [];
//     cIndex++;
//   }

//   return updatedCaptured;
// }

// export function matchProductsInCapturedToPlanogram(capturedImage: any, planogramImage: any) {
//   const matchedResults = capturedImage.map((captured: any) => {
//     const posArr = captured.recalculatedPosition;

//     // Case 1: invalid or empty positions
//     if (!Array.isArray(posArr) || posArr.length === 0) {
//       return { ...captured, matchingStatus: "invalid_position" };
//     }

//     // Case 2: multiple positions → product spans multiple slots
//     if (posArr.length > 1) {
//       return { ...captured, matchingStatus: "multi_slot" };
//     }

//     // Case 3: single position
//     const pos = posArr[0];

//     // Check if it's a whole integer
//     if (Number.isInteger(pos)) {
//       // Find corresponding planogram product
//       const planogramProduct = planogramImage.find((p: any) => Number(p.position) === pos);

//       if (!planogramProduct) {
//         return { ...captured, matchingStatus: "no_planogram_match" };
//       }

//       // Compare SKU codes
//       if (captured.skuCode === planogramProduct.skuCode) {
//         return {
//           ...captured,
//           matchingStatus: "matched",
//           matchedPlanogramProduct: planogramProduct,
//         };
//       } else {
//         return {
//           ...captured,
//           matchingStatus: "sku_mismatch",
//           matchedPlanogramProduct: planogramProduct,
//         };
//       }
//     }

//     // Case 4: Decimal → partial overlap
//     if (!Number.isInteger(pos)) {
//       return { ...captured, matchingStatus: "partial_slot" };
//     }

//     // Fallback
//     return { ...captured, matchingStatus: "invalid_position" };
//   });

//   return matchedResults;
// }



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
  const WIDTH_TOLERANCE_PERCENT = 15; // Increased tolerance for better matching
  const MULTI_SLOT_THRESHOLD = 1.5; // Captured width > 1.5x planogram = multi-slot

  const updatedCaptured = [...captured];
  let pIndex = 0;
  let cIndex = 0;

  while (pIndex < planogram.length && cIndex < updatedCaptured.length) {
    const planogramItem = planogram[pIndex];
    const capturedItem = updatedCaptured[cIndex];

    const widthRatio = capturedItem.comparableWidth / planogramItem.width;
    const diffPercent = Math.abs(capturedItem.comparableWidth - planogramItem.width) / planogramItem.width * 100;

    // ✅ CASE 1: Single captured product matches single planogram slot
    if (diffPercent <= WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
      capturedItem.recalculatedPosition = [Number(planogramItem.position)];
      updatedCaptured[cIndex] = capturedItem;
      pIndex++;
      cIndex++;
      continue;
    }

    // ✅ CASE 2: Captured product spans multiple planogram slots
    if (widthRatio >= MULTI_SLOT_THRESHOLD) {
      // Calculate how many slots it covers
      let remainingWidth = capturedItem.comparableWidth;
      const coveredPositions: number[] = [];
      let tempIndex = pIndex;

      while (tempIndex < planogram.length && remainingWidth > planogram[tempIndex].width * 0.5) {
        coveredPositions.push(Number(planogram[tempIndex].position));
        remainingWidth -= planogram[tempIndex].width;
        tempIndex++;
      }

      capturedItem.recalculatedPosition = coveredPositions;
      updatedCaptured[cIndex] = capturedItem;
      pIndex = tempIndex;
      cIndex++;
      continue;
    }

    // ✅ CASE 3: Multiple captured products needed to fill one planogram slot
    if (capturedItem.comparableWidth < planogramItem.width) {
      const matchedCaptured: typeof captured = [];
      let accumulatedWidth = 0;
      let tempCIndex = cIndex;

      // Accumulate captured products until we match planogram width
      while (
        tempCIndex < updatedCaptured.length &&
        accumulatedWidth < planogramItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)
      ) {
        matchedCaptured.push(updatedCaptured[tempCIndex]);
        accumulatedWidth += updatedCaptured[tempCIndex].comparableWidth;
        tempCIndex++;
      }

      // Assign fractional positions
      matchedCaptured.forEach((item, idx) => {
        if (matchedCaptured.length === 1) {
          item.recalculatedPosition = [Number(planogramItem.position)];
        } else {
          const fractionalPos = Number(planogramItem.position) + (idx + 1) / 100;
          item.recalculatedPosition = [parseFloat(fractionalPos.toFixed(2))];
        }
        updatedCaptured[captured.indexOf(item)] = item;
      });

      pIndex++;
      cIndex = tempCIndex;
      continue;
    }

    // Fallback: move to next
    capturedItem.recalculatedPosition = [];
    cIndex++;
  }

  // Handle remaining captured products (no planogram match)
  while (cIndex < updatedCaptured.length) {
    updatedCaptured[cIndex].recalculatedPosition = [];
    cIndex++;
  }

  return updatedCaptured;
}

export function matchProductsInCapturedToPlanogram(capturedImage: any, planogramImage: any) {
  const matchedResults = capturedImage.map((captured: any) => {
    const posArr = captured.recalculatedPosition;

    // Case 1: invalid or empty positions
    if (!Array.isArray(posArr) || posArr.length === 0) {
      return { ...captured, matchingStatus: "invalid_position" };
    }

    // Case 2: multiple positions → product spans multiple slots
    if (posArr.length > 1) {
      return { ...captured, matchingStatus: "multi_slot" };
    }

    // Case 3: single position
    const pos = posArr[0];

    // Check if it's a whole integer
    if (Number.isInteger(pos)) {
      // Find corresponding planogram product
      const planogramProduct = planogramImage.find((p: any) => Number(p.position) === pos);

      if (!planogramProduct) {
        return { ...captured, matchingStatus: "no_planogram_match" };
      }

      // Compare SKU codes
      if (captured.skuCode === planogramProduct.skuCode) {
        return {
          ...captured,
          matchingStatus: "matched",
          matchedPlanogramProduct: planogramProduct,
        };
      } else {
        return {
          ...captured,
          matchingStatus: "sku_mismatch",
          matchedPlanogramProduct: planogramProduct,
        };
      }
    }

    // Case 4: Decimal → partial overlap
    if (!Number.isInteger(pos)) {
      return { ...captured, matchingStatus: "partial_slot" };
    }

    // Fallback
    return { ...captured, matchingStatus: "invalid_position" };
  });

  return matchedResults;
}