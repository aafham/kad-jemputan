"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../api/rsvp.js"), "utf8");

function loadRoute({ template = true, helpers = {} } = {}) {
  const calls = [];
  const forbidden = name => () => {
    calls.push(name);
    throw new Error(`Template must not call ${name}`);
  };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    require(name) {
      if (name === "../site-settings.json") return { template };
      if (name === "./_lib/rsvp.cjs") return {
        getServerConfig: forbidden("getServerConfig"),
        getPublicRsvp: forbidden("getPublicRsvp"),
        readJsonBody: forbidden("readJsonBody"),
        submitRsvp: forbidden("submitRsvp"),
        validateSubmission: forbidden("validateSubmission"),
        sendPublicError: forbidden("sendPublicError"),
        sendJson(res, status, body) {
          res.statusCode = status;
          // Transfer into this test's realm so assertions compare normal objects.
          res.body = JSON.parse(JSON.stringify(body));
        },
        ...helpers
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: {
      env: new Proxy({}, { get() { throw new Error("Template must not read environment variables"); } })
    }
  });
  return { handler: module.exports, calls };
}

test("template GET returns only an empty public response without environment or database calls", async () => {
  const { handler, calls } = loadRoute();
  const response = {};
  await handler({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    template: true,
    summary: { hadir: 0, tidakHadir: 0, tetamuHadir: 0 },
    wishes: []
  });
  assert.deepEqual(calls, []);
});

test("template POST is forbidden before parsing a request or touching environment/database state", async () => {
  const { handler, calls } = loadRoute();
  const response = {};
  const request = {
    method: "POST",
    get body() { throw new Error("Template must not read a submission"); },
    [Symbol.asyncIterator]() { throw new Error("Template must not consume a request stream"); }
  };
  await handler(request, response);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { ok: false, error: "RSVP tidak diaktifkan untuk template." });
  assert.deepEqual(calls, []);
});

test("customer site settings retain the existing GET flow", async () => {
  const config = { testOnly: true };
  const seen = [];
  const { handler } = loadRoute({ template: false, helpers: {
    getServerConfig() { seen.push("config"); return config; },
    async getPublicRsvp(serverConfig, request) {
      assert.equal(serverConfig, config);
      assert.equal(request.method, "GET");
      seen.push("read");
      return { summary: { hadir: 2, tidakHadir: 1, tetamuHadir: 4 }, wishes: [] };
    }
  } });
  const response = {};
  await handler({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    summary: { hadir: 2, tidakHadir: 1, tetamuHadir: 4 },
    wishes: []
  });
  assert.deepEqual(seen, ["config", "read"]);
});
