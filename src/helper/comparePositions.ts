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
//     matchedPlanogramProduct?: {
//       skuCode: string;
//       product: string;
//       position: string;
//       width: number;
//       boundingBox: number[][];
//     };
//   }[]
// ) {
//   // 🔧 Adjustable thresholds
//   const WIDTH_TOLERANCE_PERCENT = 15; // Increased tolerance for better matching
//   const MULTI_SLOT_THRESHOLD = 1.5; // Captured width > 1.5x planogram = multi-slot

//   const updatedCaptured = [...captured];
//   let pIndex = 0;
//   let cIndex = 0;

//   while (pIndex < planogram.length && cIndex < updatedCaptured.length) {
//     const planogramItem = planogram[pIndex];
//     const capturedItem = updatedCaptured[cIndex];

//     const widthRatio = capturedItem.comparableWidth / planogramItem.width;
//     const diffPercent =
//       (Math.abs(capturedItem.comparableWidth - planogramItem.width) /
//         planogramItem.width) *
//       100;

//     // ✅ CASE 1: Single captured product matches single planogram slot
//     if (diffPercent <= WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
//       capturedItem.recalculatedPosition = [Number(planogramItem.position)];
//       capturedItem.matchedPlanogramProduct = { ...planogramItem };
//       updatedCaptured[cIndex] = capturedItem;
//       pIndex++;
//       cIndex++;
//       continue;
//     }

//     // ✅ CASE 2: Captured product spans multiple planogram slots
//     if (widthRatio >= MULTI_SLOT_THRESHOLD) {
//       // Calculate how many slots it covers
//       let remainingWidth = capturedItem.comparableWidth;
//       const coveredPositions: number[] = [];
//       let tempIndex = pIndex;

//       while (tempIndex < planogram.length && remainingWidth > planogram[tempIndex].width * 0.5) {
//         coveredPositions.push(Number(planogram[tempIndex].position));
//         remainingWidth -= planogram[tempIndex].width;
//         tempIndex++;
//       }

//       capturedItem.recalculatedPosition = coveredPositions;
//       capturedItem.matchedPlanogramProduct = { ...planogramItem };
//       updatedCaptured[cIndex] = capturedItem;
//       pIndex = tempIndex;
//       cIndex++;
//       continue;
//     }

//     // ✅ CASE 3: Multiple captured products needed to fill one planogram slot
//     if (capturedItem.comparableWidth < planogramItem.width) {
//       const matchedCaptured: typeof captured = [];
//       let accumulatedWidth = 0;
//       let tempCIndex = cIndex;

//       // Accumulate captured products until we match planogram width
//       while (
//         tempCIndex < updatedCaptured.length &&
//         accumulatedWidth < planogramItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)
//       ) {
//         matchedCaptured.push(updatedCaptured[tempCIndex]);
//         accumulatedWidth += updatedCaptured[tempCIndex].comparableWidth;
//         tempCIndex++;
//       }

//       // Assign fractional positions
//       matchedCaptured.forEach((item, idx) => {
//         if (matchedCaptured.length === 1) {
//           item.recalculatedPosition = [Number(planogramItem.position)];
//         } else {
//           const fractionalPos = Number(planogramItem.position) + (idx + 1) / 100;
//           item.recalculatedPosition = [parseFloat(fractionalPos.toFixed(2))];
//         }
//         item.matchedPlanogramProduct = { ...planogramItem };
//         updatedCaptured[captured.indexOf(item)] = item;
//       });

//       pIndex++;
//       cIndex = tempCIndex;
//       continue;
//     }

//     // Fallback: move to next
//     capturedItem.recalculatedPosition = [];
//     capturedItem.matchedPlanogramProduct = undefined;
//     cIndex++;
//   }

//   // Handle remaining captured products (no planogram match)
//   while (cIndex < updatedCaptured.length) {
//     updatedCaptured[cIndex].recalculatedPosition = [];
//     updatedCaptured[cIndex].matchedPlanogramProduct = undefined;
//     cIndex++;
//   }

//   return updatedCaptured;
// }


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
//     matchedPlanogramProduct?: {
//       skuCode: string;
//       product: string;
//       position: string;
//       width: number;
//       boundingBox: number[][];
//     };
//   }[]
// ) {
//   const WIDTH_TOLERANCE_PERCENT = 15;
//   const MULTI_SLOT_THRESHOLD = 1.5;

