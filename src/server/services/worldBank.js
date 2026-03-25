const { createTimedStore, getTimedCache, setTimedCache } = require('../utils/cache');
const { REGION_ISO_CODES, WORLD_BANK_REGION_COUNTRY_PATH } = require('../data/countries');
const { buildIndicatorRanking } = require('../domain/rankings');

const indicatorRegionCache = createTimedStore();
const countryMetadataCache = createTimedStore();
const INDICATOR_REGION_TTL = 30 * 60 * 1000;
const COUNTRY_METADATA_TTL = 24 * 60 * 60 * 1000;

function translateWorldBankIncomeLevel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const labels = {
    'high income': 'Ingreso alto',
    'upper middle income': 'Ingreso medio alto',
    'lower middle income': 'Ingreso medio bajo',
    'low income': 'Ingreso bajo',
  };
  return labels[normalized] || value || null;
}

async function fetchWorldBankCountryMetadata(isoCode) {
  const cacheKey = `wb-country:${isoCode}`;
  const cached = getTimedCache(countryMetadataCache, cacheKey, COUNTRY_METADATA_TTL);
  if (cached) return cached;

  try {
    const url = `https://api.worldbank.org/v2/country/${isoCode}?format=json`;
    const res = await fetch(url);
    const json = await res.json();
    const entry = Array.isArray(json) && Array.isArray(json[1]) ? json[1][0] : null;
    const metadata = {
      incomeLevel: translateWorldBankIncomeLevel(entry?.incomeLevel?.value),
    };
    setTimedCache(countryMetadataCache, cacheKey, metadata);
    return metadata;
  } catch (err) {
    console.error(`Error fetching World Bank country metadata for ${isoCode}:`, err.message);
    return { incomeLevel: null };
  }
}

async function fetchIndicator(isoCode, indicatorCode) {
  const url = `https://api.worldbank.org/v2/country/${isoCode}/indicator/${indicatorCode}?format=json&mrv=1`;
  const res = await fetch(url);
  const json = await res.json();
  if (!Array.isArray(json) || json.length < 2 || !json[1] || !json[1][0]) {
    return { value: null, date: null };
  }
  const entry = json[1][0];
  return { value: entry.value, date: entry.date };
}

async function fetchWorldBankRegionIndicator(indicatorCode) {
  const cacheKey = `wb:${indicatorCode}`;
  const cached = getTimedCache(indicatorRegionCache, cacheKey, INDICATOR_REGION_TTL);
  if (cached) return cached;

  const url = `https://api.worldbank.org/v2/country/${WORLD_BANK_REGION_COUNTRY_PATH}/indicator/${indicatorCode}?format=json&mrv=5&per_page=500`;
  const res = await fetch(url);
  const json = await res.json();
  const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
  const byIso = Object.fromEntries(
    REGION_ISO_CODES.map((iso) => [iso, { value: null, date: null, source: 'Banco Mundial' }])
  );

  for (const row of rows) {
    const iso = row?.countryiso3code;
    if (!iso || !Object.prototype.hasOwnProperty.call(byIso, iso)) continue;
    if (byIso[iso].value != null) continue;
    if (row.value == null) continue;

    byIso[iso] = {
      value: row.value,
      date: row.date ?? null,
      source: 'Banco Mundial',
    };
  }

  const data = {
    byIso,
    rankMap: buildIndicatorRanking(byIso, indicatorCode),
  };
  setTimedCache(indicatorRegionCache, cacheKey, data);
  return data;
}

module.exports = {
  fetchIndicator,
  fetchWorldBankCountryMetadata,
  fetchWorldBankRegionIndicator,
  translateWorldBankIncomeLevel,
};
