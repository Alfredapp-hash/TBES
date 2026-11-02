const ranked = (counts, limit) =>
  [...counts].map(([label, views]) => ({ label, views })).sort((a, b) => b.views - a.views).slice(0, limit);

/** Totals, a complete day-by-day series, and top lists from traffic_summary rows. */
export function summarizeTraffic(rows, days, today = new Date()) {
  const perDay = new Map();
  const paths = new Map();
  const referrers = new Map();
  let total = 0;
  for (const row of rows) {
    const views = Number(row.views);
    total += views;
    perDay.set(row.day, (perDay.get(row.day) ?? 0) + views);
    paths.set(row.path, (paths.get(row.path) ?? 0) + views);
    if (row.referrer_host) referrers.set(row.referrer_host, (referrers.get(row.referrer_host) ?? 0) + views);
  }
  const series = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back));
    const key = day.toISOString().slice(0, 10);
    series.push({ day: key, views: perDay.get(key) ?? 0 });
  }
  return { total, series, topPaths: ranked(paths, 10), topReferrers: ranked(referrers, 10) };
}
