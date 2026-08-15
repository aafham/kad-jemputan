"use strict";

const {
  getPublicRsvp,
  getServerConfig,
  readJsonBody,
  sendJson,
  sendPublicError,
  submitRsvp,
  validateSubmission
} = require("./_lib/rsvp.cjs");

// The route reads the raw stream itself so it can enforce the 8 KB JSON limit.
const config = {
  api: {
    bodyParser: false
  }
};

// Production remains writable unless this explicitly says false. During the
// final database sync, set RSVP_WRITE_ENABLED=false in Vercel and redeploy;
// GET continues to work while POST requests receive a temporary 503 response.
function isRsvpWriteEnabled(env = process.env) {
  const configuredValue = typeof env.RSVP_WRITE_ENABLED === "string"
    ? env.RSVP_WRITE_ENABLED.trim().toLowerCase()
    : "";

  if (!configuredValue) {
    return true;
  }

  return configuredValue === "true" || configuredValue === "1" || configuredValue === "on";
}

async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const serverConfig = getServerConfig();
      const publicRsvp = await getPublicRsvp(serverConfig, req);
      sendJson(res, 200, { ok: true, ...publicRsvp });
    } catch (error) {
      sendPublicError(res, error);
    }
    return;
  }

  if (req.method === "POST") {
    try {
      if (!isRsvpWriteEnabled()) {
        sendJson(res, 503, {
          ok: false,
          error: "Penerimaan RSVP sedang ditutup seketika. Sila cuba lagi nanti."
        });
        return;
      }

      const serverConfig = getServerConfig();
      const body = await readJsonBody(req);
      const submission = validateSubmission(body);

      // Silently accept a filled honeypot without creating any database record.
      if (submission.isBot) {
        sendJson(res, 201, { ok: true, message: "RSVP anda telah diterima." });
        return;
      }

      await submitRsvp(serverConfig, submission, req);
      const message = submission.wish && serverConfig.wishMode === "pending"
        ? "RSVP anda telah diterima. Ucapan akan dipaparkan selepas semakan penganjur."
        : "RSVP anda telah diterima. Terima kasih.";
      sendJson(res, 201, {
        ok: true,
        message,
        wishStatus: submission.wish ? serverConfig.wishMode : null
      });
    } catch (error) {
      sendPublicError(res, error);
    }
    return;
  }

  res.setHeader("allow", "GET, POST");
  sendJson(res, 405, { ok: false, error: "Kaedah tidak dibenarkan." });
}

module.exports = handler;
module.exports.config = config;
module.exports.isRsvpWriteEnabled = isRsvpWriteEnabled;