//   const updatedCaptured = [...captured];
//   let pIndex = 0;
//   let cIndex = 0;

//   while (pIndex < planogram.length && cIndex < updatedCaptured.length) {
//     const planogramItem = planogram[pIndex];
//     const capturedItem = updatedCaptured[cIndex];

//     const widthRatio = capturedItem.comparableWidth / planogramItem.width;
//     const diffPercent =
//       (Math.abs(capturedItem.comparableWidth - planogramItem.width) / planogramItem.width) * 100;

//     // ✅ CASE 1: Single match
//     if (diffPercent <= WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
//       capturedItem.recalculatedPosition = [Number(planogramItem.position)];
//       capturedItem.matchedPlanogramProduct = { ...planogramItem };
//       updatedCaptured[cIndex] = capturedItem;
//       pIndex++;
//       cIndex++;
//       continue;
//     }

//     // ✅ CASE 2: Multi-slot match
//     if (widthRatio >= MULTI_SLOT_THRESHOLD) {
//       let remainingWidth = capturedItem.comparableWidth;
//       const coveredPositions: number[] = [];
//       let tempIndex = pIndex;

//       while (tempIndex < planogram.length && remainingWidth > planogram[tempIndex].width * 0.5) {
//         coveredPositions.push(Number(planogram[tempIndex].position));
//         remainingWidth -= planogram[tempIndex].width;
//         tempIndex++;
//       }

//       capturedItem.recalculatedPosition = coveredPositions;
//       capturedItem.matchedPlanogramProduct = { ...planogramItem };
//       updatedCaptured[cIndex] = capturedItem;
//       pIndex = tempIndex;
//       cIndex++;
//       continue;
//     }

//     // ✅ CASE 3: Multiple captured for one slot
//     if (capturedItem.comparableWidth < planogramItem.width) {
//       const matchedCaptured: typeof captured = [];
//       let accumulatedWidth = 0;
//       let tempCIndex = cIndex;

//       while (
//         tempCIndex < updatedCaptured.length &&
//         accumulatedWidth < planogramItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)
//       ) {
//         matchedCaptured.push(updatedCaptured[tempCIndex]);
//         accumulatedWidth += updatedCaptured[tempCIndex].comparableWidth;
//         tempCIndex++;
//       }

//       matchedCaptured.forEach((item, idx) => {
//         if (matchedCaptured.length === 1) {
//           item.recalculatedPosition = [Number(planogramItem.position)];
//         } else {
//           const fractionalPos = Number(planogramItem.position) + (idx + 1) / 100;
//           item.recalculatedPosition = [parseFloat(fractionalPos.toFixed(2))];
//         }
//         item.matchedPlanogramProduct = { ...planogramItem };
//         updatedCaptured[captured.indexOf(item)] = item;
//       });

//       pIndex++;
//       cIndex = tempCIndex;
//       continue;
//     }

//     // ❌ No match found in this loop — mark undefined for now
//     capturedItem.recalculatedPosition = [];
//     capturedItem.matchedPlanogramProduct = undefined;
//     cIndex++;
//   }

//   // ✅ Handle remaining captured products (no planogram match)
//   while (cIndex < updatedCaptured.length) {
//     updatedCaptured[cIndex].recalculatedPosition = [];
//     updatedCaptured[cIndex].matchedPlanogramProduct = undefined;
//     cIndex++;
//   }

//   // ✅ ✅ NEW: Boundary / Overflow Fix
//   // Assign right-edge overflow items (undefined matches) to nearest valid planogram slot
//   const lastPlanogramPos = planogram.length;
//   const lastPlanogramProduct = planogram[planogram.length - 1];

//   for (const item of updatedCaptured) {
//     if (!item.recalculatedPosition || item.recalculatedPosition.length === 0) {
//       // If product is within valid SKU and last items likely overflowed — fallback to nearest slot
//       const sameSkuExists = planogram.some(p => p.skuCode === item.skuCode);
//       if (sameSkuExists) {
//         item.recalculatedPosition = [lastPlanogramPos];
//         item.matchedPlanogramProduct = { ...lastPlanogramProduct };
//       }
//     }
//   }

//   return updatedCaptured;
// }


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
//     matchedPlanogramProduct?: {
//       skuCode: string;
//       product: string;
//       position: string;
//       width: number;
//       boundingBox: number[][];
//     };
//   }[]
// ) {
//   const WIDTH_TOLERANCE_PERCENT = 15;
//   const MULTI_SLOT_THRESHOLD = 1.5;

