//Y axis calculate code
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
//     matchedPlanogramProduct?: any;
//   }[]
// ) {
//   // 🔧 Tunable parameters
//   const WIDTH_TOLERANCE_PERCENT = 18;
//   const MULTI_SLOT_THRESHOLD = 1.4;
//   const MIN_OVERLAP_RATIO = 0.35;

import { compareStacks, sortStackTopToBottom } from "./helper";

//   // Validation
//   if (!planogram.length || !captured.length) return captured;

//   // Helper: Get centroid with both X and Y
//   const getCentroid = (item: any): { x: number; y: number } => {
//     if (!item.boundingBox?.length) return { x: 0, y: 0 };
//     const xs = item.boundingBox.map((pt: any) => pt[0]);
//     const ys = item.boundingBox.map((pt: any) => pt[1]);
//     return {
//       x: (Math.min(...xs) + Math.max(...xs)) / 2,
//       y: (Math.min(...ys) + Math.max(...ys)) / 2,
//     };
//   };

//   // Helper: Get X coordinate
//   const getX = (item: any) => getCentroid(item).x;

//   // Helper: Calculate Y-axis similarity (lower is better, 0 = same row)
//   const getYSimilarity = (item1: any, item2: any): number => {
//     const c1 = getCentroid(item1);
//     const c2 = getCentroid(item2);
//     return Math.abs(c1.y - c2.y);
//   };

//   // Sort by X-coordinate
//   const sortedPlanogram = [...planogram].sort((a, b) => getX(a) - getX(b));
//   const sortedCaptured = [...captured].sort((a, b) => getX(a) - getX(b));

//   // Initialize result array
//   const updatedCaptured = sortedCaptured.map((c) => ({
//     ...c,
//     recalculatedPosition: [] as number[],
//     matchedPlanogramProduct: undefined as any,
//   }));

//   let pIndex = 0;
//   let cIndex = 0;

//   // Main matching loop (YOUR ORIGINAL LOGIC with Y-axis awareness)
//   while (pIndex < sortedPlanogram.length && cIndex < updatedCaptured.length) {
//     const planItem = sortedPlanogram[pIndex];
//     const capItem = updatedCaptured[cIndex];

//     const widthRatio = capItem.comparableWidth / planItem.width;
//     const widthDiff = Math.abs(capItem.comparableWidth - planItem.width);
//     const widthDiffPercent = (widthDiff / planItem.width) * 100;

//     // Get Y-axis similarity for this pair
//     const ySimilarity = getYSimilarity(capItem, planItem);

//     // CASE 1: Single-slot match (within tolerance)
//     if (widthDiffPercent <= WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
//       capItem.recalculatedPosition = [Number(planItem.position)];
//       capItem.matchedPlanogramProduct = { ...planItem };
//       pIndex++;
//       cIndex++;
//       continue;
//     }

//     // CASE 2: Captured spans multiple planogram slots
//     if (widthRatio >= MULTI_SLOT_THRESHOLD) {
//       let remainingWidth = capItem.comparableWidth;
//       const coveredPositions: number[] = [];
//       let tempPIndex = pIndex;

//       // Get Y of starting position for validation
//       const startY = getCentroid(planItem).y;

//       while (tempPIndex < sortedPlanogram.length && remainingWidth >= sortedPlanogram[tempPIndex].width * MIN_OVERLAP_RATIO) {
//         const currentPlanItem = sortedPlanogram[tempPIndex];
//         const currentY = getCentroid(currentPlanItem).y;

//         // Only span items in similar Y-axis (same shelf row)
//         // Allow 20% variance in Y position
//         const yVariance = Math.abs(currentY - startY);
//         const maxYVariance = Math.max(
//           getCentroid(capItem).y * 0.2,
//           200 // Minimum 200px tolerance
//         );

//         if (yVariance <= maxYVariance) {
//           coveredPositions.push(Number(currentPlanItem.position));
//           remainingWidth -= currentPlanItem.width;
//           tempPIndex++;
//         } else {
//           break; // Stop if moving to different row
//         }
//       }

