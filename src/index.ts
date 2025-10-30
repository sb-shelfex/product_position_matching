import express from "express";
import { getBoundingBoxesBySku, getMatchingProductSkuCodes, getPlanogramWidths, getScaledWidthsBySku } from "./helper/helper";
import { pi } from "./jsons/planogram_image";
import { ci } from "./jsons/captured_image";
import { getRepresentativeScalingFactor, getScalingFactors } from "./helper/getClusterData";
import { matchProductsInCapturedToPlanogram, recalculateCapturedPositions } from "./helper/comparePositions";

const app = express();
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Hello from Node + TypeScript!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function compute() {
  try {
    const piData = pi;
    const ciData = ci;

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
    //     sku: "shelfscan_00138",
    //     planogram_boundingBoxes: [{ width: 54.6 }, { width: 54.9 }, { width: 55.0 }, { width: 55.0 }],
    //     captured_boundingBoxes: [{ width: 52.5 }, { width: 51.7 }, { width: 50.0 }, { width: 49.0 }],
    //   },
    // ];

    // Compute scaling factors for each product
    const scalingFactors = getScalingFactors(boundingBoxes);
    console.log("scalingFactors", scalingFactors);

    // Compute cumulative scaling factor
    const overallScalingFactor = getRepresentativeScalingFactor(scalingFactors);
    console.log("overallScalingFactor ", overallScalingFactor);

    // According to scalling facor find widths of all products in captured image
    const scaledWidthsOfCapturedProducts = getScaledWidthsBySku(ciProducts, overallScalingFactor);
    console.log("scaledWidthsOfCapturedProducts", scaledWidthsOfCapturedProducts);

    // find widths of all products in planogram
    const widthOfPlanogramProducts = getPlanogramWidths(piProducts);
    console.log("widthOfPlanogramProducts", widthOfPlanogramProducts);

    // Recalculate positions for captured image
    const capturedProductsWithNewPositions = recalculateCapturedPositions(widthOfPlanogramProducts, scaledWidthsOfCapturedProducts);
    console.log("capturedProductsWithNewPositions", capturedProductsWithNewPositions);

    // Match captured products positions to planogram
    const productPositionMatchingResult = matchProductsInCapturedToPlanogram(scaledWidthsOfCapturedProducts, widthOfPlanogramProducts);
    console.log("productPositionMatchingResult", productPositionMatchingResult);
  } catch (err) {
    console.error("Error reading or parsing JSON files:", err);
  }
}

compute();
