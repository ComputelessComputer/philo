import { discoverContentFacts, } from "./lib.mjs";

const report = await discoverContentFacts();
console.log(`Discovered ${report.facts.length} facts from ${report.sources.length} sources.`,);
console.log(report.outputPath,);
