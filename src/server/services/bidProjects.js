const { ISO2_BY_ISO3, REGION_AGGREGATE_ISO } = require('../data/countries');
const { createMemoryCache } = require('../utils/cache');

const BID_PROJECTS_RESOURCE_ID = 'dfa0c412-6570-4375-9ee1-267bdb39070e';
const BID_PROJECTS_API_URL = 'https://data.iadb.org/es/api/action/datastore_search';
const BID_PROJECTS_SOURCE_URL = `https://data.iadb.org/es/api/action/datastore_search?resource_id=${BID_PROJECTS_RESOURCE_ID}`;
const BID_PROJECTS_SEARCH_URL = 'https://www.iadb.org/es/proyectos/informacion-del-proyecto';
const BID_PROJECT_URL_BASE = 'https://www.iadb.org/es/proyecto/';
const BID_PROJECTS_PAGE_SIZE = 1000;
const bidProjectsCache = createMemoryCache(6 * 60 * 60 * 1000);

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const dateOnly = text.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

function normalizeAmount(value) {
  const normalized = Number.parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeProject(record) {
  const operNum = normalizeText(record.oper_num);

  return {
    oper_num: operNum,
    oper_nm: normalizeText(record.oper_nm),
    apprvl_dt: normalizeDate(record.apprvl_dt),
    cntry_cd: normalizeText(record.cntry_cd).toUpperCase(),
    cntry_nm: normalizeText(record.cntry_nm),
    sector_cd: normalizeText(record.sector_cd).toUpperCase(),
    sector_nm: normalizeText(record.sector_nm),
    subsector_nm: normalizeText(record.subsector_nm),
    sts_cd: normalizeText(record.sts_cd).toUpperCase(),
    publc_sts_nm: normalizeText(record.publc_sts_nm),
    totl_cost_orig: normalizeAmount(record.totl_cost_orig),
    project_url: operNum ? `${BID_PROJECT_URL_BASE}${encodeURIComponent(operNum)}` : BID_PROJECTS_SEARCH_URL,
  };
}

function buildBidProjectsApiUrl(offset = 0, limit = BID_PROJECTS_PAGE_SIZE) {
  const url = new URL(BID_PROJECTS_API_URL);
  url.searchParams.set('resource_id', BID_PROJECTS_RESOURCE_ID);
  url.searchParams.set('filters', JSON.stringify({ sector_cd: 'RM' }));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

async function fetchBidProjectsPage(offset = 0, limit = BID_PROJECTS_PAGE_SIZE) {
  const response = await fetch(buildBidProjectsApiUrl(offset, limit));
  if (!response.ok) {
    throw new Error(`BID API HTTP ${response.status}`);
  }

  const payload = await response.json();
  const result = payload?.result || {};
  return {
    total: Number(result.total) || 0,
    records: Array.isArray(result.records) ? result.records : [],
  };
}

function compareProjects(a, b) {
  const dateA = a.apprvl_dt || '';
  const dateB = b.apprvl_dt || '';
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return a.oper_num.localeCompare(b.oper_num, 'es', { sensitivity: 'base' });
}

async function fetchAllBidProjects() {
  const cached = bidProjectsCache.get('rm-projects');
  if (cached) return cached;

  const projects = [];
  const seen = new Set();
  let total = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset < total; offset += BID_PROJECTS_PAGE_SIZE) {
    const page = await fetchBidProjectsPage(offset, BID_PROJECTS_PAGE_SIZE);
    total = page.total || 0;

    page.records.forEach((record) => {
      const project = normalizeProject(record);
      if (!project.oper_num || seen.has(project.oper_num)) return;
      seen.add(project.oper_num);
      projects.push(project);
    });

    if (page.records.length < BID_PROJECTS_PAGE_SIZE) {
      break;
    }
  }

  projects.sort(compareProjects);

  const payload = {
    rows: projects,
    total: projects.length,
    sourceUrl: BID_PROJECTS_SOURCE_URL,
    searchUrl: BID_PROJECTS_SEARCH_URL,
    updatedAt: new Date().toISOString(),
  };

  bidProjectsCache.set('rm-projects', payload);
  return payload;
}

async function fetchBidProjectsByIso(iso3 = REGION_AGGREGATE_ISO) {
  const basePayload = await fetchAllBidProjects();
  const normalizedIso3 = normalizeText(iso3).toUpperCase() || REGION_AGGREGATE_ISO;
  const countryScoped = normalizedIso3 !== REGION_AGGREGATE_ISO;
  const countryCode = countryScoped ? ISO2_BY_ISO3[normalizedIso3] || null : null;
  const rows = countryCode
    ? basePayload.rows.filter((row) => row.cntry_cd === countryCode)
    : basePayload.rows.slice();

  return {
    ...basePayload,
    rows,
    total: rows.length,
    countryIso3: normalizedIso3,
    countryScoped,
  };
}

module.exports = {
  BID_PROJECTS_SEARCH_URL,
  BID_PROJECTS_SOURCE_URL,
  fetchBidProjectsByIso,
};
