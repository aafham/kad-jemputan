"use strict";

const crypto = require("node:crypto");

const MAX_BODY_BYTES = 8 * 1024;
const MIN_FORM_DURATION_MS = 3_000;
const MAX_WISHES = 100;
const REQUEST_TIMEOUT_MS = 8_000;

class PublicApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "PublicApiError";
    this.status = status;
  }
}

class InternalApiError extends Error {
  constructor() {
    super("Internal RSVP service error");
    this.name = "InternalApiError";
  }
}

function getHeader(req, name) {
  const value = req && req.headers ? req.headers[name] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

function getServerConfig(env = process.env) {
  const rawUrl = typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL.trim() : "";
  const supabaseKey = typeof env.SUPABASE_SECRET_KEY === "string" && env.SUPABASE_SECRET_KEY.trim()
    ? env.SUPABASE_SECRET_KEY.trim()
    : (typeof env.SUPABASE_SERVICE_ROLE_KEY === "string" ? env.SUPABASE_SERVICE_ROLE_KEY.trim() : "");
  const hashSecret = typeof env.RSVP_HASH_SECRET === "string" ? env.RSVP_HASH_SECRET : "";
  const configuredWishMode = typeof env.RSVP_WISH_MODE === "string"
    ? env.RSVP_WISH_MODE.trim().toLowerCase()
    : "";

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new InternalApiError();
  }

  if (!rawUrl || !["https:", "http:"].includes(parsedUrl.protocol) || !supabaseKey || hashSecret.length < 32) {
    throw new InternalApiError();
  }

  if (configuredWishMode && configuredWishMode !== "published" && configuredWishMode !== "pending") {
    throw new InternalApiError();
  }

  return Object.freeze({
    supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
    supabaseKey,
    // New sb_secret_* keys must be sent only as apikey. Legacy service-role
    // JWTs still use Authorization to set the elevated PostgREST role.
    supabaseAuthorization: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(supabaseKey)
      ? "Bearer " + supabaseKey
      : null,
    hashSecret,
    wishMode: configuredWishMode || "published"
  });
}

function getClientIp(req) {
  const forwarded = getHeader(req, "x-vercel-forwarded-for")
    || getHeader(req, "x-forwarded-for")
    || getHeader(req, "x-real-ip")
    || (req && req.socket && req.socket.remoteAddress)
    || "unknown";

  const firstValue = String(forwarded).split(",")[0].trim();
  const safeIp = firstValue.replace(/[^0-9a-fA-F:.-]/g, "").slice(0, 128);
  return safeIp || "unknown";
}

function hashForPurpose(value, hashSecret, purpose) {
  return crypto
    .createHmac("sha256", hashSecret)
    .update(`${purpose}:${value}`, "utf8")
    .digest("hex");
}

function characterLength(value) {
  return Array.from(value).length;
}

function normalizeSingleLine(value, fieldName, minimum, maximum) {
  if (typeof value !== "string") {
    throw new PublicApiError(400, `Sila isi ${fieldName}.`);
  }

  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (/[\u0000-\u001f\u007f]/.test(normalized)
    || characterLength(normalized) < minimum
    || characterLength(normalized) > maximum) {
    throw new PublicApiError(400, `Sila semak ${fieldName}.`);
  }

  return normalized;
}

function normalizePhone(value) {
  if (typeof value !== "string") {
    throw new PublicApiError(400, "Sila isi nombor telefon yang sah.");
  }

  const raw = value.normalize("NFKC").trim();
  if (!raw || raw.length > 40 || /[^0-9+().\s-]/.test(raw)) {
    throw new PublicApiError(400, "Sila isi nombor telefon yang sah.");
  }

  const compact = raw.replace(/[().\s-]/g, "");
  let international;

  if (/^\+\d+$/.test(compact)) {
    international = compact;
  } else if (/^00\d+$/.test(compact)) {
    international = `+${compact.slice(2)}`;
  } else if (/^60\d+$/.test(compact)) {
    international = `+${compact}`;
  } else if (/^0\d+$/.test(compact)) {
    // This wedding card is Malaysian, so local numbers are normalised to E.164.
    international = `+60${compact.slice(1)}`;
  } else {
    throw new PublicApiError(400, "Sila isi nombor telefon yang sah.");
  }

  if (!/^\+[1-9]\d{7,14}$/.test(international)) {
    throw new PublicApiError(400, "Sila isi nombor telefon yang sah.");
  }

  return international;
}