//       if (coveredPositions.length > 0) {
//         capItem.recalculatedPosition = coveredPositions;
//         capItem.matchedPlanogramProduct = { ...planItem };
//         pIndex = tempPIndex;
//         cIndex++;
//         continue;
//       }
//     }

//     // CASE 3: Multiple captured items fill one planogram slot
//     if (capItem.comparableWidth < planItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)) {
//       const groupedCaptured: typeof updatedCaptured = [];
//       let accumulatedWidth = 0;
//       let tempCIndex = cIndex;

//       // Get Y of planogram item for validation
//       const planY = getCentroid(planItem).y;

//       while (tempCIndex < updatedCaptured.length && accumulatedWidth < planItem.width * (1 + WIDTH_TOLERANCE_PERCENT / 100)) {
//         const candidate = updatedCaptured[tempCIndex];
//         const candidateY = getCentroid(candidate).y;

//         // Check if candidate is in similar Y range
//         const yVariance = Math.abs(candidateY - planY);
//         const maxYVariance = Math.max(planY * 0.2, 200);

//         if (yVariance > maxYVariance) {
//           break; // Stop if candidate is on different row
//         }

//         groupedCaptured.push(candidate);
//         accumulatedWidth += candidate.comparableWidth;
//         tempCIndex++;

//         if ((Math.abs(accumulatedWidth - planItem.width) / planItem.width) * 100 <= WIDTH_TOLERANCE_PERCENT) {
//           break;
//         }
//       }

//       if (groupedCaptured.length === 1) {
//         groupedCaptured[0].recalculatedPosition = [Number(planItem.position)];
//         groupedCaptured[0].matchedPlanogramProduct = { ...planItem };
//       } else if (groupedCaptured.length > 1) {
//         groupedCaptured.forEach((item, idx) => {
//           const fractionalPos = Number(planItem.position) + (idx + 1) / 100;
//           item.recalculatedPosition = [parseFloat(fractionalPos.toFixed(2))];
//           item.matchedPlanogramProduct = { ...planItem };
//         });
//       }

//       pIndex++;
//       cIndex = tempCIndex;
//       continue;
//     }

//     // CASE 4: Extended tolerance (up to 22.5%)
//     if (widthDiffPercent <= WIDTH_TOLERANCE_PERCENT * 1.25) {
//       capItem.recalculatedPosition = [Number(planItem.position)];
//       capItem.matchedPlanogramProduct = { ...planItem };
//       pIndex++;
//       cIndex++;
//       continue;
//     }

//     // CASE 5: Check if we should skip planogram position (large Y difference)
//     // If captured item is significantly below current planogram item,
//     // the planogram item might be unmatched - skip it
//     const capY = getCentroid(capItem).y;
//     const planY = getCentroid(planItem).y;

//     if (capY > planY * 1.3) {
//       // Captured is much lower, skip this planogram position
//       pIndex++;
//       continue;
//     }

//     // CASE 6: Check if we should skip captured item (large Y difference)
//     if (planY > capY * 1.3) {
//       // Planogram is much lower, skip this captured item
//       capItem.recalculatedPosition = [];
//       capItem.matchedPlanogramProduct = undefined;
//       cIndex++;
//       continue;
//     }

//     // FALLBACK: No match found
//     capItem.recalculatedPosition = [];
//     capItem.matchedPlanogramProduct = undefined;
//     cIndex++;
//   }

//   // Handle remaining unmatched captured items
//   while (cIndex < updatedCaptured.length) {
//     updatedCaptured[cIndex].recalculatedPosition = [];
//     updatedCaptured[cIndex].matchedPlanogramProduct = undefined;
//     cIndex++;
//   }

//   return updatedCaptured;
// }

