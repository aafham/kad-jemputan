"use strict";

const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

const PAGE_SIZE = 500;
const MAX_ROWS_PER_TABLE = 25_000;
const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 12_000;

const SNAPSHOT_TABLES = Object.freeze([
  Object.freeze({
    key: "entries",
    table: "rsvp_entries",
    columns: Object.freeze([
      "id",
      "name",
      "phone_normalized",
      "phone_hash",
      "ip_hash",
      "attendance",
      "guest_count",
      "wish",
      "wish_status",
      "created_at",
      "updated_at"
    ]),
    order: "id.asc"
  }),
  Object.freeze({
    key: "submissionEvents",
    table: "rsvp_submission_events",
    columns: Object.freeze(["id", "ip_hash", "created_at"]),
    order: "id.asc"
  }),
  Object.freeze({
    key: "readRateLimits",
    table: "rsvp_read_rate_limits",
    columns: Object.freeze(["ip_hash", "window_started_at", "read_count", "updated_at"]),
    order: "ip_hash.asc"
  })
]);

class MigrationError extends Error {
  constructor() {
    super("The RSVP migration service is unavailable.");
    this.name = "MigrationError";
  }
}

function getHeader(req, name) {
  if (!req || !req.headers || typeof req.headers !== "object") {
    return undefined;
  }

  const requestedName = String(name).toLowerCase();
  const headerKey = Object.keys(req.headers).find(key => key.toLowerCase() === requestedName);
  const value = headerKey ? req.headers[headerKey] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

function characterLength(value) {
  return Array.from(value).length;
}

function configuredValue(env, name) {
  return typeof env[name] === "string" ? env[name].trim() : "";
}

function parseConfiguredUrl(value, protocols) {
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new MigrationError();
  }

  if (!protocols.includes(parsedUrl.protocol)) {
    throw new MigrationError();
  }

  return parsedUrl;
}

function getMigrationConfig(env = process.env) {
  const supabaseUrlValue = configuredValue(env, "SUPABASE_URL");
  const supabaseKey = configuredValue(env, "SUPABASE_SECRET_KEY")
    || configuredValue(env, "SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrlValue = configuredValue(env, "DATABASE_URL")
    || configuredValue(env, "NEON_DATABASE_URL");
  const migrationSecret = typeof env.NEON_MIGRATION_SECRET === "string"
    ? env.NEON_MIGRATION_SECRET.trim()
    : "";

  const supabaseUrl = parseConfiguredUrl(supabaseUrlValue, ["https:", "http:"]);
  const databaseUrl = parseConfiguredUrl(databaseUrlValue, ["postgres:", "postgresql:"]);

  if (!supabaseKey || characterLength(migrationSecret) < 32) {
    throw new MigrationError();
  }

  return Object.freeze({
    supabaseUrl: supabaseUrl.toString().replace(/\/$/, ""),
    supabaseKey,
    // New sb_secret_* keys are sent only as apikey. Legacy JWT service-role
    // keys retain their Authorization header so PostgREST uses the service role.
    supabaseAuthorization: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(supabaseKey)
      ? `Bearer ${supabaseKey}`
      : null,
    databaseUrl: databaseUrl.toString(),
    migrationSecret
  });
}

function isAuthorizedMigrationRequest(req, migrationSecret) {
  if (typeof migrationSecret !== "string" || characterLength(migrationSecret) < 32) {
    return false;
  }

  const headerValue = getHeader(req, "authorization");
  const match = /^Bearer ([^\s]+)$/.exec(typeof headerValue === "string" ? headerValue : "");
  if (!match) {
    return false;
  }

  const expected = Buffer.from(migrationSecret, "utf8");
  const supplied = Buffer.from(match[1], "utf8");
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

async function fetchWithTimeout(url, options, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new MigrationError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch {
    throw new MigrationError();
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    throw new MigrationError();
  }
}

function createSupabaseTableUrl(config, tableDefinition) {
  const url = new URL(`/rest/v1/${tableDefinition.table}`, `${config.supabaseUrl}/`);
  url.searchParams.set("select", tableDefinition.columns.join(","));
  url.searchParams.set("order", tableDefinition.order);
  return url.toString();
}

function isSafeSourceRow(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readSupabaseTable(config, tableDefinition, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const rows = [];
  const url = createSupabaseTableUrl(config, tableDefinition);

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        apikey: config.supabaseKey,
        accept: "application/json",
        "cache-control": "no-store",
        "range-unit": "items",
        range: `${offset}-${offset + PAGE_SIZE - 1}`,
        ...(config.supabaseAuthorization ? { authorization: config.supabaseAuthorization } : {})
      }
    }, fetchImpl);

    if (!response || !response.ok) {
      throw new MigrationError();
    }

    const page = await readJsonResponse(response);
    if (!Array.isArray(page) || page.length > PAGE_SIZE || page.some(row => !isSafeSourceRow(row))) {
      throw new MigrationError();
    }

    rows.push(...page);
    if (rows.length > MAX_ROWS_PER_TABLE) {
      throw new MigrationError();
    }

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function readSupabaseSnapshot(config, options = {}) {
  const parts = await Promise.all(
    SNAPSHOT_TABLES.map(async tableDefinition => [
      tableDefinition.key,
      await readSupabaseTable(config, tableDefinition, options)
    ])
  );

  return Object.freeze(Object.fromEntries(parts));
}

function safeNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function summarizeSourceEntries(entries) {
  let hadir = 0;
  let tetamuHadir = 0;
  let tidakHadir = 0;
  let publishedWishes = 0;

  for (const entry of entries) {
    if (entry.attendance === "hadir") {
      hadir += 1;
      const guestCount = Number(entry.guest_count);
      if (!Number.isSafeInteger(guestCount) || guestCount < 0) {
        throw new MigrationError();
      }
      tetamuHadir += guestCount;
    } else if (entry.attendance === "tidak_hadir") {
      tidakHadir += 1;
    } else {
      throw new MigrationError();
    }

    if (entry.wish_status === "published" && typeof entry.wish === "string" && entry.wish.trim()) {
      publishedWishes += 1;
    }
  }

  return Object.freeze({ hadir, tetamuHadir, tidakHadir, publishedWishes });
}

function summarizeSourceSnapshot(snapshot) {
  const entries = Array.isArray(snapshot.entries) ? snapshot.entries : null;
  const submissionEvents = Array.isArray(snapshot.submissionEvents) ? snapshot.submissionEvents : null;
  const readRateLimits = Array.isArray(snapshot.readRateLimits) ? snapshot.readRateLimits : null;
  if (!entries || !submissionEvents || !readRateLimits) {
    throw new MigrationError();
  }

  return Object.freeze({
    entries: entries.length,
    submissionEvents: submissionEvents.length,
    readRateLimits: readRateLimits.length,
    summary: summarizeSourceEntries(entries)
  });
}

function serializeSnapshot(snapshot) {
  try {
    const serialized = Object.freeze({
      entries: JSON.stringify(snapshot.entries),
      submissionEvents: JSON.stringify(snapshot.submissionEvents),
      readRateLimits: JSON.stringify(snapshot.readRateLimits)
    });
    const byteLength = Buffer.byteLength(
      `${serialized.entries}${serialized.submissionEvents}${serialized.readRateLimits}`,
      "utf8"
    );

    if (byteLength > MAX_SNAPSHOT_BYTES) {
      throw new MigrationError();
    }

    return serialized;
  } catch (error) {
    if (error instanceof MigrationError) {
      throw error;
    }
    throw new MigrationError();
  }
}

function parseMigrationResult(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new MigrationError();
    }
  }

  return value;
}

