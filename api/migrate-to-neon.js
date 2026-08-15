"use strict";

const {
  MigrationError,
  getMigrationConfig,
  isAuthorizedMigrationRequest,
  migrateSupabaseSnapshot
} = require("./_lib/neon-migration.cjs");

// This endpoint accepts no request body. Keeping Vercel's parser off avoids
// allocating memory for an untrusted payload before the Bearer check.
const config = {
  api: {
    bodyParser: false
  }
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify(payload));
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  let migrationConfig;
  try {
    migrationConfig = getMigrationConfig();
  } catch (error) {
    sendJson(res, 503, { ok: false, error: "Migration service unavailable." });
    return;
  }

  if (!isAuthorizedMigrationRequest(req, migrationConfig.migrationSecret)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }

  try {
    const migration = await migrateSupabaseSnapshot(migrationConfig);
    // Both objects contain aggregate counts only. RSVP names, phone numbers,
    // wishes and hashed IP values remain server-side and are never returned.
    sendJson(res, 200, { ok: true, migration });
  } catch (error) {
    // Never send provider/database errors: PostgreSQL can include failing-row
    // details, which may contain private RSVP data.
    if (error instanceof MigrationError) {
      sendJson(res, 503, { ok: false, error: "Migration could not be completed." });
      return;
    }
    sendJson(res, 500, { ok: false, error: "Migration could not be completed." });
  }
}

module.exports = handler;
module.exports.config = config;
