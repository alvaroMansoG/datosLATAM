const { createTimedStore, getTimedCache, setTimedCache } = require('../utils/cache');
const config = require('../config');
const { REGION_ISO_CODES, UNDP_REGION_COUNTRY_LIST } = require('../data/countries');
const { buildIndicatorRanking, toFiniteNumber } = require('../domain/rankings');

const indicatorRegionCache = createTimedStore();
const INDICATOR_REGION_TTL = 30 * 60 * 1000;
let warnedAboutUndpConfig = false;

async function fetchUndpRegionIndicator(indicatorCode, getFallbackRankings) {
  const cacheKey = `undp:${indicatorCode.toUpperCase()}`;
  const cached = getTimedCache(indicatorRegionCache, cacheKey, INDICATOR_REGION_TTL);
  if (cached) return cached;

  const { apiKey, baseUrl, years } = config.undp;
  if (!apiKey) {
    if (!warnedAboutUndpConfig) {
      warnedAboutUndpConfig = true;
      console.warn('PNUD API key no configurada en config.local.json o PNUD_API_KEY; se usara el fallback estatico para IDH.');
    }
    const fallback = getFallbackRankings(indicatorCode.toLowerCase());
    setTimedCache(indicatorRegionCache, cacheKey, fallback);
    return fallback;
  }

  const byIso = Object.fromEntries(
    REGION_ISO_CODES.map((iso) => [iso, { value: null, date: null, source: 'PNUD API' }])
  );
  const targetIndicatorCode = indicatorCode.toUpperCase();

  for (const year of years) {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/CompositeIndices/query`);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('countryOrAggregation', UNDP_REGION_COUNTRY_LIST);
    url.searchParams.set('year', String(year));
    url.searchParams.set('indicator', indicatorCode.toLowerCase());

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Error PNUD ${indicatorCode} ${year}: HTTP ${res.status}`);
        continue;
      }

      const rows = await res.json();
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const iso = String(row?.country || '').split(' - ')[0]?.trim()?.toUpperCase();
        const rowIndicatorCode = String(row?.indicator || '').split(' - ')[0]?.trim()?.toUpperCase();
        const value = toFiniteNumber(row?.value);

        if (!iso || !Object.prototype.hasOwnProperty.call(byIso, iso)) continue;
        if (byIso[iso].value != null) continue;
        if (rowIndicatorCode !== targetIndicatorCode) continue;
        if (value == null) continue;

        byIso[iso] = {
          value,
          date: row.year ? String(row.year) : String(year),
          source: 'PNUD API',
        };
      }
    } catch (err) {
      console.error(`Error fetching ${indicatorCode} from PNUD for ${year}:`, err.message);
    }
  }

  if (indicatorCode.toLowerCase() === 'hdi') {
    const fallback = getFallbackRankings('hdi').byIso;
    for (const iso of REGION_ISO_CODES) {
      if (byIso[iso].value == null && fallback[iso]?.value != null) {
        byIso[iso] = fallback[iso];
      }
    }
  }

  const data = {
    byIso,
    rankMap: buildIndicatorRanking(byIso, indicatorCode),
  };
  setTimedCache(indicatorRegionCache, cacheKey, data);
  return data;
}

module.exports = {
  fetchUndpRegionIndicator,
};