function sanitizeMigrationResult(value) {
  const result = parseMigrationResult(value);
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new MigrationError();
  }

  const summary = result.summary;
  const safeResult = {
    entries: safeNonNegativeInteger(result.entries),
    submissionEvents: safeNonNegativeInteger(result.submissionEvents),
    readRateLimits: safeNonNegativeInteger(result.readRateLimits),
    summary: summary && typeof summary === "object" && !Array.isArray(summary)
      ? {
          hadir: safeNonNegativeInteger(summary.hadir),
          tetamuHadir: safeNonNegativeInteger(summary.tetamuHadir),
          tidakHadir: safeNonNegativeInteger(summary.tidakHadir),
          publishedWishes: safeNonNegativeInteger(summary.publishedWishes)
        }
      : null
  };

  if (safeResult.entries === null
    || safeResult.submissionEvents === null
    || safeResult.readRateLimits === null
    || !safeResult.summary
    || Object.values(safeResult.summary).some(value => value === null)) {
    throw new MigrationError();
  }

  return Object.freeze({
    entries: safeResult.entries,
    submissionEvents: safeResult.submissionEvents,
    readRateLimits: safeResult.readRateLimits,
    summary: Object.freeze(safeResult.summary)
  });
}

function assertSnapshotMatches(source, target) {
  const sourceValues = [
    source.entries,
    source.submissionEvents,
    source.readRateLimits,
    source.summary.hadir,
    source.summary.tetamuHadir,
    source.summary.tidakHadir,
    source.summary.publishedWishes
  ];
  const targetValues = [
    target.entries,
    target.submissionEvents,
    target.readRateLimits,
    target.summary.hadir,
    target.summary.tetamuHadir,
    target.summary.tidakHadir,
    target.summary.publishedWishes
  ];

  if (sourceValues.some((value, index) => value !== targetValues[index])) {
    throw new MigrationError();
  }
}

async function replaceNeonSnapshot(config, snapshot, options = {}) {
  const neonFactory = options.neonFactory || neon;
  const serialized = serializeSnapshot(snapshot);

  try {
    const sql = neonFactory(config.databaseUrl);
    if (typeof sql !== "function") {
      throw new MigrationError();
    }

    // The Neon v1 driver is a tagged template. Every serialized snapshot is
    // parameterized here; do not use the old conventional sql(query, params)
    // form, which the driver intentionally rejects.
    const rows = await sql`
      select public.replace_rsvp_snapshot(
        ${serialized.entries}::jsonb,
        ${serialized.submissionEvents}::jsonb,
        ${serialized.readRateLimits}::jsonb
      ) as migration
    `;

    if (!Array.isArray(rows) || rows.length !== 1) {
      throw new MigrationError();
    }

    return sanitizeMigrationResult(rows[0].migration);
  } catch (error) {
    if (error instanceof MigrationError) {
      throw error;
    }
    // Database error payloads can include a failing row, so intentionally do
    // not rethrow or log the provider error from this internet-facing route.
    throw new MigrationError();
  }
}

async function migrateSupabaseSnapshot(config, options = {}) {
  const snapshot = await readSupabaseSnapshot(config, options);
  const source = summarizeSourceSnapshot(snapshot);
  const target = await replaceNeonSnapshot(config, snapshot, options);
  assertSnapshotMatches(source, target);

  return Object.freeze({
    source,
    target
  });
}

module.exports = {
  MAX_ROWS_PER_TABLE,
  MAX_SNAPSHOT_BYTES,
  PAGE_SIZE,
  MigrationError,
  SNAPSHOT_TABLES,
  assertSnapshotMatches,
  getHeader,
  getMigrationConfig,
  isAuthorizedMigrationRequest,
  migrateSupabaseSnapshot,
  readSupabaseSnapshot,
  replaceNeonSnapshot,
  sanitizeMigrationResult,
  summarizeSourceSnapshot
};
