/** Inclusive numeric range as fixed-precision strings — the value list a WheelPicker scrolls through. */
export function range(from, to, step, dec) {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(v.toFixed(dec));
  return out;
}
