function getEntriesWithValue(byIso = {}) {
  return Object.entries(byIso)
    .filter(([, entry]) => entry && entry.value != null)
    .map(([iso, entry]) => ({ iso, ...entry }));
}

function deriveAggregateYear(entries = []) {
  const years = entries
    .map((entry) => String(entry?.date || '').trim())
    .filter(Boolean);

  if (!years.length) return null;

  const counts = new Map();
  years.forEach((year) => counts.set(year, (counts.get(year) || 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return Number(b[0]) - Number(a[0]);
    })[0][0];
}

function sumEntries(entries = []) {
  return entries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
}

function averageEntries(entries = []) {
  if (!entries.length) return null;
  return sumEntries(entries) / entries.length;
}

function weightedAverageEntries(entries = [], weightsByIso = {}) {
  let weightedSum = 0;
  let weightSum = 0;

  entries.forEach((entry) => {
    const weight = Number(weightsByIso[entry.iso] ?? null);
    const value = Number(entry.value ?? null);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(value)) return;
    weightedSum += value * weight;
    weightSum += weight;
  });

  return weightSum > 0 ? weightedSum / weightSum : null;
}

function buildAggregateIndicator(def, byIso, regionCountryCount, extra = {}) {
  const entries = getEntriesWithValue(byIso);
  return {
    ...def,
    isRegionAggregate: true,
    value: extra.value ?? null,
    date: extra.date ?? deriveAggregateYear(entries),
    source: extra.source || entries[0]?.source || def.source || 'Banco Mundial',
    rankALC: null,
    totalALC: regionCountryCount,
  };
}

function buildRegionalAggregateIndicators({ indicators, regionCountryCount, regionDataByKey, hdiRegionData }) {
  const populationEntries = getEntriesWithValue(regionDataByKey.population?.byIso);
  const laborForceEntries = getEntriesWithValue(regionDataByKey.laborForce?.byIso);
  const gdpEntries = getEntriesWithValue(regionDataByKey.gdpTotal?.byIso);

  const populationTotal = sumEntries(populationEntries);
  const laborForceTotal = sumEntries(laborForceEntries);
  const gdpTotal = sumEntries(gdpEntries);

  const populationWeights = Object.fromEntries(populationEntries.map((entry) => [entry.iso, entry.value]));
  const laborForceWeights = Object.fromEntries(laborForceEntries.map((entry) => [entry.iso, entry.value]));
  const gdpWeights = Object.fromEntries(gdpEntries.map((entry) => [entry.iso, entry.value]));

  const aggregateStrategies = {
    population: () => buildAggregateIndicator(indicators.population, regionDataByKey.population.byIso, regionCountryCount, { value: populationTotal }),
    laborForce: () => buildAggregateIndicator(indicators.laborForce, regionDataByKey.laborForce.byIso, regionCountryCount, { value: laborForceTotal }),
    unemployment: () => buildAggregateIndicator(indicators.unemployment, regionDataByKey.unemployment.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.unemployment?.byIso), laborForceWeights),
    }),
    gdpTotal: () => buildAggregateIndicator(indicators.gdpTotal, regionDataByKey.gdpTotal.byIso, regionCountryCount, { value: gdpTotal }),
    gdpPerCapita: () => buildAggregateIndicator(indicators.gdpPerCapita, regionDataByKey.gdpPerCapita.byIso, regionCountryCount, {
      value: populationTotal > 0 ? gdpTotal / populationTotal : null,
      date: deriveAggregateYear([...populationEntries, ...gdpEntries]),
    }),
    gdpGrowth: () => buildAggregateIndicator(indicators.gdpGrowth, regionDataByKey.gdpGrowth.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.gdpGrowth?.byIso), gdpWeights),
    }),
    hdi: () => buildAggregateIndicator(indicators.hdi, hdiRegionData.byIso, regionCountryCount, {
      value: 0.783,
      date: '2023',
      source: 'PNUD HDR 2025',
    }),
    gini: () => buildAggregateIndicator(indicators.gini, regionDataByKey.gini.byIso, regionCountryCount, {
      value: averageEntries(getEntriesWithValue(regionDataByKey.gini?.byIso)),
    }),
    internetUsers: () => buildAggregateIndicator(indicators.internetUsers, regionDataByKey.internetUsers.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.internetUsers?.byIso), populationWeights),
    }),
    householdInternet: () => buildAggregateIndicator(indicators.householdInternet, regionDataByKey.householdInternet.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.householdInternet?.byIso), populationWeights),
    }),
    mobileSubs: () => buildAggregateIndicator(indicators.mobileSubs, regionDataByKey.mobileSubs.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.mobileSubs?.byIso), populationWeights),
    }),
    broadband: () => buildAggregateIndicator(indicators.broadband, regionDataByKey.broadband.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.broadband?.byIso), populationWeights),
    }),
    coverage5g: () => buildAggregateIndicator(indicators.coverage5g, regionDataByKey.coverage5g.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.coverage5g?.byIso), populationWeights),
    }),
    coverage4g: () => buildAggregateIndicator(indicators.coverage4g, regionDataByKey.coverage4g.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.coverage4g?.byIso), populationWeights),
    }),
    coverage3g: () => buildAggregateIndicator(indicators.coverage3g, regionDataByKey.coverage3g.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.coverage3g?.byIso), populationWeights),
    }),
    findexBuy: () => buildAggregateIndicator(indicators.findexBuy, regionDataByKey.findexBuy.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexBuy?.byIso), populationWeights),
    }),
    findexPayOnline: () => buildAggregateIndicator(indicators.findexPayOnline, regionDataByKey.findexPayOnline.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexPayOnline?.byIso), populationWeights),
    }),
    findexBalance: () => buildAggregateIndicator(indicators.findexBalance, regionDataByKey.findexBalance.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexBalance?.byIso), populationWeights),
    }),
    findexMadePay: () => buildAggregateIndicator(indicators.findexMadePay, regionDataByKey.findexMadePay.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexMadePay?.byIso), populationWeights),
    }),
    findexRecvPay: () => buildAggregateIndicator(indicators.findexRecvPay, regionDataByKey.findexRecvPay.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexRecvPay?.byIso), populationWeights),
    }),
    digitalServicesExports: () => buildAggregateIndicator(indicators.digitalServicesExports, regionDataByKey.digitalServicesExports.byIso, regionCountryCount, {
      value: sumEntries(getEntriesWithValue(regionDataByKey.digitalServicesExports?.byIso)),
    }),
    ictPatents: () => buildAggregateIndicator(indicators.ictPatents, regionDataByKey.ictPatents.byIso, regionCountryCount, {
      value: sumEntries(getEntriesWithValue(regionDataByKey.ictPatents?.byIso)),
    }),
    stemGraduates: () => buildAggregateIndicator(indicators.stemGraduates, regionDataByKey.stemGraduates.byIso, regionCountryCount, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.stemGraduates?.byIso), populationWeights),
    }),
  };

  return Object.fromEntries(
    Object.keys(indicators).map((key) => [key, aggregateStrategies[key] ? aggregateStrategies[key]() : null])
  );
}

module.exports = {
  averageEntries,
  buildAggregateIndicator,
  buildRegionalAggregateIndicators,
  deriveAggregateYear,
  getEntriesWithValue,
  sumEntries,
  weightedAverageEntries,
};
