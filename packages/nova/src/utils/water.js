/**
 * Water-tank level formatting. The DE1 reports the tank level natively in
 * millimetres (the `currentLevel` field on /ws/v1/machine/waterLevels), which
 * is a float — showing it raw is a long, noisy number. These mirror NSX's own
 * conversion constants (packages/nsx/src/modules/ui.js) so both skins agree on
 * what a millimetre of tank is worth.
 */
export const WATER_TANK_MAX_MM = 43;
export const ML_PER_MM = 1140 / 41; // ≈ 27.8 ml per mm (full ≈ 41mm ≈ 1140ml)

/**
 * Format a native mm level for display in the chosen unit:
 *   'ml'  -> millilitres, rounded to the nearest 10 (kills the noisy decimals)
 *   'pct' -> percent of a full tank, whole numbers
 *   'mm'  -> raw millimetres, rounded to a whole number
 */
export function formatWaterLevel(mm, unit = 'ml') {
  const level = Math.max(0, Number(mm) || 0);
  if (unit === 'pct') {
    return `${Math.round((level / WATER_TANK_MAX_MM) * 100)}%`;
  }
  if (unit === 'mm') {
    return `${Math.round(level)} mm`;
  }
  return `${Math.round((level * ML_PER_MM) / 10) * 10} ml`;
}