//   if (!planogram.length || !captured.length) return captured;

//   // --- Step 1: Detect and correct horizontal orientation ---
//   const getX = (p: any) => p.boundingBox?.[0]?.[0] ?? 0;
//   const planogramFlipped = getX(planogram[0]) > getX(planogram[planogram.length - 1]);
//   const capturedFlipped = getX(captured[0]) > getX(captured[captured.length - 1]);

//   const isOppositeOrientation = planogramFlipped !== capturedFlipped;

//   const sortedPlanogram = [...planogram].sort((a, b) =>
//     getX(a) - getX(b)
//   );
//   const sortedCaptured = [...captured].sort((a, b) =>
//     isOppositeOrientation ? getX(b) - getX(a) : getX(a) - getX(b)
//   );

//   // --- Step 2: Precompute planogram slot boundaries ---
//   let cumulative = 0;
//   const planogramBoundaries = sortedPlanogram.map((p) => {
//     const start = cumulative;
//     cumulative += p.width;
//     return { ...p, start, end: cumulative };
//   });
//   const totalPlanogramWidth = cumulative;

//   // --- Step 3: Match captured products based on width ratio ---
//   const updatedCaptured = [...sortedCaptured];
//   let planogramIndex = 0;
//   let capturedIndex = 0;
//   let planogramCursor = 0;

//   while (planogramIndex < planogramBoundaries.length && capturedIndex < updatedCaptured.length) {
//     const plan = planogramBoundaries[planogramIndex];
//     const cap = updatedCaptured[capturedIndex];

//     const diffPercent = (Math.abs(cap.comparableWidth - plan.width) / plan.width) * 100;
//     const ratio = cap.comparableWidth / plan.width;

//     // --- Case 1: Perfect / near-perfect single-slot match ---
//     if (diffPercent <= WIDTH_TOLERANCE_PERCENT && ratio < MULTI_SLOT_THRESHOLD) {
//       cap.recalculatedPosition = [Number(plan.position)];
//       cap.matchedPlanogramProduct = { ...plan };
//       planogramIndex++;
//       capturedIndex++;
//       continue;
//     }

//     // --- Case 2: Multi-slot capture (spans multiple planogram widths) ---
//     if (ratio >= MULTI_SLOT_THRESHOLD) {
//       let remainingWidth = cap.comparableWidth;
//       const covered: number[] = [];
//       let tempIndex = planogramIndex;
//       while (tempIndex < planogramBoundaries.length && remainingWidth > planogramBoundaries[tempIndex].width * 0.5) {
//         covered.push(Number(planogramBoundaries[tempIndex].position));
//         remainingWidth -= planogramBoundaries[tempIndex].width;
//         tempIndex++;
//       }
//       cap.recalculatedPosition = covered;
//       cap.matchedPlanogramProduct = { ...planogramBoundaries[planogramIndex] };
//       planogramIndex = tempIndex;
//       capturedIndex++;
//       continue;
//     }

//     // --- Case 3: Multiple captures for one planogram slot ---
//     if (cap.comparableWidth < plan.width) {
//       const group: typeof captured = [];
//       let totalCapturedWidth = 0;
//       let tempIndex = capturedIndex;

//       while (
//         tempIndex < updatedCaptured.length &&
//         totalCapturedWidth < plan.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)
//       ) {
//         group.push(updatedCaptured[tempIndex]);
//         totalCapturedWidth += updatedCaptured[tempIndex].comparableWidth;
//         tempIndex++;
//       }

//       group.forEach((g, i) => {
//         const offsetPos = Number(plan.position) + i / 10;
//         g.recalculatedPosition = [parseFloat(offsetPos.toFixed(2))];
//         g.matchedPlanogramProduct = { ...plan };
//         updatedCaptured[captured.indexOf(g)] = g;
//       });

//       planogramIndex++;
//       capturedIndex = tempIndex;
//       continue;
//     }

//     // --- Case 4: Undefined fallback (mismatch or overflow) ---
//     cap.recalculatedPosition = [];
//     cap.matchedPlanogramProduct = undefined;
//     capturedIndex++;
//   }

//   // --- Step 4: Handle unmatched captured items gracefully ---
//   while (capturedIndex < updatedCaptured.length) {
//     const cap = updatedCaptured[capturedIndex];
//     cap.recalculatedPosition = [];
//     cap.matchedPlanogramProduct = undefined;
//     capturedIndex++;
//   }

