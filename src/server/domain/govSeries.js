const { GOV_DATA, GCI_TIER_LABELS, GOV_INDEX_ORDER, GOV_INDEX_SOURCES, getEgdiGroup, getGciTier } = require('../data/govStatic');
const { ALC_ISO_LIST } = require('../data/govStatic');
const { getGovHistory } = require('../services/govHistory');

const GOV_HISTORY = getGovHistory();

function sortYearStrings(years = []) {
  return [...new Set(years.map(String))].sort((a, b) => Number(b) - Number(a));
}

function averageNumberMap(valuesByIso = {}) {
  const values = Object.values(valuesByIso).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildScoreRankMap(valuesByIso = {}) {
  const sorted = Object.entries(valuesByIso)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(sorted.map(([iso], index) => [iso, index + 1]));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildLatestGovStaticSeries(iso) {
  const govStatic = GOV_DATA[iso] || {};
  const latest = {};

  if (govStatic.egdi != null) {
    latest.egdi = {
      '2024': {
        score: govStatic.egdi,
        rankWorld: govStatic.egdiRank ?? null,
        group: getEgdiGroup(govStatic.egdi),
        subindices: {
          osi: govStatic.osi ?? null,
          tii: govStatic.tii ?? null,
          hci: govStatic.hci_egdi ?? null,
        },
      },
    };
  }

  if (govStatic.gtmiScore != null || govStatic.gtmi) {
    latest.gtmi = {
      '2025': {
        score: govStatic.gtmiScore ?? null,
        rankWorld: govStatic.gtmiRankWorld ?? null,
        group: govStatic.gtmi ?? null,
        subindices: {
          cgsi: govStatic.cgsi ?? null,
          psdi: govStatic.psdi ?? null,
          dcei: govStatic.dcei ?? null,
          gtei: govStatic.gtei ?? null,
        },
      },
    };
  }

  if (govStatic.gciScore != null) {
    const tier = getGciTier(govStatic.gciScore);
    latest.gci = {
      '2024': {
        score: govStatic.gciScore,
        rankWorld: null,
        tier,
        tierLabel: GCI_TIER_LABELS[tier] ?? null,
      },
    };
  }

  if (govStatic.ocde != null || govStatic.ocdeRankALC != null) {
    latest.ocde = {
      '2023': {
        score: govStatic.ocde ?? null,
        rankWorld: null,
        rankALCManual: govStatic.ocdeRankALC ?? null,
        subindices: {
          dd: govStatic.dd ?? null,
          id: govStatic.id ?? null,
          gp: govStatic.gp ?? null,
          ad: govStatic.ad ?? null,
          iu: govStatic.iu ?? null,
          pr: govStatic.pr ?? null,
        },
      },
    };
  }

  if (govStatic.ai != null) {
    latest.ai = {
      '2023': {
        score: govStatic.ai,
        rankWorld: null,
      },
    };
  }

  return latest;
}

function buildMergedGovSeriesByIso() {
  const merged = {};

  for (const iso of ALC_ISO_LIST) {
    const staticSeries = buildLatestGovStaticSeries(iso);
    const historySeries = deepClone(GOV_HISTORY[iso] || {});
    const countrySeries = {};

    for (const indexKey of GOV_INDEX_ORDER) {
      const allYears = sortYearStrings([
        ...Object.keys(staticSeries[indexKey] || {}),
        ...Object.keys(historySeries[indexKey] || {}),
      ]);
      const combined = {};

      for (const year of allYears) {
        const staticEntry = staticSeries[indexKey]?.[year] || {};
        const historyEntry = historySeries[indexKey]?.[year] || {};
        const subindices = {
          ...(staticEntry.subindices || {}),
          ...(historyEntry.subindices || {}),
        };

        combined[year] = {
          ...staticEntry,
          ...historyEntry,
          ...(Object.keys(subindices).length ? { subindices } : {}),
        };
      }

      if (Object.keys(combined).length) {
        countrySeries[indexKey] = combined;
      }
    }

    merged[iso] = countrySeries;
  }

  return merged;
}

const GOV_SERIES_BY_ISO = buildMergedGovSeriesByIso();

function buildGovYearStatsByIndex() {
  const byIndex = {};

  for (const indexKey of GOV_INDEX_ORDER) {
    const years = sortYearStrings(
      ALC_ISO_LIST.flatMap((iso) => Object.keys(GOV_SERIES_BY_ISO[iso]?.[indexKey] || {}))
    );

    const yearStats = {};

    for (const year of years) {
      const scoresByIso = {};
      const rankWorldByIso = {};
      const groupsByIso = {};
      const tierByIso = {};
      const subKeySet = new Set();

      for (const iso of ALC_ISO_LIST) {
        const entry = GOV_SERIES_BY_ISO[iso]?.[indexKey]?.[year];
        if (!entry) continue;
        if (Number.isFinite(entry.score)) {
          scoresByIso[iso] = entry.score;
        }
        if (entry.rankWorld != null) {
          rankWorldByIso[iso] = entry.rankWorld;
        }
        if (entry.group != null) {
          groupsByIso[iso] = entry.group;
        }
        if (entry.tier != null) {
          tierByIso[iso] = entry.tier;
        }
        Object.keys(entry.subindices || {}).forEach((subKey) => subKeySet.add(subKey));
      }

      const subindices = {};
      for (const subKey of subKeySet) {
        const subScoresByIso = {};
        for (const iso of ALC_ISO_LIST) {
          const value = GOV_SERIES_BY_ISO[iso]?.[indexKey]?.[year]?.subindices?.[subKey];
          if (Number.isFinite(value)) {
            subScoresByIso[iso] = value;
          }
        }

        subindices[subKey] = {
          avg: averageNumberMap(subScoresByIso),
          rankMap: buildScoreRankMap(subScoresByIso),
          scoresByIso: subScoresByIso,
        };
      }

      yearStats[year] = {
        avg: averageNumberMap(scoresByIso),
        rankMap: buildScoreRankMap(scoresByIso),
        scoresByIso,
        rankWorldByIso,
        groupsByIso,
        tierByIso,
        subindices,
      };
    }

    byIndex[indexKey] = {
      years,
      yearStats,
      source: GOV_INDEX_SOURCES[indexKey] || null,
    };
  }

  return byIndex;
}

const GOV_YEAR_STATS_BY_INDEX = buildGovYearStatsByIndex();

function enrichGovCountryIndexSeries(iso, indexKey, isRegionAggregate = false) {
  const indexStats = GOV_YEAR_STATS_BY_INDEX[indexKey];
  const availableYears = isRegionAggregate
    ? indexStats.years
    : sortYearStrings(Object.keys(GOV_SERIES_BY_ISO[iso]?.[indexKey] || {}));

  const series = {};

  for (const year of availableYears) {
    const entry = GOV_SERIES_BY_ISO[iso]?.[indexKey]?.[year];
    const yearStats = indexStats.yearStats[year];
    if (!entry || !yearStats) continue;

    const score = Number.isFinite(entry.score) ? entry.score : null;
    const alcAvg = yearStats.avg;
    const rankALC = entry.rankALCManual ?? yearStats.rankMap[iso] ?? null;
    const subindices = {};

    for (const [subKey, subEntry] of Object.entries(entry.subindices || {})) {
      const subStats = yearStats.subindices[subKey] || { avg: null, rankMap: {}, scoresByIso: {} };
      subindices[subKey] = {
        score: Number.isFinite(subEntry) ? subEntry : null,
        alcAvg: subStats.avg,
        rankALC: subStats.rankMap[iso] ?? null,
        allAlc: subStats.scoresByIso,
      };
    }

    series[year] = {
      score,
      rankWorld: entry.rankWorld ?? null,
      rankALC,
      alcAvg,
      diffVsAlc: score != null && alcAvg != null ? +(score - alcAvg).toFixed(indexKey === 'gci' || indexKey === 'ai' ? 2 : 4) : null,
      group: entry.group ?? null,
      tier: entry.tier ?? null,
      tierLabel: entry.tierLabel ?? null,
      subindices,
      year,
      allAlc: yearStats.scoresByIso,
      source: GOV_INDEX_SOURCES[indexKey] || null,
    };
  }

  return {
    isRegionAggregate,
    latestYear: availableYears[0] ?? null,
    availableYears,
    source: GOV_INDEX_SOURCES[indexKey] || null,
    series,
  };
}

function buildCountryGovData(iso) {
  const govData = {};

  for (const indexKey of GOV_INDEX_ORDER) {
    govData[indexKey] = enrichGovCountryIndexSeries(iso, indexKey, false);
  }

  return govData;
}

function buildRegionalGovData() {
  const govData = { isRegionAggregate: true };

  for (const indexKey of GOV_INDEX_ORDER) {
    const indexStats = GOV_YEAR_STATS_BY_INDEX[indexKey];
    const series = {};

    for (const year of indexStats.years) {
      const yearStats = indexStats.yearStats[year];
      const subindices = {};

      for (const [subKey, subStats] of Object.entries(yearStats.subindices || {})) {
        subindices[subKey] = {
          score: subStats.avg,
          alcAvg: subStats.avg,
          rankALC: null,
          allAlc: subStats.scoresByIso,
        };
      }

      series[year] = {
        score: yearStats.avg,
        rankWorld: null,
        rankALC: null,
        alcAvg: yearStats.avg,
        diffVsAlc: 0,
        group: null,
        tier: null,
        tierLabel: null,
        subindices,
        year,
        allAlc: yearStats.scoresByIso,
        source: GOV_INDEX_SOURCES[indexKey] || null,
      };
    }

    govData[indexKey] = {
      isRegionAggregate: true,
      latestYear: indexStats.years[0] ?? null,
      availableYears: indexStats.years,
      source: GOV_INDEX_SOURCES[indexKey] || null,
      series,
    };
  }

  return govData;
}

function buildScoreRankMapForEntries(valuesByIso = {}) {
  return Object.fromEntries(
    Object.entries(valuesByIso)
      .filter(([, value]) => Number.isFinite(value))
      .sort((a, b) => b[1] - a[1])
      .map(([iso], index) => [iso, index + 1])
  );
}

function averageEntries(valuesByIso = {}) {
  const values = Object.values(valuesByIso).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildNetworkReadinessGovIndex(nriByIso = {}, iso = null, isRegionAggregate = false) {
  const entries = Object.entries(nriByIso).filter(([, value]) => value && Number.isFinite(value.score));
  if (!entries.length) {
    return {
      isRegionAggregate,
      latestYear: null,
      availableYears: [],
      source: 'Portulans Institute / Network Readiness Index',
      series: {},
    };
  }

  const scoresByIso = Object.fromEntries(entries.map(([countryIso, value]) => [countryIso, value.score]));
  const rankMap = buildScoreRankMapForEntries(scoresByIso);
  const subKeys = ['technology', 'people', 'governance', 'impact'];
  const subAverages = {};
  const subRankMaps = {};
  const subAllByIso = {};

  subKeys.forEach((subKey) => {
    const byIso = Object.fromEntries(
      entries
        .filter(([, value]) => Number.isFinite(value.subindices?.[subKey]))
        .map(([countryIso, value]) => [countryIso, value.subindices[subKey]])
    );
    subAllByIso[subKey] = byIso;
    subAverages[subKey] = averageEntries(byIso);
    subRankMaps[subKey] = buildScoreRankMapForEntries(byIso);
  });

  const availableYears = [...new Set(entries.map(([, value]) => String(value.year || '2025')))].sort((a, b) => Number(b) - Number(a));
  const year = availableYears[0];
  const averageScore = averageEntries(scoresByIso);

  if (isRegionAggregate) {
    return {
      isRegionAggregate: true,
      latestYear: year,
      availableYears,
      source: 'Portulans Institute / Network Readiness Index',
      series: {
        [year]: {
          score: averageScore,
          rankWorld: null,
          rankALC: null,
          alcAvg: averageScore,
          diffVsAlc: 0,
          group: null,
          tier: null,
          tierLabel: null,
          subindices: Object.fromEntries(
            subKeys.map((subKey) => [
              subKey,
              {
                score: subAverages[subKey],
                alcAvg: subAverages[subKey],
                rankALC: null,
                allAlc: subAllByIso[subKey],
              },
            ])
          ),
          year,
          allAlc: scoresByIso,
          source: 'Portulans Institute / Network Readiness Index',
        },
      },
    };
  }

  const current = nriByIso[iso];
  if (!current || !Number.isFinite(current.score)) {
    return {
      isRegionAggregate: false,
      latestYear: null,
      availableYears: [],
      source: 'Portulans Institute / Network Readiness Index',
      series: {},
    };
  }

  return {
    isRegionAggregate: false,
    latestYear: year,
    availableYears,
    source: current.source || 'Portulans Institute / Network Readiness Index',
    series: {
      [year]: {
        score: current.score,
        rankWorld: current.rankWorld ?? null,
        rankALC: rankMap[iso] ?? null,
        alcAvg: averageScore,
        diffVsAlc: averageScore != null ? +(current.score - averageScore).toFixed(2) : null,
        group: null,
        tier: null,
        tierLabel: null,
        subindices: Object.fromEntries(
          subKeys.map((subKey) => [
            subKey,
            {
              score: Number.isFinite(current.subindices?.[subKey]) ? current.subindices[subKey] : null,
              alcAvg: subAverages[subKey],
              rankALC: subRankMaps[subKey][iso] ?? null,
              allAlc: subAllByIso[subKey],
            },
          ])
        ),
        year,
        allAlc: scoresByIso,
        source: current.source || 'Portulans Institute / Network Readiness Index',
        pageUrl: current.pageUrl || null,
        reportUrl: current.reportUrl || null,
      },
    },
  };
}


module.exports = {
  GOV_SERIES_BY_ISO,
  GOV_YEAR_STATS_BY_INDEX,
  buildCountryGovData,
  buildRegionalGovData,
  buildNetworkReadinessGovIndex,
  sortYearStrings,
};