function normalizeWish(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new PublicApiError(400, "Ucapan perlu dalam bentuk teks.");
  }

  const normalized = value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (/[^\P{C}\n\t]/u.test(normalized) || characterLength(normalized) > 250) {
    throw new PublicApiError(400, "Ucapan mesti tidak melebihi 250 aksara.");
  }

  return normalized || null;
}

function normalizeGuestCount(value) {
  const parsed = typeof value === "number"
    ? value
    : (typeof value === "string" && /^\d{1,2}$/.test(value.trim()) ? Number(value.trim()) : NaN);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new PublicApiError(400, "Jumlah tetamu perlu antara 1 hingga 10.");
  }

  return parsed;
}

function hasTriggeredHoneypot(body) {
  return Object.prototype.hasOwnProperty.call(body, "website")
    && String(body.website || "").trim() !== "";
}

function validateSubmission(body, now = Date.now()) {
  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw new PublicApiError(400, "Maklumat RSVP tidak sah.");
  }

  const allowedFields = new Set([
    "name",
    "phone",
    "attendance",
    "guestCount",
    "wish",
    "website",
    "formStartedAt"
  ]);

  if (Object.keys(body).some(key => !allowedFields.has(key))) {
    throw new PublicApiError(400, "Maklumat RSVP tidak sah.");
  }

  if (hasTriggeredHoneypot(body)) {
    return { isBot: true };
  }

  if (!Number.isInteger(body.formStartedAt)
    || body.formStartedAt > now + 60_000
    || now - body.formStartedAt < MIN_FORM_DURATION_MS) {
    throw new PublicApiError(400, "Sila tunggu seketika sebelum menghantar RSVP.");
  }

  const attendance = typeof body.attendance === "string" ? body.attendance.trim().toLowerCase() : "";
  if (attendance !== "hadir" && attendance !== "tidak_hadir") {
    throw new PublicApiError(400, "Sila pilih status kehadiran.");
  }

  return {
    isBot: false,
    name: normalizeSingleLine(body.name, "nama", 2, 80),
    phone: normalizePhone(body.phone),
    attendance,
    guestCount: attendance === "hadir" ? normalizeGuestCount(body.guestCount) : 0,
    wish: normalizeWish(body.wish)
  };
}

async function readJsonBody(req) {
  const contentType = String(getHeader(req, "content-type") || "").toLowerCase();
  const mediaType = contentType.split(";", 1)[0].trim();
  if (mediaType !== "application/json") {
    throw new PublicApiError(415, "Format maklumat RSVP tidak disokong.");
  }

  const contentLength = getHeader(req, "content-length");
  if (contentLength !== undefined) {
    if (!/^\d+$/.test(String(contentLength)) || Number(contentLength) > MAX_BODY_BYTES) {
      throw new PublicApiError(413, "Maklumat RSVP terlalu panjang.");
    }
  }

  let size = 0;
  const chunks = [];

  try {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY_BYTES) {
        throw new PublicApiError(413, "Maklumat RSVP terlalu panjang.");
      }
      chunks.push(buffer);
    }
  } catch (error) {
    if (error instanceof PublicApiError) {
      throw error;
    }
    throw new PublicApiError(400, "Maklumat RSVP tidak dapat dibaca.");
  }

  if (size === 0) {
    throw new PublicApiError(400, "Maklumat RSVP tidak boleh kosong.");
  }

  try {
    return JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch {
    throw new PublicApiError(400, "Maklumat RSVP tidak sah.");
  }
}

async function fetchWithTimeout(url, options, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new InternalApiError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch {
    throw new InternalApiError();
  } finally {
    clearTimeout(timeout);
  }
}

function responseIndicatesRateLimit(rawResponse) {
  try {
    const payload = JSON.parse(rawResponse);
    return payload && (
      payload.message === "rsvp_rate_limit"
      || payload.message === "rsvp_read_rate_limit"
      || payload.code === "RSVP_RATE_LIMIT"
      || payload.code === "RSVP_READ_RATE_LIMIT"
    );
  } catch {
    return false;
  }
}

