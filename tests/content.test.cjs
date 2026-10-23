"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "config.js"), "utf8"), context);
const config = context.window.invitationConfig;
const calendar = fs.readFileSync(path.join(root, "assets/calendar/walimatul-urus.ics"), "utf8");

test("HTML hooks are unique and local assets resolve", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, source] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|#|tel:)/.test(source)) continue;
    assert.ok(fs.existsSync(path.join(root, source)), `Missing asset: ${source}`);
  }
});

test("neutral gallery placeholders have files and descriptions", () => {
  assert.equal(config.gallery.length, 3);
  for (const photo of config.gallery) {
    assert.ok(fs.existsSync(path.join(root, photo.src)), photo.src);
    assert.ok(photo.alt.trim());
  }
});

test("blank template has no invented calendar event or personal content", () => {
  assert.equal(config.isTemplate, true);
  assert.equal(config.event.dateTime, "");
  assert.doesNotMatch(calendar, /BEGIN:VEVENT|DTSTART|DTEND/);
  const publicContent = html + fs.readFileSync(path.join(root, "config.js"), "utf8") + calendar;
  assert.doesNotMatch(publicContent, /Nabil|Hanis?|Sarimah|Eirwan|Keliwon|Kembara|Kandis|60193103047|101\.4074413/i);
});

test("calendar names and times stay synchronized for configured events", () => {
  if (!config.event.dateTime) return;
  const unfolded = calendar.replace(/\r?\n[ \t]/g, "");
  const utc = value => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  assert.ok(unfolded.includes(`SUMMARY:Majlis Perkahwinan ${config.couple.displayNames.join(" & ")}`));
  assert.ok(unfolded.includes(`DTSTART:${utc(config.event.dateTime)}`));
  assert.ok(unfolded.includes(`DTEND:${utc(config.event.endDateTime)}`));
  assert.ok(unfolded.includes(`LOCATION:${config.event.address.replace(/,/g, "\\,")}`));
  assert.ok(new Date(config.event.endDateTime) > new Date(config.event.dateTime));
  for (const line of calendar.split(/\r?\n/)) assert.ok(Buffer.byteLength(line) <= 75, line);
});

test("social metadata agrees with canonical config and does not reference a prior couple", () => {
  assert.ok(html.includes(`rel="canonical" href="${config.metadata.url}"`));
  if (!config.metadata.image) return;
  const image = new URL(config.metadata.image);
  assert.equal(image.origin, new URL(config.metadata.url).origin);
  assert.ok(fs.existsSync(path.join(root, image.pathname)));
});

test("public frontend contains no phone RSVP field or Supabase client", () => {
  const form = html.match(/<form id="rsvpForm"[\s\S]*?<\/form>/)[0];
  assert.doesNotMatch(form, /type="tel"|name="(?:phone|guestPhone)"/);
  assert.doesNotMatch(html, /supabase-js|supabase\.co/);
  assert.equal(config.rsvp.endpoint, "/api/rsvp");
});