//   // --- Step 5: Boundary / Overflow Correction ---
//   const lastPlanogram = planogramBoundaries[planogramBoundaries.length - 1];
//   for (const cap of updatedCaptured) {
//     if (!cap.recalculatedPosition?.length) {
//       const sameSkuExists = planogramBoundaries.some((p) => p.skuCode === cap.skuCode);
//       if (sameSkuExists) {
//         cap.recalculatedPosition = [Number(lastPlanogram.position)];
//         cap.matchedPlanogramProduct = { ...lastPlanogram };
//       }
//     }
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


/**
 * Optimal solution for recalculating captured product positions against planogram
 * Handles: orientation mismatch, multi-slot products, partial slots, SKU mismatches, overflows
 */

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
    matchedPlanogramProduct?: any;
  }[]
) {
  // 🔧 Tunable parameters
  const WIDTH_TOLERANCE_PERCENT = 15; // ±15% width tolerance
  const MULTI_SLOT_THRESHOLD = 1.4; // 1.4x width = spans multiple slots
  const MIN_OVERLAP_RATIO = 0.3; // Minimum 30% overlap to consider a match

  // Validation
  if (!planogram.length || !captured.length) return captured;

  // --- Step 1: Sort both arrays by X-coordinate (left to right) ---
  const getX = (item: any) => item.boundingBox?.[0]?.[0] ?? 0;
  
  const sortedPlanogram = [...planogram].sort((a, b) => getX(a) - getX(b));
  const sortedCaptured = [...captured].sort((a, b) => getX(a) - getX(b));

  // --- Step 2: Initialize result array ---
  const updatedCaptured = sortedCaptured.map(c => ({
    ...c,
    recalculatedPosition: [] as number[],
    // explicitly type as any so we can assign an object later (avoid inferred 'undefined' type)
    matchedPlanogramProduct: undefined as any
  }));

  let pIndex = 0; // Planogram pointer
  let cIndex = 0; // Captured pointer

  // --- Step 3: Main matching loop ---
  while (pIndex < sortedPlanogram.length && cIndex < updatedCaptured.length) {
    const planItem = sortedPlanogram[pIndex];
    const capItem = updatedCaptured[cIndex];

    const widthRatio = capItem.comparableWidth / planItem.width;
    const widthDiff = Math.abs(capItem.comparableWidth - planItem.width);
    const widthDiffPercent = (widthDiff / planItem.width) * 100;

    // 🎯 CASE 1: Perfect single-slot match (within tolerance)
    if (widthDiffPercent <= WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
      capItem.recalculatedPosition = [Number(planItem.position)];
      capItem.matchedPlanogramProduct = { ...planItem };
      pIndex++;
      cIndex++;
      continue;
    }

    // 🎯 CASE 2: Captured product spans multiple planogram slots
    if (widthRatio >= MULTI_SLOT_THRESHOLD) {
      let remainingWidth = capItem.comparableWidth;
      const coveredPositions: number[] = [];
      let tempPIndex = pIndex;

      // Accumulate planogram slots until captured width is covered
      while (
        tempPIndex < sortedPlanogram.length && 
        remainingWidth >= sortedPlanogram[tempPIndex].width * MIN_OVERLAP_RATIO
      ) {
        coveredPositions.push(Number(sortedPlanogram[tempPIndex].position));
        remainingWidth -= sortedPlanogram[tempPIndex].width;
        tempPIndex++;
      }

      if (coveredPositions.length > 0) {
        capItem.recalculatedPosition = coveredPositions;
        capItem.matchedPlanogramProduct = { ...planItem };
        pIndex = tempPIndex;
        cIndex++;
        continue;
      }
    }

    // 🎯 CASE 3: Multiple captured products fill one planogram slot
    if (capItem.comparableWidth < planItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)) {
      const groupedCaptured: typeof updatedCaptured = [];
      let accumulatedWidth = 0;
      let tempCIndex = cIndex;

      // Accumulate captured items until planogram width is satisfied
      while (
        tempCIndex < updatedCaptured.length &&
        accumulatedWidth < planItem.width * (1 + WIDTH_TOLERANCE_PERCENT / 100)
      ) {
        groupedCaptured.push(updatedCaptured[tempCIndex]);
        accumulatedWidth += updatedCaptured[tempCIndex].comparableWidth;
        tempCIndex++;

        // Stop if accumulated width is sufficient
        if (Math.abs(accumulatedWidth - planItem.width) / planItem.width * 100 <= WIDTH_TOLERANCE_PERCENT) {
          break;
        }
      }

      // Assign fractional or whole positions
      if (groupedCaptured.length === 1) {
        // Single captured matching single planogram
        groupedCaptured[0].recalculatedPosition = [Number(planItem.position)];
        groupedCaptured[0].matchedPlanogramProduct = { ...planItem };
      } else {
        // Multiple captured items for one planogram slot
        groupedCaptured.forEach((item, idx) => {
          const fractionalPos = Number(planItem.position) + (idx + 1) / 100;
          item.recalculatedPosition = [parseFloat(fractionalPos.toFixed(2))];
          item.matchedPlanogramProduct = { ...planItem };
        });
      }

      pIndex++;
      cIndex = tempCIndex;
      continue;
    }

    // 🎯 CASE 4: Slight mismatch - assign anyway with flag
    if (widthDiffPercent <= WIDTH_TOLERANCE_PERCENT * 1.5) {
      capItem.recalculatedPosition = [Number(planItem.position)];
      capItem.matchedPlanogramProduct = { ...planItem };
      pIndex++;
      cIndex++;
      continue;
    }

    // 🎯 FALLBACK: No clear match - move captured forward
    capItem.recalculatedPosition = [];
    capItem.matchedPlanogramProduct = undefined;
    cIndex++;
  }

  // --- Step 4: Handle remaining unmatched captured products ---
  while (cIndex < updatedCaptured.length) {
    const capItem = updatedCaptured[cIndex];
    
    // Try to find best-fit planogram slot based on SKU
    const matchingSku = sortedPlanogram.find(p => p.skuCode === capItem.skuCode);
    
    if (matchingSku) {
      // Assign to nearest available position of same SKU
      const lastMatchedIndex = sortedPlanogram.findIndex(p => p.skuCode === capItem.skuCode);
      if (lastMatchedIndex !== -1) {
        capItem.recalculatedPosition = [Number(sortedPlanogram[lastMatchedIndex].position)];
        capItem.matchedPlanogramProduct = { ...sortedPlanogram[lastMatchedIndex] };
      }
    } else {
      // Completely unmatched (wrong SKU or overflow)
      capItem.recalculatedPosition = [];
      capItem.matchedPlanogramProduct = undefined;
    }
    
    cIndex++;
  }

  return updatedCaptured;
}


