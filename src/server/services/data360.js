const { createTimedStore, getTimedCache, setTimedCache } = require('../utils/cache');
const { REGION_ISO_CODES } = require('../data/countries');
const { buildIndicatorRanking, toFiniteNumber } = require('../domain/rankings');

const indicatorRegionCache = createTimedStore();
const INDICATOR_REGION_TTL = 30 * 60 * 1000;

async function fetchData360RegionIndicator(databaseId, indicatorId, fallbackFetcher = null, sourceLabel = 'Data360 del Banco Mundial') {
  const cacheKey = `data360:${databaseId}:${indicatorId}`;
  const cached = getTimedCache(indicatorRegionCache, cacheKey, INDICATOR_REGION_TTL);
  if (cached) return cached;

  try {
    const res = await fetch('https://data360api.worldbank.org/data360/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        database_id: databaseId,
        indicator_id: indicatorId,
        ref_area: REGION_ISO_CODES,
        isLatestData: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const rows = Array.isArray(json?.value) ? json.value : [];
    const byIso = Object.fromEntries(
      REGION_ISO_CODES.map((iso) => [iso, { value: null, date: null, source: sourceLabel }])
    );

    for (const row of rows) {
      const iso = String(row?.REF_AREA || '').toUpperCase();
      if (!Object.prototype.hasOwnProperty.call(byIso, iso)) continue;
      if (String(row?.SEX || '_T') !== '_T') continue;
      if (String(row?.AGE || '_T') !== '_T') continue;
      if (String(row?.URBANISATION || '_T') !== '_T') continue;
      if (!['_Z', '_T', '', 'null', 'undefined'].includes(String(row?.COMP_BREAKDOWN_1 ?? '_Z'))) continue;
      if (!['_Z', '_T', '', 'null', 'undefined'].includes(String(row?.COMP_BREAKDOWN_2 ?? '_Z'))) continue;
      if (!['_Z', '_T', '', 'null', 'undefined'].includes(String(row?.COMP_BREAKDOWN_3 ?? '_Z'))) continue;

      const value = toFiniteNumber(row?.OBS_VALUE);
      const date = row?.TIME_PERIOD ? String(row.TIME_PERIOD) : null;
      if (value == null || !date) continue;

      const currentDate = byIso[iso].date;
      if (currentDate && currentDate >= date) continue;

      byIso[iso] = { value, date, source: sourceLabel };
    }

    const data = { byIso, rankMap: buildIndicatorRanking(byIso, indicatorId) };
    setTimedCache(indicatorRegionCache, cacheKey, data);
    return data;
  } catch (err) {
    if (!fallbackFetcher) throw err;
    console.warn(`Data360 fallback para ${indicatorId}: ${err.message}`);
    return fallbackFetcher();
  }
}

module.exports = {
  fetchData360RegionIndicator,
};
