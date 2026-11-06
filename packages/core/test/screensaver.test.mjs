// Covers the gateway-backed screensaver photo store (one KV key per photo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { setupWindow, loadCoreFile } from "./harness.mjs";

setupWindow();
loadCoreFile("core.js");
loadCoreFile("domains/screensaver.js");
const NSXCore = window.NSXCore;

function mockStore() {
  const data = {};
  window.NSXApi = {
    getStoreNamespace: async (ns) => { assert.equal(ns, "NSX-screensaver"); return { ...data }; },
    setStoreValue: async (ns, k, v) => { assert.equal(ns, "NSX-screensaver"); data[k] = v; },
    deleteStoreValue: async (ns, k) => { assert.equal(ns, "NSX-screensaver"); delete data[k]; },
  };
  return data;
}

test("parseScreensaverNamespace sorts by addedAt and drops junk keys", () => {
  const list = NSXCore.parseScreensaverNamespace({
    "img-b": { dataUrl: "B", addedAt: 2 },
    "img-a": { dataUrl: "A", addedAt: 1 },
    other: { dataUrl: "X", addedAt: 0 },
    "img-bad": { addedAt: 3 },
  });
  assert.deepEqual(list.map(i => i.dataUrl), ["A", "B"]);
  assert.deepEqual(NSXCore.parseScreensaverNamespace(null), []);
});

test("add / remove / clear persist one key per photo and survive a reload", async () => {
  const data = mockStore();
  await NSXCore.loadScreensaverImages();
  await NSXCore.addScreensaverImage("data:1");
  await NSXCore.addScreensaverImage("data:2");
  assert.equal(Object.keys(data).length, 2);

  const reloaded = await NSXCore.loadScreensaverImages();
  assert.deepEqual(reloaded.map(i => i.dataUrl), ["data:1", "data:2"]);

  await NSXCore.removeScreensaverImage(reloaded[0].id);
  assert.deepEqual(Object.values(data).map(v => v.dataUrl), ["data:2"]);
  assert.deepEqual(NSXCore.getScreensaverImages().map(i => i.dataUrl), ["data:2"]);

  await NSXCore.clearScreensaverImages();
  assert.equal(Object.keys(data).length, 0);
  assert.equal(NSXCore.getScreensaverImages().length, 0);
});