async function callSupabaseRpc(config, functionName, payload, options = {}) {
  const response = await fetchWithTimeout(
    `${config.supabaseUrl}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        apikey: config.supabaseKey,
        "content-type": "application/json",
        accept: "application/json",
        ...(config.supabaseAuthorization ? { authorization: config.supabaseAuthorization } : {}),
        ...(options.returnMinimal ? { Prefer: "return=minimal" } : {})
      },
      body: JSON.stringify(payload)
    },
    options.fetchImpl
  );

  const rawResponse = await response.text();
  if (!response.ok) {
    if (responseIndicatesRateLimit(rawResponse)) {
      throw new PublicApiError(429, "Terlalu banyak permintaan daripada sambungan ini. Sila cuba lagi kemudian.");
    }
    throw new InternalApiError();
  }

  if (!options.expectJson) {
    return null;
  }

  try {
    return JSON.parse(rawResponse);
  } catch {
    throw new InternalApiError();
  }
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function sanitizePublicRsvpResult(result) {
  const payload = Array.isArray(result) ? result[0] : result;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new InternalApiError();
  }

  const sourceSummary = payload.summary && typeof payload.summary === "object" ? payload.summary : {};
  const sourceWishes = Array.isArray(payload.wishes) ? payload.wishes : [];

  const wishes = sourceWishes.slice(0, MAX_WISHES).flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || typeof item.name !== "string" || typeof item.wish !== "string") {
      return [];
    }

    const name = item.name.trim();
    const wish = item.wish.trim();
    if (!name || !wish) {
      return [];
    }

    return [{
      name: Array.from(name).slice(0, 80).join(""),
      wish: Array.from(wish).slice(0, 250).join(""),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : ""
    }];
  });

  return {
    summary: {
      hadir: safeCount(sourceSummary.hadir),
      tetamuHadir: safeCount(sourceSummary.tetamuHadir),
      tidakHadir: safeCount(sourceSummary.tidakHadir)
    },
    wishes
  };
}

async function submitRsvp(config, submission, req, fetchImpl) {
  const phoneHash = hashForPurpose(submission.phone, config.hashSecret, "rsvp-phone");
  const ipHash = hashForPurpose(getClientIp(req), config.hashSecret, "rsvp-ip");

  await callSupabaseRpc(config, "submit_rsvp", {
    p_name: submission.name,
    p_phone_normalized: submission.phone,
    p_phone_hash: phoneHash,
    p_ip_hash: ipHash,
    p_attendance: submission.attendance,
    p_guest_count: submission.guestCount,
    p_wish: submission.wish,
    p_wish_status: submission.wish ? config.wishMode : "published"
  }, { returnMinimal: true, fetchImpl });
}

async function getPublicRsvp(config, req, fetchImpl) {
  // Keep the read budget separate from the submission IP hash. This limits
  // scraping without storing a directly reusable IP identifier.
  const ipHash = hashForPurpose(getClientIp(req), config.hashSecret, "rsvp-read-ip");
  const result = await callSupabaseRpc(config, "get_public_rsvp", { p_ip_hash: ipHash }, {
    expectJson: true,
    fetchImpl
  });
  return sanitizePublicRsvpResult(result);
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify(payload));
}

function sendPublicError(res, error) {
  if (error instanceof PublicApiError) {
    sendJson(res, error.status, { ok: false, error: error.message });
    return;
  }

  if (error instanceof InternalApiError) {
    sendJson(res, 503, { ok: false, error: "Perkhidmatan RSVP belum tersedia. Sila cuba lagi kemudian." });
    return;
  }

  sendJson(res, 500, { ok: false, error: "RSVP tidak dapat dihantar buat masa ini. Sila cuba lagi." });
}

module.exports = {
  MAX_BODY_BYTES,
  PublicApiError,
  InternalApiError,
  callSupabaseRpc,
  getClientIp,
  getPublicRsvp,
  getServerConfig,
  hashForPurpose,
  readJsonBody,
  sendJson,
  sendPublicError,
  submitRsvp,
  validateSubmission
};
