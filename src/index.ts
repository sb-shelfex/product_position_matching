import express from "express";
import { compareResult, getBoundingBoxesBySku, getMatchingProductSkuCodes, getPlanogramWidths, getScaledWidthsBySku } from "./helper/helper";
import { getRepresentativeScalingFactor, getScalingFactors } from "./helper/getClusterData";
import { matchProductsInCapturedToPlanogram, matchStackedProductsInCapturedToPlanogram, recalculateCapturedPositions } from "./helper/comparePositions";
import { tests } from "./jsons";
import { pi_2 } from "./jsons/test2/planogram_image";
import { ci_2 } from "./jsons/test2/captured_image";
import { result_2 } from "./jsons/test2/result";
import { pi_3 } from "./jsons/test3/planogram_image";
import { ci_3 } from "./jsons/test3/captured_image";
import { result_3 } from "./jsons/test3/result";
import { pi_4 } from "./jsons/test4/planogram_image";
import { ci_4 } from "./jsons/test4/captured_image";
import { result_4 } from "./jsons/test4/result";
import { pi_13 } from "./jsons/test13/planogram_image";
import { ci_13 } from "./jsons/test13/captured_image";
import { result_13 } from "./jsons/test13/result";
import { pi_5 } from "./jsons/test5/planogram_image";
import { ci_15 } from "./jsons/test15/captured_image";
import { ci_5 } from "./jsons/test5/captured_image";
import { result_5 } from "./jsons/test5/result";
import { computeRepresentativeScaleFromProducts } from "./helper/helper2";

