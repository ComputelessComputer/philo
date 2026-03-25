import { refreshGeneratedContent, } from "./lib.mjs";

const report = await refreshGeneratedContent();
console.log(`Updated ${report.updated.length} generated pages.`,);
console.log(report.updated.map((item,) => item.filePath).join("\n",),);
