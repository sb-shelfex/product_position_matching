import express from "express";
import { compareResult, getBoundingBoxesBySku, getMatchingProductSkuCodes, getPlanogramWidths, getScaledWidthsBySku } from "./helper/helper";
import { getRepresentativeScalingFactor, getScalingFactors } from "./helper/getClusterData";
import { matchProductsInCapturedToPlanogram, recalculateCapturedPositions } from "./helper/comparePositions";
import { tests } from "./jsons";
import { pi_2 } from "./jsons/test2/planogram_image";
import { ci_2 } from "./jsons/test2/captured_image";
import { result_2 } from "./jsons/test2/result";

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

    // Get matching SKUs
    const matchingSkus = getMatchingProductSkuCodes(piProducts, ciProducts);
    // console.log(matchingSkus);

    // Get bounding boxes
    const boundingBoxes = getBoundingBoxesBySku(matchingSkus, piProducts, ciProducts);
    // console.dir(boundingBoxes, { depth: null });

    // let boundingBoxes = [
    //   {
    //     sku: "shelfscan_00139",
    //     planogram_boundingBoxes: [{ width: 54.6 }, { width: 54.9 }, { width: 55.0 }, { width: 55.0 }],
    //     captured_boundingBoxes: [{ width: 98.5 }, { width: 99.7 }, { width: 97.0 }, { width: 95.0 }],
    //   },
    //   {
    //     sku: "shelfscan_00138",
    //     planogram_boundingBoxes: [{ width: 54.6 }, { width: 54.9 }, { width: 55.0 }, { width: 55.0 }],
    //     captured_boundingBoxes: [{ width: 48.5 }, { width: 45.7 }, { width: 50.0 }, { width: 49.0 }],
    //   },
    //   {
    //     sku: "shelfscan_00140",
    //     planogram_boundingBoxes: [{ width: 54.6 }, { width: 54.9 }, { width: 55.0 }, { width: 55.0 }],
    //     captured_boundingBoxes: [{ width: 99.5 }, { width: 100.7 }, { width: 98.0 }, { width: 99.0 }],
    //   },
    // ];

    // Compute scaling factors for each product
    const scalingFactors = getScalingFactors(boundingBoxes);
    // console.log("scalingFactors", scalingFactors);

    // Compute cumulative scaling factor
    const overallScalingFactor = getRepresentativeScalingFactor(scalingFactors);
    // console.log("overallScalingFactor ", overallScalingFactor);

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
    console.log("productPositionMatchingResult", productPositionMatchingResult);

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

computeOne(pi_2, ci_2, result_2, 0);
