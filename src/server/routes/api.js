const express = require('express');

const { INDICATORS } = require('../data/indicators');
const {
  COUNTRIES,
  REGION_AGGREGATE_ISO,
  REGION_AGGREGATE_NAME,
  REGION_COUNTRY_COUNT,
  REGION_ISO_CODES,
} = require('../data/countries');
const { GOV_DATA, ALC_GOV_STATS } = require('../data/govStatic');
const { buildCountryDigitalEnablers } = require('../data/digitalEnablers');
const { buildRegionalAggregateIndicators } = require('../domain/aggregates');
const { buildIndicatorRanking } = require('../domain/rankings');
const { buildCountryGovData, buildRegionalGovData } = require('../domain/govSeries');
const { createMemoryCache } = require('../utils/cache');
const { getExchangeRates } = require('../services/exchangeRates');
const { fetchWorldBankCountryMetadata, fetchWorldBankRegionIndicator } = require('../services/worldBank');
const { fetchData360RegionIndicator } = require('../services/data360');
const { fetchUndpRegionIndicator } = require('../services/undp');

const responseCache = createMemoryCache(5 * 60 * 1000);

function getRegionFallbackRankings(indicatorKey) {
  if (indicatorKey !== 'hdi') {
    return { byIso: {}, rankMap: {} };
  }

  const byIso = Object.fromEntries(
    REGION_ISO_CODES.map((iso) => [
      iso,
      GOV_DATA[iso]?.hdi != null
        ? { value: GOV_DATA[iso].hdi, date: '2023', source: 'PNUD (fallback estatico local)' }
        : { value: null, date: null, source: 'PNUD (fallback estatico local)' },
    ])
  );

  return {
    byIso,
    rankMap: buildIndicatorRanking(byIso, 'hdi'),
  };
}

function buildApiRouter() {
  const router = express.Router();

  router.get('/countries', (_req, res) => {
    res.json(COUNTRIES);
  });

  router.get('/indicators', (_req, res) => {
    res.json(INDICATORS);
  });

  router.get('/country/:iso', async (req, res) => {
    const iso = req.params.iso.toUpperCase();
    const isRegionAggregate = iso === REGION_AGGREGATE_ISO;
    const country = isRegionAggregate ? { iso3: REGION_AGGREGATE_ISO } : COUNTRIES.find((c) => c.iso3 === iso);
    if (!country) return res.status(404).json({ error: 'País no encontrado' });

    const cached = responseCache.get(iso);
    if (cached) return res.json(cached);

    try {
      const entries = Object.entries(INDICATORS).filter(([key]) => key !== 'hdi');
      const [ratesResult, countryMetadataResult, hdiRegionResult, ...indicatorRegionResults] = await Promise.allSettled([
        getExchangeRates(),
        isRegionAggregate ? Promise.resolve({ incomeLevel: null }) : fetchWorldBankCountryMetadata(iso),
        fetchUndpRegionIndicator('hdi', getRegionFallbackRankings),
        ...entries.map(([, def]) => {
          if (def.databaseId) {
            return fetchData360RegionIndicator(
              def.databaseId,
              def.code,
              def.fallbackCode ? () => fetchWorldBankRegionIndicator(def.fallbackCode) : null,
              def.source
            );
          }
          return fetchWorldBankRegionIndicator(def.code);
        }),
      ]);

      const rates = ratesResult.status === 'fulfilled' ? ratesResult.value : {};
      const countryMetadata = countryMetadataResult.status === 'fulfilled'
        ? countryMetadataResult.value
        : { incomeLevel: null };
      const exchangeRate = country.currencyCode ? (rates[country.currencyCode] ?? null) : null;
      const govStatic = GOV_DATA[iso] || {};
      const hdiRegionData = hdiRegionResult.status === 'fulfilled'
        ? hdiRegionResult.value
        : getRegionFallbackRankings('hdi');
      const regionDataByKey = {};
      entries.forEach(([key], index) => {
        const result = indicatorRegionResults[index];
        regionDataByKey[key] = result.status === 'fulfilled'
          ? result.value
          : { byIso: {}, rankMap: {} };
      });

      if (isRegionAggregate) {
        const data = {
          country: {
            iso3: REGION_AGGREGATE_ISO,
            name: REGION_AGGREGATE_NAME,
            isRegionAggregate: true,
            memberCountries: REGION_ISO_CODES,
          },
          indicators: buildRegionalAggregateIndicators({
            indicators: INDICATORS,
            regionCountryCount: REGION_COUNTRY_COUNT,
            regionDataByKey,
            hdiRegionData,
          }),
          govData: buildRegionalGovData(),
        };

        responseCache.set(iso, data);
        return res.json(data);
      }

      const hdiEntry = hdiRegionData.byIso[iso] || { value: null, date: null, source: 'PNUD API' };
      const data = {
        country: {
          iso3: country.iso3,
          name: country.name,
          bidRegion: country.bidRegion,
          incomeLevel: countryMetadata.incomeLevel,
          flag: country.flag,
          numericId: country.numericId,
          capital: country.capital,
          timezone: country.timezone,
          currency: country.currency,
          currencyCode: country.currencyCode,
          domain: country.domain,
          phoneCode: country.phoneCode,
          borderCountries: country.borderCountries,
          exchangeRate,
        },
        indicators: {},
      };

      entries.forEach(([key, def]) => {
        const regionData = regionDataByKey[key];
        const entry = regionData.byIso[iso] || { value: null, date: null, source: null };
        data.indicators[key] = {
          ...def,
          value: entry.value,
          date: entry.date,
          source: entry.source || def.source || 'Banco Mundial',
          rankALC: regionData.rankMap[iso] ?? null,
          totalALC: REGION_COUNTRY_COUNT,
        };
      });

      data.indicators.hdi = {
        ...INDICATORS.hdi,
        value: hdiEntry.value ?? govStatic.hdi ?? null,
        date: hdiEntry.date ?? '2023',
        source: hdiEntry.source || 'PNUD API',
        rankALC: hdiRegionData.rankMap[iso] ?? ALC_GOV_STATS.hdiRankALC[iso] ?? null,
        totalALC: REGION_COUNTRY_COUNT,
      };

      data.govData = buildCountryGovData(iso);
      data.digitalEnablers = buildCountryDigitalEnablers(iso);

      responseCache.set(iso, data);
      res.json(data);
    } catch (err) {
      console.error('Error fetching indicators:', err);
      res.status(500).json({ error: 'Error al obtener datos' });
    }
  });

  return router;
}

module.exports = {
  buildApiRouter,
};
