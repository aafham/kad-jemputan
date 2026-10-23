"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildProject } = require("./lib/invitation-template.cjs");

const sourceRoot = path.resolve(__dirname, "..");

function realDestination(destination) {
  const tail = [];
  let parent = destination;
  while (!fs.existsSync(parent)) {
    tail.unshift(path.basename(parent));
    parent = path.dirname(parent);
  }
  return path.join(fs.realpathSync(parent), ...tail);
}
const outside = relative => relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative);

function createInvitation(destination) {
  if (!destination) throw new Error("Nyatakan folder baharu: npm run create:invite -- --output ../kad-baru");
  const output = path.resolve(destination);
  if (fs.existsSync(output)) throw new Error("Folder output sudah wujud. Pilih nama baharu supaya fail sedia ada tidak ditindih.");
  const realSource = fs.realpathSync(sourceRoot);
  const realOutput = realDestination(output);
  const relative = path.relative(realSource, realOutput);
  if (!outside(relative) || !outside(path.relative(realOutput, realSource))) {
    throw new Error("Pilih folder berasingan di luar repositori template.");
  }
  const files = [
    ["index.html", "index.html"], ["style.css", "style.css"], ["script.js", "script.js"],
    ["api/rsvp.js", "api/rsvp.js"], ["api/_lib/rsvp.cjs", "api/_lib/rsvp.cjs"],
    ["neon/schema.sql", "neon/schema.sql"], [".env.example", ".env.example"],
    [".gitignore", ".gitignore"], [".gitattributes", ".gitattributes"],
    ["scripts/build-invitation.cjs", "scripts/build-invitation.cjs"],
    ["scripts/lib/invitation-template.cjs", "scripts/lib/invitation-template.cjs"],
    ["assets/images/icons8-google-maps-192.png", "assets/images/icons8-google-maps-192.png"],
    ["assets/images/waze-app-icon-seeklogo.png", "assets/images/waze-app-icon-seeklogo.png"],
    ["templates/default.config.js", "config.js"], ["templates/README.md", "README.md"],
    ...[1, 2, 3].map(index => [`templates/assets/images/photo-0${index}.svg`, `assets/images/photo-0${index}.svg`])
  ];
  for (const [source] of files) if (!fs.existsSync(path.join(sourceRoot, source))) throw new Error(`Fail template tiada: ${source}`);
  fs.mkdirSync(output, { recursive: true });
  for (const [source, target] of files) {
    fs.mkdirSync(path.dirname(path.join(output, target)), { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, source), path.join(output, target));
  }
  const sourcePackage = JSON.parse(fs.readFileSync(path.join(sourceRoot, "package.json"), "utf8"));
  const packageJson = {
    name: "kad-jemputan-template", version: "1.0.0", private: true,
    description: "Template kad jemputan perkahwinan Bahasa Melayu",
    engines: sourcePackage.engines,
    scripts: { build: "node scripts/build-invitation.cjs", check: "node --check config.js && node --check script.js && node --check api/rsvp.js && node --check api/_lib/rsvp.cjs" },
    dependencies: sourcePackage.dependencies
  };
  fs.writeFileSync(path.join(output, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");
  const lock = JSON.parse(fs.readFileSync(path.join(sourceRoot, "package-lock.json"), "utf8"));
  lock.name = packageJson.name;
  lock.packages[""].name = packageJson.name;
  fs.writeFileSync(path.join(output, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n");
  const vercel = JSON.parse(fs.readFileSync(path.join(sourceRoot, "vercel.json"), "utf8"));
  vercel.buildCommand = "npm run build";
  fs.writeFileSync(path.join(output, "vercel.json"), JSON.stringify(vercel, null, 2) + "\n");
  buildProject(output);
  return output;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("npm run create:invite -- --output ../kad-baru\nFolder mestilah baharu. Tiada foto, lagu, .env atau data tetamu lama disalin.");
  } else {
    try {
      if (args.length !== 2 || args[0] !== "--output") throw new Error("Guna: npm run create:invite -- --output ../kad-baru");
      console.log(`Template siap: ${createInvitation(args[1])}`);
      console.log("Isi config.js dalam folder itu, kemudian jalankan npm run build.");
    } catch (error) {
      console.error(`Gagal: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

module.exports = { createInvitation };
