const { createMemoryCache } = require('../utils/cache');

const NRI_YEAR = '2025';
const NRI_BASE_URL = 'https://networkreadinessindex.org';
const NRI_PAGE_BY_ISO = {
  ARG: '/country/argentina/',
  BOL: '/country/bolivia-plurinational-state-of/',
  BRA: '/country/brazil/',
  CHL: '/country/chile/',
  COL: '/country/colombia/',
  CRI: '/country/costa-rica/',
  DOM: '/country/dominican-republic/',
  ECU: '/country/ecuador/',
  SLV: '/country/el-salvador/',
  GTM: '/country/guatemala/',
  HND: '/country/honduras/',
  JAM: '/country/jamaica/',
  MEX: '/country/mexico/',
  NIC: '/country/nicaragua/',
  PAN: '/country/panama/',
  PRY: '/country/paraguay/',
  PER: '/country/peru/',
  TTO: '/country/trinidad-and-tobago/',
  URY: '/country/uruguay/',
};

const nriCache = createMemoryCache(24 * 60 * 60 * 1000);

function compactHtmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '-')
    .replace(/&middot;/g, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractReportUrl(html, fallbackUrl) {
  const match = html.match(/href="([^"]*download\.networkreadinessindex\.org[^"]+)"/i);
  return match ? match[1] : fallbackUrl;
}

function parseCountryPage(html, iso) {
  const text = compactHtmlToText(html);
  const overviewMatch = text.match(
    /Performance Overview\s+ISO3\s+[A-Z]{3}\s+Country\s+.+?\s+Score\s+([0-9.]+)\s+Rank\s+([0-9]+)\s+Technology\s+([0-9.]+)\s+People\s+([0-9.]+)\s+Governance\s+([0-9.]+)\s+Impact\s+([0-9.]+)/i
  );

  if (!overviewMatch) {
    throw new Error(`No se pudo parsear el NRI para ${iso}`);
  }

  const [, score, rankWorld, technology, people, governance, impact] = overviewMatch;
  const pageUrl = `${NRI_BASE_URL}${NRI_PAGE_BY_ISO[iso]}`;

  return {
    iso,
    year: NRI_YEAR,
    score: Number(score),
    rankWorld: Number(rankWorld),
    subindices: {
      technology: Number(technology),
      people: Number(people),
      governance: Number(governance),
      impact: Number(impact),
    },
    pageUrl,
    reportUrl: extractReportUrl(html, pageUrl),
    source: 'Portulans Institute / Network Readiness Index',
  };
}

async function fetchCountryNri(iso) {
  const pagePath = NRI_PAGE_BY_ISO[iso];
  if (!pagePath) return null;

  const res = await fetch(`${NRI_BASE_URL}${pagePath}`);
  if (!res.ok) {
    throw new Error(`NRI ${iso}: HTTP ${res.status}`);
  }

  const html = await res.text();
  return parseCountryPage(html, iso);
}

async function fetchNetworkReadinessData() {
  const cached = nriCache.get('nri');
  if (cached) return cached;

  const entries = await Promise.all(
    Object.keys(NRI_PAGE_BY_ISO).map(async (iso) => {
      try {
        const data = await fetchCountryNri(iso);
        return [iso, data];
      } catch (error) {
        console.warn(`NRI no disponible para ${iso}:`, error.message);
        return [iso, null];
      }
    })
  );

  const byIso = Object.fromEntries(entries.filter(([, data]) => data));
  nriCache.set('nri', byIso);
  return byIso;
}

module.exports = {
  NRI_YEAR,
  NRI_PAGE_BY_ISO,
  fetchNetworkReadinessData,
};