const app = express();
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Hello from Node + TypeScript!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function computeOne(piData: any, ciData: any, result: any, testNo: number = 0) {
  try {
    const piProducts = piData.products || [];
    const ciProducts = ciData.products || [];

    // console.log("piProducts", piProducts);
    // console.log("ciProducts", ciProducts);

    let osfmp: number | null = null; // overall scaling factor using MATCHED products
    let osfnmp: number | null = null; // overall scaling factor using NON-MATCHED products

    // ---------------------------------------------------------
    // (1) Compute NON-MATCHED scaling factor (osfnmp)
    // ---------------------------------------------------------
    // 1) compute representative scale for captured image (measured / actual)
    const capturedScaleInfo = await computeRepresentativeScaleFromProducts(ciProducts, {
      minConfidence: 0.5,
      referenceWidth: 1000,
      source: "captured",
    });

    // 2) compute representative scale for planogram products (if planogram items have bounding boxes)
    const planogramScaleInfo = await computeRepresentativeScaleFromProducts(piProducts, {
      minConfidence: 0.0,
      referenceWidth: 1000,
      source: "planogram",
    });

    // decide final overallScalingFactor:
    // - If planogram representative scale exists, use ratio captured/planogram
    // - else use captured representative scale directly (this is unitless measured/original)
    if (capturedScaleInfo.representativeScale != null && planogramScaleInfo.representativeScale != null) {
      // ratio: if planogram scale != 1 (rare), we normalize
      osfnmp = capturedScaleInfo.representativeScale / planogramScaleInfo.representativeScale;
    } else if (capturedScaleInfo.representativeScale != null) {
      osfnmp = capturedScaleInfo.representativeScale;
    }

    // ---------------------------------------------------------
    // (2) Compute MATCHED scaling factor (osfmp)
    // ---------------------------------------------------------
    // Get matching SKUs
    const matchingSkus = getMatchingProductSkuCodes(piProducts, ciProducts);
    // console.log(matchingSkus);

    // Get bounding boxes
    const boundingBoxes = getBoundingBoxesBySku(matchingSkus, piProducts, ciProducts);
    // console.dir(boundingBoxes, { depth: null });

    // Compute scaling factors for each product
    const scalingFactors = getScalingFactors(boundingBoxes);

    if (scalingFactors.length > 0) {
      // Compute cumulative scaling factor
      osfmp = getRepresentativeScalingFactor(scalingFactors);
      // console.log("overallScalingFactor ", overallScalingFactor);
    }
    console.log("testNo", testNo, "osfmp", osfmp, "osfnmp", osfnmp);

    // ---------------------------------------------------------
    // (3) Choose FINAL overallScalingFactor
    // ---------------------------------------------------------
    let overallScalingFactor: number | null = null;

    if (osfmp == null && osfnmp == null) {
      // ❌ No scaling possible from both methods
      return {
        analytics: {
          note: "no_scaling_factor_found",
          ciProducts,
        },
        matching: matchStackedProductsInCapturedToPlanogram(
          ciProducts.map((p: any) => ({
            ...p,
            recalculatedPosition: [],
            matchingStatus: "no_scale",
          }))
        ),
      };
    }

    if (osfmp != null && osfnmp == null) {
      overallScalingFactor = osfmp;
    } else if (osfmp == null && osfnmp != null) {
      overallScalingFactor = osfnmp;
    } else if (osfmp != null && osfnmp != null) {
      // BOTH exist → compare them
      const diffPercent = (Math.abs(osfmp - osfnmp) / osfmp) * 100;
      console.log("diffPercent", diffPercent);

      if (diffPercent <= 15) {
        // Close enough → matched products scaling wins
        // overallScalingFactor = osfnmp;
        overallScalingFactor = (osfmp +osfnmp)/2
      } else {
        // Far difference → STILL go with matched scaling
        overallScalingFactor = osfnmp;
      }

      // overallScalingFactor = (osfmp +osfnmp)/2
    }
    console.log("overallScalingFactor", overallScalingFactor);

    // Safety fallback
    if (!overallScalingFactor || !Number.isFinite(overallScalingFactor)) {
      overallScalingFactor = 1;
    }

    // ---------------------------------------------------------
    // (4) Continue with your existing logic
    // ---------------------------------------------------------
    // According to scalling facor find widths of all products in captured image
    const scaledWidthsOfCapturedProducts = getScaledWidthsBySku(ciProducts, overallScalingFactor);
    // console.log("scaledWidthsOfCapturedProducts", scaledWidthsOfCapturedProducts);

    // find widths of all products in planogram
    const widthOfPlanogramProducts = getPlanogramWidths(piProducts);
    // console.log("widthOfPlanogramProducts", widthOfPlanogramProducts);

    const totalPlanogramWidth = widthOfPlanogramProducts.reduce((a, b) => a + b.width, 0);
    const totalCapturedWidth = scaledWidthsOfCapturedProducts.reduce((a, b) => a + b.comparableWidth, 0);
    // console.log({ totalPlanogramWidth, totalCapturedWidth });

    // Recalculate positions for captured image
    const capturedProductsWithNewPositions = recalculateCapturedPositions(widthOfPlanogramProducts, scaledWidthsOfCapturedProducts);
    // console.log("capturedProductsWithNewPositions", capturedProductsWithNewPositions);

    // Match captured products positions to planogram
    const productPositionMatchingResult = matchProductsInCapturedToPlanogram(capturedProductsWithNewPositions, widthOfPlanogramProducts);
    // console.log("productPositionMatchingResult", productPositionMatchingResult);

    // next match stacked Products
    const stackedProductsMatchingResult = matchStackedProductsInCapturedToPlanogram(productPositionMatchingResult);
    // console.dir(stackedProductsMatchingResult, { depth: null });

    // compare matching result
    const matchingResult = compareResult(result, productPositionMatchingResult, testNo);
    // console.log("matchingResult", matchingResult);

    return matchingResult;
  } catch (error) {
    throw error;
  }
}

async function computeAll() {
  try {
    const analytics = [];
    // loop over the each test data
    for (let i = 0; i < tests.length; i++) {
      const testInputs: any = tests[i];

      const piData = testInputs.pi;
      const ciData = testInputs.ci;
      const result = testInputs.reuslt;

      // compute
      const matchingResult = await computeOne(piData, ciData, result, i + 1);

      // push analytics
      analytics.push(matchingResult.analytics);
    }
    console.log("analytics", analytics);
  } catch (err) {
    console.error("Error reading or parsing JSON files:", err);
  }
}

// computeAll();

computeOne(pi_5, ci_5, result_5, 0);
