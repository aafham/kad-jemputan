"use strict";

const path = require("node:path");
const { buildProject } = require("./lib/invitation-template.cjs");

try {
  const config = buildProject(path.resolve(__dirname, ".."));
  console.log(`Kad dikemas kini: ${config.metadata.title}`);
  console.log("HTML, kalendar, cover dan metadata dijana daripada config.js.");
} catch (error) {
  console.error(`Build gagal: ${error.message}`);
  process.exitCode = 1;
}
