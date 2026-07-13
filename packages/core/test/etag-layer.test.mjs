// Covers the real getWithEtag conditional-GET layer in api.js, exercised
// through fetchProfiles: the 2nd request must send If-None-Match, and a 304
// must return the same payload reference as the cached 200.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setupWindow, loadCoreFile } from "./harness.mjs";

setupWindow();

const ETAG = '"v1"';
const BODY = [{ id: "p1", profile: { title: "A" } }];
const requests = [];

// Install the fetch mock before loading api.js (it only touches fetch at call
// time; at load it just opens the stubbed WebSocket).
globalThis.fetch = async (url, opts = {}) => {
  const headers = opts.headers || {};
  requests.push({ url, headers });
  if (headers["If-None-Match"] === ETAG) {
    return { ok: true, status: 304, headers: { get: () => ETAG }, json: async () => null };
  }
  return {
    ok: true,
    status: 200,
    headers: { get: (h) => (h === "ETag" ? ETAG : null) },
    json: async () => BODY,
  };
};

loadCoreFile("core.js");
loadCoreFile("api.js");
const NSXApi = window.NSXApi;

test("getWithEtag sends If-None-Match on revalidation and returns the same ref on 304", async () => {
  const a = await NSXApi.fetchProfiles();
  const b = await NSXApi.fetchProfiles();

  assert.equal(a, BODY, "first call returns the fetched body");
  assert.equal(b, a, "304 returns the same payload reference");

  const profileReqs = requests.filter((r) => r.url.includes("/api/v1/profiles"));
  assert.equal(profileReqs.length, 2, "two profile requests were made");
  assert.equal(profileReqs[0].headers["If-None-Match"], undefined, "no conditional header on first request");
  assert.equal(profileReqs[1].headers["If-None-Match"], ETAG, "conditional header sent on revalidation");
});

test("getWithEtag sets cache: 'no-store' so the browser's own HTTP cache can't intervene", async () => {
  const opts = [];
  globalThis.fetch = async (url, o = {}) => { opts.push(o); return { ok: true, status: 200, headers: { get: () => null }, json: async () => [] }; };
  await NSXApi.fetchProfiles();
  assert.equal(opts.at(-1).cache, "no-store");
});

test("getWithEtag treats an unexpected 304 (no cached payload) as no data instead of throwing", async () => {
  // Simulates the real bug: the browser's own HTTP cache produces a 304
  // (e.g. from an unrelated earlier session) that this in-memory _etagCache
  // has no matching entry for — every single call would previously fall
  // through to the !res.ok branch and throw, forever, since a 304 body is
  // always empty and nothing could ever populate the cache. Uses fetchGrinders
  // (a different endpoint from the rest of this file) so _etagCache genuinely
  // has no prior entry for it.
  globalThis.fetch = async () => ({ ok: false, status: 304, headers: { get: () => null }, json: async () => null });
  const result = await NSXApi.fetchGrinders();
  assert.equal(result, null);
});
