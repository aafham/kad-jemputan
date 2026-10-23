"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createInvitation } = require("../scripts/create-invitation.cjs");
const { buildProject, readConfig } = require("../scripts/lib/invitation-template.cjs");

function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kad-template-test-"));
  // Only this exact, freshly-created temporary tree is removed by test cleanup.
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const output = path.join(temp, "kad");
  createInvitation(output);
  return output;
}
function change(root, update) {
  const config = readConfig(root);
  update(config);
  fs.writeFileSync(path.join(root, "config.js"), `window.invitationConfig = ${JSON.stringify(config)};\n`);
  return buildProject(root);
}
function textFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? textFiles(target) : /\.(?:html|css|js|cjs|sql|md|ics|json|svg)$/.test(target) ? [target] : [];
  });
}

test("export is standalone and excludes prior couple, media, credentials and database data", t => {
  const root = fixture(t);
  for (const file of textFiles(root)) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /Nabil|Hanis?|Sarimah|Eirwan|Keliwon|60193103047|101\.4074413|kad-jemputan\.vercel\.app/i, file);
  }
  assert.ok(!fs.existsSync(path.join(root, ".env")));
  assert.ok(!fs.existsSync(path.join(root, ".git")));
  assert.ok(!fs.existsSync(path.join(root, ".vercel")));
  assert.ok(!fs.existsSync(path.join(root, "assets/audio")));
  assert.ok(!fs.existsSync(path.join(root, "supabase")));
  assert.equal(readConfig(root).rsvp.enabled, false);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /Adam/);
  assert.match(html, /Hawa/);
  assert.match(html, /src="invitation.generated.js"/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
  assert.ok(pkg.scripts.build);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "vercel.json"))).buildCommand, "npm run build");
});

test("new couple synchronizes static content, generated browser config, monogram and Unicode calendar", t => {
  const root = fixture(t);
  change(root, config => {
    config.couple.groom = 'Arif & "A"';
    config.couple.bride = "Zara";
    config.couple.fullNames = ["Arif bin Ahmad", "Zara binti Ali"];
    config.event.dateTime = "2031-01-01T00:30:00+08:00";
    config.event.endDateTime = "2031-01-01T13:00:00+08:00";
    config.event.address = "Dewan; " + "Bunga 🌸, ".repeat(15);
    config.metadata.url = "https://arif-zara.example/";
    config.metadata.image = "https://arif-zara.example/assets/images/photo.webp";
    config.family.hosts = [{ people: ["En. Ahmad", "Puan Salmah"] }];
  });
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /Arif &amp; &quot;A&quot;/);
  assert.match(html, /Jemputan Majlis Perkahwinan Arif/);
  assert.doesNotMatch(html, /Adam|Hawa|21 Disember 2030/);
  assert.match(html, /1 Januari 2031/);
  assert.match(html, /arif-zara\.example/);
  assert.match(fs.readFileSync(path.join(root, "assets/images/cover.svg"), "utf8"), />Z<\/text>/);
  const ics = fs.readFileSync(path.join(root, "assets/calendar/walimatul-urus.ics"), "utf8");
  assert.match(ics, /DTSTART:20301231T163000Z/);
  assert.match(ics.replace(/\r\n /g, ""), /LOCATION:Dewan\\;/);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(ics.replace(/\r\n/g, "").includes("\n"), false);
  assert.match(fs.readFileSync(path.join(root, "invitation.generated.js"), "utf8"), /Zara/);
  const before = html;
  buildProject(root);
  assert.equal(fs.readFileSync(path.join(root, "index.html"), "utf8"), before, "rebuild is idempotent");
});

test("export refuses existing folders, source tree and unknown arguments without overwriting", t => {
  const root = fixture(t);
  const before = fs.readFileSync(path.join(root, "config.js"));
  assert.throws(() => createInvitation(root), /sudah wujud/);
  assert.deepEqual(fs.readFileSync(path.join(root, "config.js")), before);
  assert.throws(() => createInvitation(path.resolve(__dirname, "../template-test-output")), /di luar/);
  assert.throws(() => createInvitation(path.resolve(__dirname, "../..export")), /di luar/);
  assert.throws(() => createInvitation(), /Nyatakan/);
});

test("invalid dates and missing or traversing media fail before changing rendered outputs", t => {
  const root = fixture(t);
  const before = fs.readFileSync(path.join(root, "index.html"));
  assert.throws(() => change(root, config => { config.event.endDateTime = "2020-01-01T10:00:00+08:00"; }), /Masa tamat/);
  assert.deepEqual(fs.readFileSync(path.join(root, "index.html")), before);
  change(root, config => { config.event.endDateTime = "2030-12-21T16:00:00+08:00"; });
  assert.throws(() => change(root, config => { config.audio.enabled = true; }), /audio.src/);
  assert.throws(() => change(root, config => { config.audio.src = "../secret.mp3"; }), /di luar/);
});

test("static attributes preserve literal dollar tokens and self-closing markup; empty display names fall back", t => {
  const root = fixture(t);
  change(root, config => {
    config.couple.displayNames = [];
    config.metadata.imageAlt = "$` $& $'";
  });
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /id="ogImageAlt"[^>]*content="\$` \$&amp; \$&#39;"\s*\/>/);
  assert.doesNotMatch(html, /\/ content=/);
  assert.match(html, /Adam/);
});

test("invalid calendar dates and unsafe map URLs cannot become static links", t => {
  const root = fixture(t);
  assert.throws(() => change(root, config => { config.event.dateTime = "2030-02-30T11:00:00+08:00"; }), /Tarikh/);
  assert.throws(() => change(root, config => {
    config.event.dateTime = "2030-12-21T11:00:00+08:00";
    config.map.googleMapsUrl = "javascript:alert(1)";
  }), /peta tidak sah/);
  assert.throws(() => change(root, config => {
    config.map.googleMapsUrl = "";
    config.map.embedUrl = "https://example.com/embed";
  }), /Google Maps/);
});
