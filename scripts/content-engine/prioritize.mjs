import { prioritizeContent, } from "./lib.mjs";

const report = await prioritizeContent();
console.log(`Prioritized ${report.opportunities.length} opportunities.`,);
console.log(report.outputPath,);