//Almost same not in Y-axis code

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
  const WIDTH_TOLERANCE_PERCENT = 10; // ±10% width tolerance
  const MULTI_SLOT_THRESHOLD = 1.4; // captured wider than planogram by this factor → spans multiple slots
  const MIN_OVERLAP_RATIO = 0.35; // minimum overlap fraction to consider covering a planogram slot

  // Validation
  if (!planogram || !captured) return captured;
  if (!planogram.length) {
    // no planogram: assign incremental positions to captured items starting from 1
    return captured.map((c, i) => ({ ...c, recalculatedPosition: [i + 1] }));
  }

  // helper to get center X if boundingBox provided (stable ordering)
  const getX = (item: any) => {
    if (!item?.boundingBox?.length) return 0;
    const xs = item.boundingBox.map((pt: any) => pt[0]);
    return (Math.min(...xs) + Math.max(...xs)) / 2;
  };

  // sort by visual position (x-center) to align sequences
  const sortedPlanogram = [...planogram].sort((a, b) => getX(a) - getX(b));
  const sortedCaptured = [...captured].sort((a, b) => getX(a) - getX(b));

  // prepare returned array (clone)
  const updatedCaptured = sortedCaptured.map((c) => ({
    ...c,
    recalculatedPosition: [] as number[],
    matchedPlanogramProduct: undefined as any,
  }));

  let pIndex = 0;
  let cIndex = 0;

  // Main matching loop
  while (pIndex < sortedPlanogram.length && cIndex < updatedCaptured.length) {
    const planItem = sortedPlanogram[pIndex];
    const capItem = updatedCaptured[cIndex];

    const planWidth = Number(planItem.width);
    const capWidth = Number(capItem.comparableWidth);
    const widthRatio = capWidth / (planWidth || 1);
    const widthDiffPercent = (Math.abs(capWidth - planWidth) / (planWidth || 1)) * 100;

    // console.log(`checking for - cip: ${cIndex} and pip: ${pIndex}, widthDiffPercent: ${widthDiffPercent}, widthRatio: ${widthRatio}`);

    // console.log(`-- Case 1A Checking: ${widthDiffPercent} <= ${WIDTH_TOLERANCE_PERCENT}: ${widthDiffPercent <= WIDTH_TOLERANCE_PERCENT} && ${widthRatio} < ${MULTI_SLOT_THRESHOLD}: ${widthRatio < MULTI_SLOT_THRESHOLD}`);
    // CASE 1A: Single-slot match (within tolerance)
    if (widthDiffPercent <= WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
      // console.log("used case 1A (Single-slot match (within tolerance)");
      capItem.recalculatedPosition = [Number(planItem.position)];
      capItem.matchedPlanogramProduct = { ...planItem };
      pIndex++;
      cIndex++;
      continue;
    }

    // console.log(`-- Case 1B Checking: ${widthDiffPercent} > ${WIDTH_TOLERANCE_PERCENT}: ${widthDiffPercent > WIDTH_TOLERANCE_PERCENT} && ${widthRatio} < ${MULTI_SLOT_THRESHOLD}: ${widthRatio < MULTI_SLOT_THRESHOLD}`);
    // CASE 1B: Slightly wider captured single-slot (within reasonable range but < MULTI_SLOT_THRESHOLD)
    if (widthDiffPercent > WIDTH_TOLERANCE_PERCENT && widthRatio < MULTI_SLOT_THRESHOLD) {
      // console.log("used case 1B (Slightly wider single-slot)");
      capItem.recalculatedPosition = [Number(planItem.position)];
      capItem.matchedPlanogramProduct = { ...planItem };
      pIndex++;
      cIndex++;
      continue;
    }

    // console.log(`-- Case 2A Checking: ${widthRatio} >= ${MULTI_SLOT_THRESHOLD}: ${widthRatio >= MULTI_SLOT_THRESHOLD}`);
    // CASE 2A: Captured is significantly wider → may span multiple planogram slots
    if (widthRatio >= MULTI_SLOT_THRESHOLD) {
      // console.log("used case 2A (Captured is significantly wider → may span multiple planogram slots)");
      let remainingWidth = capItem.comparableWidth;
      const coveredPositions: number[] = [];
      let tempPIndex = pIndex;

      while (tempPIndex < sortedPlanogram.length && remainingWidth >= sortedPlanogram[tempPIndex].width * MIN_OVERLAP_RATIO) {
        coveredPositions.push(Number(sortedPlanogram[tempPIndex].position));
        remainingWidth -= sortedPlanogram[tempPIndex].width;
        tempPIndex++;
      }

      if (coveredPositions.length > 0) {
        capItem.recalculatedPosition = coveredPositions;
        capItem.matchedPlanogramProduct = { ...planItem };
        pIndex = Math.max(pIndex + coveredPositions.length, tempPIndex);
        cIndex++;
        continue;
      }
    }

    // console.log(`-- Case 2B Checking ${widthRatio} <= ${1 / MULTI_SLOT_THRESHOLD} : ${widthRatio <= 1 / MULTI_SLOT_THRESHOLD}`);
    // CASE 2B (opposite): Planogram slot is much wider → group multiple captured items
    // if (widthRatio <= 1 / MULTI_SLOT_THRESHOLD) {
    //   // console.log("used case 2B (Planogram slot is much wider → group multiple captured items)");
    //   let remainingPlanWidth = planWidth;
    //   const groupedCaptured: typeof updatedCaptured = [];
    //   let tempCIndex = cIndex;

    //   while (tempCIndex < updatedCaptured.length && remainingPlanWidth >= updatedCaptured[tempCIndex].comparableWidth * MIN_OVERLAP_RATIO) {
    //     groupedCaptured.push(updatedCaptured[tempCIndex]);
    //     remainingPlanWidth -= updatedCaptured[tempCIndex].comparableWidth;
    //     tempCIndex++;
    //   }

    //   if (groupedCaptured.length > 0) {
    //     // assign fractional positions for each captured within this planogram slot
    //     groupedCaptured.forEach((item, idx) => {
    //       // 1st captured becomes pos + 0.01, second pos + 0.02 etc.
    //       const fractionalPos = Number(planItem.position) + (idx + 1) / 100;
    //       item.recalculatedPosition = [parseFloat(fractionalPos.toFixed(2))];
    //       item.matchedPlanogramProduct = { ...planItem };
    //     });

    //     pIndex++;
    //     cIndex = tempCIndex;
    //     continue;
    //   }
    // }

    // console.log(`-- Case 3 Checking: ${capItem.comparableWidth} < ${planItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)}: ${capItem.comparableWidth < planItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)}`);
    // CASE 3: Multiple captured items fill one planogram slot
    if (capItem.comparableWidth < planItem.width * (1 - WIDTH_TOLERANCE_PERCENT / 100)) {
      // console.log("used case 3 (Multiple captured items fill one planogram slot)");
      const groupedCaptured: typeof updatedCaptured = [];
      let accumulatedWidth = 0;
      let tempCIndex = cIndex;

      while (tempCIndex < updatedCaptured.length && accumulatedWidth < planItem.width * (1 + WIDTH_TOLERANCE_PERCENT / 100)) {
        accumulatedWidth += updatedCaptured[tempCIndex].comparableWidth;
        if (accumulatedWidth >= planItem.width * (1 + WIDTH_TOLERANCE_PERCENT / 100)) {
          break;
        }
        groupedCaptured.push(updatedCaptured[tempCIndex]);
        tempCIndex++;
      }

      if (groupedCaptured.length === 1) {
        groupedCaptured[0].recalculatedPosition = [Number(planItem.position)];
        groupedCaptured[0].matchedPlanogramProduct = { ...planItem };
      } else {
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

    // console.log(`-- Case 4 Checking: ${widthDiffPercent} <= ${WIDTH_TOLERANCE_PERCENT}: ${widthDiffPercent <= WIDTH_TOLERANCE_PERCENT * 1.25}`);
    // CASE 4: Slightly extended tolerance (fallback within 1.25 * tolerance)
    if (widthDiffPercent <= WIDTH_TOLERANCE_PERCENT * 1.25) {
      // console.log("used case 4 (Slightly extended tolerance)");
      capItem.recalculatedPosition = [Number(planItem.position)];
      capItem.matchedPlanogramProduct = { ...planItem };
      pIndex++;
      cIndex++;
      continue;
    }

    // console.log(`-- Case 5 Checking: ${pIndex} === ${sortedPlanogram.length - 1} || ${cIndex} === ${updatedCaptured.length - 1}: ${pIndex === sortedPlanogram.length - 1 || cIndex === updatedCaptured.length - 1}`);
    // CASE 5: If this is last planogram item OR last captured item, assign best-effort integer position
    if (pIndex === sortedPlanogram.length - 1 || cIndex === updatedCaptured.length - 1) {
      // console.log("used case 5 (Best-effort integer position)");
      capItem.recalculatedPosition = [Number(planItem.position)];
      capItem.matchedPlanogramProduct = { ...planItem };
      pIndex++;
      cIndex++;
      continue;
    }

    console.log(`-- FALLBACK: No match found`);
    // FALLBACK: No match found
    capItem.recalculatedPosition = [];
    capItem.matchedPlanogramProduct = undefined;
    cIndex++;
  }

  // Handle remaining unmatched captured items
  while (cIndex < updatedCaptured.length) {
    updatedCaptured[cIndex].recalculatedPosition = [];
    updatedCaptured[cIndex].matchedPlanogramProduct = undefined;
    cIndex++;
  }

  return updatedCaptured;
}

export function matchProductsInCapturedToPlanogram(capturedImage: any[], planogramImage: any[]) {
  const matchedResults = capturedImage.map((captured: any) => {
    const posArr = captured.recalculatedPosition;

    // Case 1: invalid or empty positions
    if (!Array.isArray(posArr) || posArr.length === 0) {
      const skuExists = planogramImage.some((p: any) => p.skuCode === captured.skuCode);

      // if SKU not in planogram → invalid_position
      // else → still invalid because position couldn't be matched
      return { ...captured, matchingStatus: "invalid_position" };
    }

    // Case 2: multiple positions → product spans multiple slots
    if (posArr.length > 1) {
      const matchedPlanItems = planogramImage.filter((p: any) => posArr.includes(Number(p.position)));
      const allPositionsValid = matchedPlanItems.every((p: any) => p.skuCode === captured.skuCode);

      return {
        ...captured,
        matchingStatus: allPositionsValid ? "multi_slot" : "multi_slot",
        matchedPlanogramProduct: matchedPlanItems,
      };
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
      const basePos = Math.floor(pos);
      const planItem = planogramImage.find((p: any) => Number(p.position) === basePos);

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

export function matchStackedProductsInCapturedToPlanogram(productPositionMatchingResult: any[]) {
  if (!Array.isArray(productPositionMatchingResult) || productPositionMatchingResult.length === 0) {
    return productPositionMatchingResult;
  }

  const updated = productPositionMatchingResult.map((item) => {
    const capStackSize = item.stackSize ? item.stackSize - 1 : item.stacked?.length ?? 0;

    // 1) No stack on captured → nothing to do
    if (!capStackSize || capStackSize <= 0) {
      return {
        ...item,
        stackMatchingStatus: "not_applicable",
        stackMatches: [],
      };
    }

    // 2) Must have a single planogram product to compare against
    const planRef = item.matchedPlanogramProduct;
    if (!planRef) {
      return { ...item, stackMatchingStatus: "no_planogram_match" };
    }
    if (Array.isArray(planRef)) {
      // ambiguous (multi-slot); you could refine by picking closest X-center,
      // but per requirement we'll mark as ambiguous.
      return { ...item, stackMatchingStatus: "multi_slot_ambiguous" };
    }

    const planStackSize = planRef.stackSize ?? planRef.stacked?.length ?? 0;
    const capturedStack = sortStackTopToBottom(item.stacked ?? []);
    const planogramStack = sortStackTopToBottom(planRef.stacked ?? []);

    // 3) Planogram has no stack → all unmatched
    if (!planStackSize || planStackSize <= 0 || planogramStack.length === 0) {
      return {
        ...item,
        stackMatchingStatus: "planogram_no_stack",
      };
    }

    // 4) Compare stacks one by one (top→bottom)
    const { overall, matches, summary } = compareStacks(capturedStack, planogramStack);

    return {
      ...item,
      stackMatchingStatus: overall,
      stacked: capturedStack,
      // stackMatches: matches,
      // stackMatchSummary: summary,
    };
  });

  return updated;
  // find products with stack size > 0
  // if stack size is > 1, then check if its matched planogram product has the stack size >0 (if not then mark all the stacked products as unmatched)
  // if its matched planogram product has the stack size >0 then sort the products in stacked according to y position, for both own stacked and matched planogram product stacked,
  //  then go for matching skucode one by one
}
