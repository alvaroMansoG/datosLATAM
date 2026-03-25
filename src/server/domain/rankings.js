const LOWER_IS_BETTER_INDICATORS = new Set(['SI.POV.GINI']);

function toFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/,/g, '');
  if (!normalized || normalized === '..' || normalized.toLowerCase() === 'n/a') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildIndicatorRanking(valuesByIso, indicatorCode = null) {
  const lowerIsBetter = LOWER_IS_BETTER_INDICATORS.has(String(indicatorCode || '').toUpperCase());
  const sorted = Object.entries(valuesByIso)
    .filter(([, entry]) => entry && entry.value != null)
    .sort((a, b) => (lowerIsBetter ? a[1].value - b[1].value : b[1].value - a[1].value));

  return Object.fromEntries(sorted.map(([iso], index) => [iso, index + 1]));
}

module.exports = {
  buildIndicatorRanking,
  toFiniteNumber,
};
