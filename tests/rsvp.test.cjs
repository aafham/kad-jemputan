"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { Readable } = require("node:stream");
const {
  MAX_BODY_BYTES,
  PublicApiError,
  InternalApiError,
  callNeonQuery,
  getPublicRsvp,
  getServerConfig,
  hashForPurpose,
  readJsonBody,
  sendPublicError,
  submitRsvp,
  validateSubmission
} = require("../api/_lib/rsvp.cjs");

// All queries use an injected fake. These tests never read real credentials,
// send network requests, or create RSVP entries in the live database.
const NOW = 1_800_000_000_000;
const SERVER_CONFIG = Object.freeze({
  databaseUrl: "postgresql://test:test@database.invalid/test",
  hashSecret: "local-test-secret-at-least-32-characters",
  wishMode: "pending"
});
const REQUEST = { headers: { "x-vercel-forwarded-for": "192.0.2.10" } };
const submission = overrides => ({
  name: "Tetamu Ujian",
  attendance: "hadir",
  guestCount: 2,
  wish: "Semoga berbahagia!",
  website: "",
  formStartedAt: NOW - 4_000,
  ...overrides
});
const hasStatus = status => error => error instanceof PublicApiError && error.status === status;
const rawRequest = (chunks, headers = {}) => Object.assign(Readable.from(chunks), {
  headers: { "content-type": "application/json; charset=utf-8", ...headers }
});
const fakeQuery = callback => ({ neonFactory: () => ({ query: callback }) });

test("normalizes accepted names, attendance and guest counts", () => {
  const result = validateSubmission(submission({ name: "  Ahmad   Ali ", attendance: " HADIR ", guestCount: "3" }), NOW);
  assert.equal(result.name, "Ahmad Ali");
  assert.equal(result.attendance, "hadir");
  assert.equal(result.guestCount, 3);
  assert.equal(result.isBot, false);
  assert.equal(validateSubmission(submission({ attendance: "tidak_hadir", guestCount: 10 }), NOW).guestCount, 0);
});

test("rejects invalid attendance, guest counts, removed phone and unknown fields", () => {
  for (const value of [0, 11, 1.5, "2 guests", null]) {
    assert.throws(() => validateSubmission(submission({ guestCount: value }), NOW), hasStatus(400));
  }
  for (const overrides of [{ attendance: "maybe" }, { phone: "0123456789" }, { admin: true }, { name: " " }]) {
    assert.throws(() => validateSubmission(submission(overrides), NOW), hasStatus(400));
  }
});

test("honours the minimum form duration and catches the honeypot", () => {
  for (const formStartedAt of [NOW - 2_999, NOW + 100_000, "earlier", undefined]) {
    assert.throws(() => validateSubmission(submission({ formStartedAt }), NOW), hasStatus(400));
  }
  assert.equal(validateSubmission(submission({ formStartedAt: NOW - 3_000 }), NOW).isBot, false);
  assert.deepEqual(validateSubmission({ website: "automated spam" }, NOW), { isBot: true });
});

test("accepts joined wedding/family emoji and normalizes multiline wishes", () => {
  for (const wish of ["Tahniah! 👩‍❤️‍👨", "Semoga bahagia! 👨‍👩‍👧", "Selamat pengantin baru 🤍", "نیم\u200cفاصله"]) {
    assert.equal(validateSubmission(submission({ wish }), NOW).wish, wish);
  }
  assert.equal(validateSubmission(submission({ wish: "  Tahniah!\r\n\r\n\r\nSemoga bahagia.  " }), NOW).wish,
    "Tahniah!\n\nSemoga bahagia.");
  assert.equal(validateSubmission(submission({ wish: "   " }), NOW).wish, null);
});

test("rejects invisible controls with a distinct actionable error", () => {
  for (const control of ["\u0000", "\u0007", "\u200b", "\u202e", "\u2066", "\ud800"]) {
    assert.throws(() => validateSubmission(submission({ wish: "Tahniah" + control + " semua" }), NOW), error => (
      hasStatus(400)(error) && error.message.includes("aksara yang tidak disokong") && !error.message.includes("250")
    ));
  }
});

test("enforces 250 Unicode codepoints without double-counting emoji surrogates", () => {
  assert.equal(validateSubmission(submission({ wish: "🤍".repeat(250) }), NOW).wish, "🤍".repeat(250));
  assert.throws(() => validateSubmission(submission({ wish: "🤍".repeat(251) }), NOW), error => (
    hasStatus(400)(error) && error.message.includes("250")
  ));
});

test("reads streamed UTF-8 JSON across chunk boundaries", async () => {
  const expected = submission({ wish: "Tahniah! 👩‍❤️‍👨" });
  const bytes = Buffer.from(JSON.stringify(expected));
  const chunks = Array.from(bytes, byte => Buffer.from([byte]));
  assert.deepEqual(await readJsonBody(rawRequest(chunks)), expected);
});