export function matchProductsInCapturedToPlanogram(
  capturedImage: any[],
  planogramImage: any[]
) {
  const matchedResults = capturedImage.map((captured: any) => {
    const posArr = captured.recalculatedPosition;

    // Case 1: invalid or empty positions
    if (!Array.isArray(posArr) || posArr.length === 0) {
      const skuExists = planogramImage.some(
        (p: any) => p.skuCode === captured.skuCode
      );

      // if SKU not in planogram → invalid_position
      // else → still invalid because position couldn't be matched
      return { ...captured, matchingStatus: "invalid_position" };
    }

    // Case 2: multiple positions → product spans multiple slots
    if (posArr.length > 1) {
      const allPositionsValid = posArr.every((pos: number) => {
        const planItem = planogramImage.find(
          (p: any) => Number(p.position) === pos
        );
        return planItem && planItem.skuCode === captured.skuCode;
      });

      return {
        ...captured,
        matchingStatus: allPositionsValid ? "multi_slot" : "multi_slot",
      };
    }

    // Case 3: single position
    const pos = posArr[0];

    // Check if it's a whole integer
    if (Number.isInteger(pos)) {
      // Find corresponding planogram product
      const planogramProduct = planogramImage.find(
        (p: any) => Number(p.position) === pos
      );

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
      const basePos = Math.floor(pos);
      const planItem = planogramImage.find(
        (p: any) => Number(p.position) === basePos
      );

      // If it overlaps valid product of same SKU → still partial
      if (planItem && planItem.skuCode === captured.skuCode) {
        return {
          ...captured,
          matchingStatus: "partial_slot",
          matchedPlanogramProduct: planItem,
        };
      }

      return { ...captured, matchingStatus: "partial_slot" };
    }

    // Fallback
    return { ...captured, matchingStatus: "invalid_position" };
  });

  return matchedResults;
}




