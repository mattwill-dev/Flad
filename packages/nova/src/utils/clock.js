/** Shared by StatusIsland and Screensaver so the 12h/24h skin setting only has
 * to be read in one place. */
export function formatClock(date) {
  const is12h = window.NSXCore.getStore().nova_time_format === '12h';
  if (!is12h) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  let h = date.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(date.getMinutes()).padStart(2, '0');
  const suffix = date.getHours() < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${suffix}`;
}
