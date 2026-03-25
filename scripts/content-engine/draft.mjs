import { draftContentPages, } from "./lib.mjs";

const report = await draftContentPages();
console.log(`Created ${report.created.length} draft pages.`,);
console.log(report.created.map((item,) => item.filePath).join("\n",),);
