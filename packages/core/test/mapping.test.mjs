// Covers the mapping domain — the stateless "domain model" layer every skin
// shares: formatters, workflow keys, and shot normalization.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setupWindow, loadCoreFile } from "./harness.mjs";

setupWindow();
loadCoreFile("core.js");
loadCoreFile("domains/mapping.js");
const NSXCore = window.NSXCore;

test("formatMmSs rounds up to the next whole second and pads", () => {
  assert.equal(NSXCore.formatMmSs(0), "0:00");
  assert.equal(NSXCore.formatMmSs(1000), "0:01");
  assert.equal(NSXCore.formatMmSs(1001), "0:02", "partial seconds round up");
  assert.equal(NSXCore.formatMmSs(65_000), "1:05");
  assert.equal(NSXCore.formatMmSs(-500), "0:00", "negatives clamp to zero");
});

test("calcRatio formats a brew ratio and guards a zero dose", () => {
  assert.equal(NSXCore.calcRatio(18, 36), "1:2.0");
  assert.equal(NSXCore.calcRatio(20, 45), "1:2.3");
  assert.equal(NSXCore.calcRatio(0, 36), "—");
});

test("getWorkflowKey lowercases parts and falls back to em-dash", () => {
  const key = NSXCore.getWorkflowKey({
    coffeeRoaster: "Roaster",
    coffeeName: "Bean",
    grinderModel: "Grinder",
    profileTitle: "Profile",
  });
  assert.equal(key, "roaster||bean||grinder||profile");
  assert.equal(NSXCore.getWorkflowKey({}), "—||—||—||—");
  assert.equal(NSXCore.getWorkflowKey(null), "—||—||—||—");
});

test("getWorkflowKey is case-insensitive (same recipe from different casings)", () => {
  const a = NSXCore.getWorkflowKey({ coffeeRoaster: "ACME", coffeeName: "Yirg" });
  const b = NSXCore.getWorkflowKey({ coffeeRoaster: "acme", coffeeName: "yirg" });
  assert.equal(a, b);
});

test("normalizeShotData rebases elapsed to zero and synthesizes a scaleRate", () => {
  const out = NSXCore.normalizeShotData({ elapsed: [10, 11, 12.5] });
  assert.deepEqual(out.elapsed, [0, 1, 2.5]);
  assert.deepEqual(out.scaleRate, [0, 0, 0], "missing scale data becomes zeros of equal length");
});

test("normalizeShotData returns null without usable data", () => {
  assert.equal(NSXCore.normalizeShotData(null), null);
  assert.equal(NSXCore.normalizeShotData({}), null, "no elapsed and no measurements");
});

test("getShotDurationSeconds returns the rebased final elapsed value", () => {
  assert.equal(NSXCore.getShotDurationSeconds({ elapsed: [5, 6, 8] }), 3);
  assert.equal(NSXCore.getShotDurationSeconds({}), null);
});

test("computeMaxRating reports the top rating and how many shots share it", () => {
  const shots = [
    { annotations: { enjoyment: 3 } },
    { annotations: { enjoyment: 5 } },
    { annotations: { enjoyment: 5 } },
    { annotations: {} },
  ];
  assert.deepEqual(NSXCore.computeMaxRating(shots), { max: 5, count: 2 });
  assert.deepEqual(NSXCore.computeMaxRating([]), { max: null, count: 0 });
});

test("computeMaxRating falls back to the legacy metadata.rating field", () => {
  assert.deepEqual(NSXCore.computeMaxRating([{ metadata: { rating: 4 } }]), { max: 4, count: 1 });
});

test("smoothWeightFlow recovers a steady flow rate from linear weight gain", () => {
  const elapsed = Array.from({ length: 20 }, (_, i) => i);
  const weight = elapsed.map((t) => t * 2); // true flow rate: 2 g/s
  const out = NSXCore.smoothWeightFlow(elapsed, weight);
  assert.equal(out[9], 2, "steady 2 g/s gain recovered exactly once enough history exists");
});

test("smoothWeightFlow is robust to a single spike sample (unlike a mean)", () => {
  const elapsed = Array.from({ length: 20 }, (_, i) => i);
  const clean = elapsed.map((t) => t * 2);
  const spiked = [...clean];
  spiked[7] = 1000; // one wildly bad reading
  const cleanOut = NSXCore.smoothWeightFlow(elapsed, clean);
  const spikedOut = NSXCore.smoothWeightFlow(elapsed, spiked);
  // A mean-based smoother would blow this index up to >100 g/s; median
  // should keep it close to the true ~2 g/s rate.
  assert.ok(
    Math.abs(spikedOut[9] - cleanOut[9]) < 1,
    `spike should barely move the output (clean=${cleanOut[9]}, spiked=${spikedOut[9]})`,
  );
});

test("smoothWeightFlow leaves early samples at 0 until enough history exists", () => {
  const out = NSXCore.smoothWeightFlow([0, 1, 2], [0, 2, 4]);
  assert.deepEqual(out, [0, 0, 0], "fewer samples than windowSize+gapSize never resolves");
});

test("smoothWeightFlow returns zeros for empty or mismatched input", () => {
  assert.deepEqual(NSXCore.smoothWeightFlow([], []), []);
  assert.deepEqual(NSXCore.smoothWeightFlow([1, 2, 3], [1, 2]), [0, 0, 0]);
});

test("normalizeShotData smooths scaleRate from per-sample scale.weight when present", () => {
  const measurements = Array.from({ length: 20 }, (_, i) => ({
    machine: {
      timestamp: new Date(i * 1000).toISOString(),
      state: { substate: "pouring" },
      pressure: 9,
      groupTemperature: 93,
    },
    scale: { weight: i * 2, weightFlow: 0 }, // weightFlow deliberately 0 — must be ignored in favor of the derived value
  }));
  const out = NSXCore.normalizeShotData({ measurements });
  assert.ok(out.scaleRate.some((v) => v > 0), "derives a non-zero flow from weight gain, not the flat weightFlow field");
});

test("normalizeShotData leaves scaleRate untouched when no scale was connected", () => {
  const measurements = Array.from({ length: 5 }, (_, i) => ({
    machine: {
      timestamp: new Date(i * 1000).toISOString(),
      state: { substate: "pouring" },
      pressure: 9,
      groupTemperature: 93,
      weightFlow: 1.5,
    },
  }));
  const out = NSXCore.normalizeShotData({ measurements });
  assert.deepEqual(out.scaleRate, [1.5, 1.5, 1.5, 1.5, 1.5], "falls back to the raw reported flow, unsmoothed, when there's no weight series to derive from");
});