test("rejects malformed, empty and non-JSON request bodies", async () => {
  await assert.rejects(readJsonBody(rawRequest(["{"])), hasStatus(400));
  await assert.rejects(readJsonBody(rawRequest([])), hasStatus(400));
  await assert.rejects(readJsonBody(rawRequest(["{}"], { "content-type": "text/plain" })), hasStatus(415));
});

test("enforces body limits from both headers and the actual stream", async () => {
  await assert.rejects(readJsonBody(rawRequest(["{}"], { "content-length": String(MAX_BODY_BYTES + 1) })), hasStatus(413));
  await assert.rejects(readJsonBody(rawRequest(["{}"], { "content-length": "invalid" })), hasStatus(413));
  await assert.rejects(readJsonBody(rawRequest([Buffer.alloc(MAX_BODY_BYTES), Buffer.from("x")])), hasStatus(413));
});

test("submits six parameterized values without raw IP or inline user SQL", async () => {
  const hostileName = "Tetamu'); DROP TABLE rsvp_entries; --";
  const value = validateSubmission(submission({ name: hostileName }), NOW);
  let captured;
  await submitRsvp(SERVER_CONFIG, value, REQUEST, fakeQuery(async (...args) => {
    captured = args;
    return [{ result: { ok: true } }];
  }));
  const [query, parameters, options] = captured;
  assert.match(query, /public\.submit_rsvp\(/);
  assert.ok(!query.includes(hostileName));
  assert.equal(parameters.length, 6);
  assert.equal(parameters[0], hostileName);
  assert.match(parameters[1], /^[a-f0-9]{64}$/);
  assert.equal(parameters[2], "hadir");
  assert.equal(parameters[3], 2);
  assert.equal(parameters[4], value.wish);
  assert.equal(parameters[5], "pending");
  assert.ok(!JSON.stringify(parameters).includes("192.0.2.10"));
  assert.ok(options.fetchOptions.signal instanceof AbortSignal);
});

test("keeps read and submission IP hashes separate", () => {
  assert.notEqual(hashForPurpose("192.0.2.10", SERVER_CONFIG.hashSecret, "rsvp-read-ip"),
    hashForPurpose("192.0.2.10", SERVER_CONFIG.hashSecret, "rsvp-ip"));
});

test("public reads return only the published contract and cap wishes", async () => {
  const rows = [{ result: {
    summary: { hadir: 3, tetamuHadir: 5, tidakHadir: -2, secret: "private" },
    wishes: Array.from({ length: 101 }, () => ({ name: "Tetamu", wish: "Tahniah!", createdAt: "2026-10-03", ip_hash: "private" })),
    connectionString: "private"
  } }];
  const result = await getPublicRsvp(SERVER_CONFIG, REQUEST, fakeQuery(async () => rows));
  assert.deepEqual(result.summary, { hadir: 3, tetamuHadir: 5, tidakHadir: 0 });
  assert.equal(result.wishes.length, 100);
  assert.deepEqual(result.wishes[0], { name: "Tetamu", wish: "Tahniah!", createdAt: "2026-10-03" });
  assert.ok(!JSON.stringify(result).includes("private"));
});

test("database rate-limit errors become a safe HTTP 429", async () => {
  const dbError = Object.assign(new Error("rsvp_rate_limit"), { code: "P0001" });
  await assert.rejects(callNeonQuery(SERVER_CONFIG, "unused", [], fakeQuery(async () => { throw dbError; })), hasStatus(429));
});

test("unexpected database failures and invalid response shapes remain private", async () => {
  const dbError = new Error("postgresql://private-user:private-password@secret.invalid/db");
  let publicError;
  await assert.rejects(callNeonQuery(SERVER_CONFIG, "unused", [], fakeQuery(async () => { throw dbError; })), error => {
    publicError = error;
    return error instanceof InternalApiError && !error.message.includes("private-password");
  });
  const response = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
  sendPublicError(response, publicError);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.ok(!JSON.stringify(response.body).includes("secret.invalid"));
  await assert.rejects(getPublicRsvp(SERVER_CONFIG, REQUEST, fakeQuery(async () => [])), InternalApiError);
});

test("missing credentials and invalid moderation config fail without revealing values", () => {
  assert.throws(() => getServerConfig({}), InternalApiError);
  assert.throws(() => getServerConfig({
    DATABASE_URL: SERVER_CONFIG.databaseUrl,
    RSVP_HASH_SECRET: SERVER_CONFIG.hashSecret,
    RSVP_WISH_MODE: "anything"
  }), InternalApiError);
});
