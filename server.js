const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = 3000;

// ─── In-memory cache ───────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}
function getTimedCache(store, key, ttl) {
  const entry = store.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.data;
  return null;
}
function setTimedCache(store, key, data) {
  store.set(key, { data, ts: Date.now() });
}

// ─── Exchange rate cache (30 min) ──────────────────────
let ratesCache = { data: null, ts: 0 };
const RATES_TTL = 30 * 60 * 1000;
let warnedAboutUndpConfig = false;
const indicatorRegionCache = new Map();
const INDICATOR_REGION_TTL = 30 * 60 * 1000;
const countryMetadataCache = new Map();
const COUNTRY_METADATA_TTL = 24 * 60 * 60 * 1000;
const REGION_AGGREGATE_ISO = 'ALC';
const REGION_AGGREGATE_NAME = 'América Latina y el Caribe';

async function getExchangeRates() {
  if (ratesCache.data && Date.now() - ratesCache.ts < RATES_TTL) {
    return ratesCache.data;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await res.json();
    if (json.result === 'success') {
      ratesCache = { data: json.rates, ts: Date.now() };
      return json.rates;
    }
  } catch (err) {
    console.error('Error fetching exchange rates:', err.message);
  }
  return ratesCache.data || {};
}

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

// ─── World Bank indicators ────────────────────────────
const INDICATORS = {
  // Panel 1: Datos Básicos
  population:    { code: 'SP.POP.TOTL',      label: 'Población total',                    icon: '👥', category: 'basic',        format: 'number'   },
  laborForce:    { code: 'SL.TLF.TOTL.IN',   label: 'Fuerza laboral total',               icon: '🧑‍💼', category: 'basic',        format: 'number', embeddedIn: 'population' },
  unemployment:  { code: 'SL.UEM.TOTL.ZS',   label: 'Desempleo total',                    icon: '📉', category: 'basic',        format: 'percent', embeddedIn: 'population' },
  gdpTotal:      { code: 'NY.GDP.MKTP.CD',   label: 'PIB (USD corrientes)',               icon: '🏛️', category: 'basic',        format: 'currency' },
  gdpPerCapita:  { code: 'NY.GDP.PCAP.CD',   label: 'PIB per cápita (USD)',               icon: '💰', category: 'basic',        format: 'currency', embeddedIn: 'gdpTotal' },
  gdpGrowth:     { code: 'NY.GDP.MKTP.KD.ZG', label: 'Crecimiento del PIB',               icon: '📈', category: 'basic',        format: 'percent', embeddedIn: 'gdpTotal' },
  hdi:           { code: 'UNDP.HDI',          label: 'Índice de Desarrollo Humano (0-1)',  icon: '🎓', category: 'basic',        format: 'decimal', embeddedIn: 'population' },
  gini:          { code: 'SI.POV.GINI',      label: 'Índice de Gini',                     icon: '⚖️', category: 'basic',        format: 'decimal', embeddedIn: 'gdpTotal' },

  // Panel 2: Conectividad
  internetUsers: { code: 'ITU_DH_INT_USER_PT', label: 'Personas usuarias de internet',      icon: '🌐', category: 'connectivity', format: 'percent', source: 'ITU DataHub vía Data360 del Banco Mundial', databaseId: 'ITU_DH' },
  householdInternet: { code: 'ITU_DH_HH_INT', label: 'Hogares con internet',                icon: '🏠', category: 'connectivity', format: 'percent', source: 'ITU DataHub vía Data360 del Banco Mundial', databaseId: 'ITU_DH' },
  mobileSubs:    { code: 'ITU_DH_MOB_SUB_PER_100', label: 'Celulares por cada 100 hab.',    icon: '📱', category: 'connectivity', format: 'decimal', source: 'ITU DataHub vía Data360 del Banco Mundial', databaseId: 'ITU_DH', fallbackCode: 'IT.CEL.SETS.P2' },
  broadband:     { code: 'IT.NET.BBND.P2',    label: 'Banda ancha fija por 100 hab.',      icon: '📡', category: 'connectivity', format: 'decimal'  },
  coverage5g:    { code: 'ITU_DH_POP_COV_5G', label: 'Cobertura 5G (% población)',         icon: '📶', category: 'connectivity', format: 'percent', source: 'ITU DataHub vía Data360 del Banco Mundial', databaseId: 'ITU_DH' },
  coverage4g:    { code: 'ITU_DH_POP_COV_4G', label: 'Cobertura 4G (% población)',         icon: '📶', category: 'connectivity', format: 'percent', source: 'ITU DataHub vía Data360 del Banco Mundial', databaseId: 'ITU_DH' },
  coverage3g:    { code: 'ITU_DH_POP_COV_3G', label: 'Cobertura 3G (% población)',         icon: '📶', category: 'connectivity', format: 'percent', source: 'ITU DataHub vía Data360 del Banco Mundial', databaseId: 'ITU_DH' },
  
  // Panel 3: Servicios Financieros Digitales
  findexBuy:     { code: 'FIN26B',            label: 'Compró en línea (móvil/internet)',   icon: '🛒', category: 'findex',       format: 'percent'  },
  findexPayOnline: { code: 'FIN27A',          label: 'Pagó digitalmente compra en línea',  icon: '💳', category: 'findex',       format: 'percent'  },
  findexBalance: { code: 'FIN9B',             label: 'Consultó saldo (móvil/internet)',    icon: '🏦', category: 'findex',       format: 'percent'  },
  findexMadePay: { code: 'g20.made',          label: 'Realizó un pago digital',            icon: '💸', category: 'findex',       format: 'percent'  },
  findexRecvPay: { code: 'g20.received',      label: 'Recibió un pago digital',            icon: '📥', category: 'findex',       format: 'percent'  },
  digitalServicesExports: { code: 'UNCTAD_DE_DIG_SERVTRADE_ANN_EXP', label: 'Exportaciones de servicios digitales', icon: '🌍', category: 'findex', format: 'millionUsd', source: 'UNCTAD vía Data360 del Banco Mundial', databaseId: 'UNCTAD_DE' },
  ictPatents:    { code: 'WIPO_ICT_PAT_PUB_TOT', label: 'Publicaciones de patentes TIC',   icon: '💡', category: 'findex',       format: 'number', source: 'WIPO vía Data360 del Banco Mundial', databaseId: 'WIPO_ICT' },
  stemGraduates: { code: 'UNESCO_UIS_GRAD_STEM', label: 'Graduados STEM en educación terciaria', icon: '🧪', category: 'findex', format: 'percent', source: 'UNESCO UIS vía Data360 del Banco Mundial', databaseId: 'UNESCO_UIS' },
};

// ─── Static E-Government Indices (UN EGDI 2024 + GTMI 2025 + GCI 2024) ───
const GOV_DATA = {
  //          EGDI 2024 ─────────────────────────────────────────── GCI 2024 ──────────── GTMI 2025 ──────────────────────────────────────────────────────────────────────────
  ARG: { egdi: 0.8573, egdiRank: 42,  osi: 0.7965, tii: 0.8425, hci_egdi: 0.9330, epi: 0.6301, gciScore: 51.525, gciYear:'2024', gtmi:'A', gtmiScore:0.753, gtmiRankWorld: 80,  cgsi:0.789, psdi:0.907, dcei:0.640, gtei:0.677, ocde:0.427, ocdeRankALC:6, dd:0.573, id:0.443, gp:0.404, ad:0.383, iu:0.450, pr:0.309, hdi: 0.849, ai: 57.72 },
  BRA: { egdi: 0.8403, egdiRank: 50,  osi: 0.9063, tii: 0.8069, hci_egdi: 0.8077, epi: 0.8630, gciScore: 96.545, gciYear:'2024', gtmi:'A', gtmiScore:0.986, gtmiRankWorld:  4,  cgsi:0.990, psdi:0.991, dcei:0.975, gtei:0.987, ocde:0.619, ocdeRankALC:4, dd:0.622, id:0.628, gp:0.645, ad:0.522, iu:0.639, pr:0.658, hdi: 0.760, ai: 63.70 },
  CHL: { egdi: 0.8827, egdiRank: 31,  osi: 0.8612, tii: 0.9455, hci_egdi: 0.8413, epi: 0.8356, gciScore: 70.239, gciYear:'2024', gtmi:'A', gtmiScore:0.872, gtmiRankWorld: 35,  cgsi:0.786, psdi:0.913, dcei:0.865, gtei:0.925, ocde:0.398, ocdeRankALC:9, dd:0.407, id:0.469, gp:0.374, ad:0.250, iu:0.383, pr:0.504, hdi: 0.860, ai: 62.15 },
  PRY: { egdi: 0.7251, egdiRank: 80,  osi: 0.6712, tii: 0.7947, hci_egdi: 0.7093, epi: 0.6027, gciScore: 74.934, gciYear:'2024', gtmi:'A', gtmiScore:0.718, gtmiRankWorld: 83,  cgsi:0.830, psdi:0.854, dcei:0.515, gtei:0.675, ocde:0.406, ocdeRankALC:8, dd:0.615, id:0.222, gp:0.543, ad:0.440, iu:0.428, pr:0.191, hdi: 0.717, ai: 45.10 },
  URY: { egdi: 0.9006, egdiRank: 25,  osi: 0.8832, tii: 0.9437, hci_egdi: 0.8749, epi: 0.8630, gciScore: 94.699, gciYear:'2024', gtmi:'A', gtmiScore:0.908, gtmiRankWorld: 23,  cgsi:0.902, psdi:0.948, dcei:0.930, gtei:0.851, ocde:0.676, ocdeRankALC:2, dd:0.759, id:0.693, gp:0.717, ad:0.609, iu:0.585, pr:0.693, hdi: 0.830, ai: 61.80 },
  BOL: { egdi: 0.6651, egdiRank: 99,  osi: 0.5987, tii: 0.7089, hci_egdi: 0.6877, epi: 0.4247, gciScore: 43.152, gciYear:'2024', gtmi:'B', gtmiScore:0.572, gtmiRankWorld:109,  cgsi:0.695, psdi:0.712, dcei:0.287, gtei:0.595, ocde:0.247, ocdeRankALC:13, dd:0.401, id:0.250, gp:0.250, ad:0.361, iu:0.123, pr:0.097, hdi: 0.698, ai: 41.50 },
  COL: { egdi: 0.7793, egdiRank: 68,  osi: 0.7521, tii: 0.8065, hci_egdi: 0.7793, epi: 0.7397, gciScore: 65.727, gciYear:'2024', gtmi:'A', gtmiScore:0.817, gtmiRankWorld: 56,  cgsi:0.835, psdi:0.751, dcei:0.803, gtei:0.878, ocde:0.736, ocdeRankALC:1, dd:0.814, id:0.794, gp:0.654, ad:0.731, iu:0.775, pr:0.647, hdi: 0.758, ai: 59.50 },
  ECU: { egdi: 0.7800, egdiRank: 67,  osi: 0.8851, tii: 0.6834, hci_egdi: 0.7715, epi: 0.8767, gciScore: 87.110, gciYear:'2024', gtmi:'A', gtmiScore:0.822, gtmiRankWorld: 55,  cgsi:0.839, psdi:0.907, dcei:0.669, gtei:0.871, ocde:0.387, ocdeRankALC:10, dd:0.446, id:0.314, gp:0.464, ad:0.428, iu:0.519, pr:0.155, hdi: 0.765, ai: 46.50 },
  PER: { egdi: 0.8070, egdiRank: 58,  osi: 0.8377, tii: 0.8364, hci_egdi: 0.7469, epi: 0.7534, gciScore: 83.593, gciYear:'2024', gtmi:'A', gtmiScore:0.921, gtmiRankWorld: 19,  cgsi:0.903, psdi:0.968, dcei:0.880, gtei:0.931, ocde:0.620, ocdeRankALC:3, dd:0.780, id:0.790, gp:0.530, ad:0.512, iu:0.814, pr:0.292, hdi: 0.762, ai: 54.30 },
  VEN: { egdi: 0.5360, egdiRank: 131, osi: 0.3576, tii: 0.5391, hci_egdi: 0.7115, epi: 0.2192, gciScore: 40.499, gciYear:'2024', gtmi:'C', gtmiScore:0.342, gtmiRankWorld:155,  cgsi:0.431, psdi:0.488, dcei:0.040, gtei:0.410, ocde:0.204, ocdeRankALC:17, dd:0.428, id:0.151, gp:0.139, ad:0.227, iu:0.140, pr:0.136, hdi: 0.699, ai: 36.50 },
  BLZ: { egdi: 0.4872, egdiRank: 141, osi: 0.4055, tii: 0.5292, hci_egdi: 0.5270, epi: 0.2329, gciScore: 32.350, gciYear:'2024', gtmi:'C', gtmiScore:0.339, gtmiRankWorld:157,  cgsi:0.462, psdi:0.374, dcei:0.042, gtei:0.477, ocde:0.092, ocdeRankALC:19, dd:0.319, id:0.045, gp:0.017, ad:0.000, iu:0.172, pr:0.000, hdi: 0.700, ai: 40.10 },
  CRI: { egdi: 0.8009, egdiRank: 61,  osi: 0.7217, tii: 0.8933, hci_egdi: 0.7877, epi: 0.7260, gciScore: 75.075, gciYear:'2024', gtmi:'A', gtmiScore:0.770, gtmiRankWorld: 73,  cgsi:0.659, psdi:0.777, dcei:0.830, gtei:0.814, ocde:0.224, ocdeRankALC:15, dd:0.283, id:0.317, gp:0.118, ad:0.288, iu:0.321, pr:0.019, hdi: 0.806, ai: 52.50 },
  SLV: { egdi: 0.5988, egdiRank: 115, osi: 0.5090, tii: 0.7526, hci_egdi: 0.5348, epi: 0.3836, gciScore: 37.294, gciYear:'2024', gtmi:'B', gtmiScore:0.704, gtmiRankWorld: 87,  cgsi:0.662, psdi:0.878, dcei:0.438, gtei:0.839, ocde:null, ocdeRankALC:null, dd:null, id:null, gp:null, ad:null, iu:null, pr:null, hdi: 0.674, ai: 43.20 },
  GTM: { egdi: 0.5738, egdiRank: 122, osi: 0.6538, tii: 0.5843, hci_egdi: 0.4834, epi: 0.4658, gciScore: 39.983, gciYear:'2024', gtmi:'B', gtmiScore:0.573, gtmiRankWorld:108,  cgsi:0.533, psdi:0.762, dcei:0.625, gtei:0.371, ocde:0.225, ocdeRankALC:14, dd:0.417, id:0.140, gp:0.118, ad:0.210, iu:0.354, pr:0.109, hdi: 0.629, ai: 38.60 },
  HTI: { egdi: 0.2117, egdiRank: 186, osi: 0.1379, tii: 0.2087, hci_egdi: 0.2883, epi: 0.0959, gciScore: 24.281, gciYear:'2024', gtmi:'D', gtmiScore:0.138, gtmiRankWorld:186,  cgsi:0.259, psdi:0.087, dcei:0.115, gtei:0.089, ocde:0.014, ocdeRankALC:23, dd:0.020, id:0.045, gp:0.021, ad:0.000, iu:0.000, pr:0.000, hdi: 0.552, ai: 21.97 },
  HND: { egdi: 0.4856, egdiRank: 142, osi: 0.4587, tii: 0.4799, hci_egdi: 0.5182, epi: 0.3014, gciScore: 28.077, gciYear:'2024', gtmi:'B', gtmiScore:0.581, gtmiRankWorld:107,  cgsi:0.588, psdi:0.767, dcei:0.303, gtei:0.666, ocde:0.157, ocdeRankALC:18, dd:0.264, id:0.045, gp:0.204, ad:0.137, iu:0.221, pr:0.071, hdi: 0.624, ai: 39.80 },
  MEX: { egdi: 0.7850, egdiRank: 65,  osi: 0.7637, tii: 0.8310, hci_egdi: 0.7603, epi: 0.7397, gciScore: 85.762, gciYear:'2024', gtmi:'A', gtmiScore:0.825, gtmiRankWorld: 52,  cgsi:0.807, psdi:0.895, dcei:0.788, gtei:0.810, ocde:0.536, ocdeRankALC:5, dd:0.658, id:0.473, gp:0.638, ad:0.466, iu:0.479, pr:0.501, hdi: 0.781, ai: 54.00 },
  NIC: { egdi: 0.5318, egdiRank: 132, osi: 0.4493, tii: 0.5851, hci_egdi: 0.5610, epi: 0.2329, gciScore: 20.553, gciYear:'2024', gtmi: null, gtmiScore: null, gtmiRankWorld:null, cgsi: null, psdi: null, dcei: null, gtei: null, ocde:null, ocdeRankALC:null, dd:null, id:null, gp:null, ad:null, iu:null, pr:null, hdi: 0.669, ai: 35.10 },
  PAN: { egdi: 0.7298, egdiRank: 79,  osi: 0.6505, tii: 0.8523, hci_egdi: 0.6866, epi: 0.5205, gciScore: 66.539, gciYear:'2024', gtmi:'A', gtmiScore:0.762, gtmiRankWorld: 78,  cgsi:0.694, psdi:0.700, dcei:0.838, gtei:0.813, ocde:0.335, ocdeRankALC:11, dd:0.525, id:0.352, gp:0.325, ad:0.289, iu:0.303, pr:0.215, hdi: 0.820, ai: 49.00 },
  DOM: { egdi: 0.7013, egdiRank: 85,  osi: 0.6405, tii: 0.7444, hci_egdi: 0.7189, epi: 0.6575, gciScore: 75.828, gciYear:'2024', gtmi:'A', gtmiScore:0.823, gtmiRankWorld: 54,  cgsi:0.840, psdi:0.797, dcei:0.893, gtei:0.763, ocde:0.419, ocdeRankALC:7, dd:0.627, id:0.299, gp:0.381, ad:0.651, iu:0.503, pr:0.053, hdi: 0.766, ai: 51.10 },
  BHS: { egdi: 0.7143, egdiRank: 83,  osi: 0.5402, tii: 0.8652, hci_egdi: 0.7376, epi: 0.3151, gciScore: 34.000, gciYear:'2024', gtmi:'B', gtmiScore:0.502, gtmiRankWorld:122,  cgsi:0.572, psdi:0.730, dcei:0.162, gtei:0.544, ocde:0.057, ocdeRankALC:21, dd:0.184, id:0.045, gp:0.044, ad:0.059, iu:0.011, pr:0.000, hdi: 0.820, ai: 43.40 },
  BRB: { egdi: 0.6815, egdiRank: 91,  osi: 0.4976, tii: 0.7624, hci_egdi: 0.7845, epi: 0.3288, gciScore: 36.606, gciYear:'2024', gtmi:'C', gtmiScore:0.318, gtmiRankWorld:162,  cgsi:0.430, psdi:0.494, dcei:0.059, gtei:0.289, ocde:null, ocdeRankALC:null, dd:null, id:null, gp:null, ad:null, iu:null, pr:null, hdi: 0.809, ai: 45.30 },
  GUY: { egdi: 0.5443, egdiRank: 128, osi: 0.3455, tii: 0.6942, hci_egdi: 0.5933, epi: 0.2192, gciScore: 47.380, gciYear:'2024', gtmi:'C', gtmiScore:0.379, gtmiRankWorld:142,  cgsi:0.391, psdi:0.560, dcei:0.137, gtei:0.427, ocde:0.081, ocdeRankALC:20, dd:0.214, id:0.045, gp:0.071, ad:0.000, iu:0.128, pr:0.030, hdi: 0.742, ai: 42.10 },
  JAM: { egdi: 0.6678, egdiRank: 96,  osi: 0.5677, tii: 0.7296, hci_egdi: 0.7060, epi: 0.4384, gciScore: 58.028, gciYear:'2024', gtmi:'B', gtmiScore:0.543, gtmiRankWorld:114,  cgsi:0.584, psdi:0.676, dcei:0.380, gtei:0.533, ocde:0.267, ocdeRankALC:12, dd:0.456, id:0.300, gp:0.310, ad:0.161, iu:0.308, pr:0.067, hdi: 0.706, ai: 47.80 },
  SUR: { egdi: 0.6366, egdiRank: 106, osi: 0.4814, tii: 0.8714, hci_egdi: 0.5568, epi: 0.2877, gciScore: 34.785, gciYear:'2024', gtmi:'C', gtmiScore:0.325, gtmiRankWorld:160,  cgsi:0.396, psdi:0.292, dcei:0.240, gtei:0.372, ocde:0.053, ocdeRankALC:22, dd:0.186, id:0.045, gp:0.055, ad:0.000, iu:0.011, pr:0.020, hdi: 0.690, ai: 39.50 },
  TTO: { egdi: 0.6973, egdiRank: 86,  osi: 0.5999, tii: 0.7745, hci_egdi: 0.7174, epi: 0.3288, gciScore: 56.223, gciYear:'2024', gtmi:'C', gtmiScore:0.459, gtmiRankWorld:127,  cgsi:0.427, psdi:0.598, dcei:0.277, gtei:0.535, ocde:0.209, ocdeRankALC:16, dd:0.429, id:0.068, gp:0.149, ad:0.075, iu:0.457, pr:0.075, hdi: 0.814, ai: 48.20 },
};

// ─── EGDI group classification (UN 2024 thresholds) ──
function getEgdiGroup(score) {
  if (score == null) return null;
  if (score >= 0.75) return 'VHEGDI';
  if (score >= 0.50) return 'HEGDI';
  if (score >= 0.25) return 'MEGDI';
  return 'LEGDI';
}

// ─── GCI tier derivation (ITU 2024) ──────────────────
const GCI_TIER_LABELS = {
  T1: 'Tier 1 · Rol Modelo',
  T2: 'Tier 2 · Avanzado',
  T3: 'Tier 3 · En desarrollo',
  T4: 'Tier 4 · Estableciendo capacidades',
  T5: 'Tier 5 · Inicial',
};
function getGciTier(score) {
  if (score == null) return null;
  if (score >= 95) return 'T1';
  if (score >= 85) return 'T2';
  if (score >= 55) return 'T3';
  if (score >= 20) return 'T4';
  return 'T5';
}

// ─── GTMI group description ───────────────────────────
const GTMI_GROUP_LABELS = { A: 'Grupo A · Líder GovTech', B: 'Grupo B · Foco Significativo', C: 'Grupo C · Foco Emergente', D: 'Grupo D · Inicio' };

// ─── ALC stats computed at startup ──────────────────
const ALC_ISO_LIST = Object.keys(GOV_DATA);
const _alcEgdiSorted  = [...ALC_ISO_LIST].sort((a, b) => GOV_DATA[b].egdi - GOV_DATA[a].egdi);
const _alcGciSorted   = [...ALC_ISO_LIST].sort((a, b) => GOV_DATA[b].gciScore - GOV_DATA[a].gciScore);
const _alcGtmiSorted  = [...ALC_ISO_LIST].filter(iso => GOV_DATA[iso].gtmiScore != null).sort((a, b) => GOV_DATA[b].gtmiScore - GOV_DATA[a].gtmiScore);
const _alcHdiSorted   = [...ALC_ISO_LIST].filter(iso => GOV_DATA[iso].hdi != null).sort((a, b) => GOV_DATA[b].hdi - GOV_DATA[a].hdi);
const _alcAiSorted    = [...ALC_ISO_LIST].filter(iso => GOV_DATA[iso].ai != null).sort((a, b) => GOV_DATA[b].ai - GOV_DATA[a].ai);

const _alcGtmiWithData = _alcGtmiSorted.length;
const _alcHdiWithData  = _alcHdiSorted.length;
const _alcAiWithData   = _alcAiSorted.length;

// Helper to sort and rank by sub-index
function sortAndRank(subKey) {
  const sorted = [...ALC_ISO_LIST].filter(iso => GOV_DATA[iso][subKey] != null).sort((a, b) => GOV_DATA[b][subKey] - GOV_DATA[a][subKey]);
  return { sorted, map: Object.fromEntries(sorted.map((iso, i) => [iso, i + 1])) };
}
const ranks = {
  osi: sortAndRank('osi'), tii: sortAndRank('tii'), hci: sortAndRank('hci_egdi'), epi: sortAndRank('epi'),
  cgsi: sortAndRank('cgsi'), psdi: sortAndRank('psdi'), dcei: sortAndRank('dcei'), gtei: sortAndRank('gtei'),
};

const ALC_GOV_STATS = {
  egdiAvg:   ALC_ISO_LIST.reduce((s, iso) => s + GOV_DATA[iso].egdi, 0) / ALC_ISO_LIST.length,
  gciAvg:    ALC_ISO_LIST.reduce((s, iso) => s + GOV_DATA[iso].gciScore, 0) / ALC_ISO_LIST.length,
  gtmiAvg:   _alcGtmiSorted.reduce((s, iso) => s + GOV_DATA[iso].gtmiScore, 0) / (_alcGtmiWithData || 1),
  hdiAvg:    _alcHdiSorted.reduce((s, iso) => s + GOV_DATA[iso].hdi, 0) / (_alcHdiWithData || 1),
  aiAvg:     _alcAiSorted.reduce((s, iso) => s + GOV_DATA[iso].ai, 0) / (_alcAiWithData || 1),
  
  egdiRankALC:  Object.fromEntries(_alcEgdiSorted.map((iso, i) => [iso, i + 1])),
  gciRankALC:   Object.fromEntries(_alcGciSorted.map((iso, i)  => [iso, i + 1])),
  gtmiRankALC:  Object.fromEntries(_alcGtmiSorted.map((iso, i) => [iso, i + 1])),
  hdiRankALC:   Object.fromEntries(_alcHdiSorted.map((iso, i) => [iso, i + 1])),
  aiRankALC:    Object.fromEntries(_alcAiSorted.map((iso, i) => [iso, i + 1])),
  ocdeAvg:      0.321, // Hardcoded from 'LAC' row in input table
  
  // Custom ALC Averages for OCDE dimensions (LAC row)
  ocdeAvgDD: 0.453,
  ocdeAvgID: 0.303,
  ocdeAvgGP: 0.312,
  ocdeAvgAD: 0.296,
  ocdeAvgIU: 0.353,
  ocdeAvgPR: 0.210,
  
  // Sub-indices averages
  avgOSI:  ranks.osi.sorted.reduce((s, iso) => s + GOV_DATA[iso].osi, 0) / ranks.osi.sorted.length,
  avgTII:  ranks.tii.sorted.reduce((s, iso) => s + GOV_DATA[iso].tii, 0) / ranks.tii.sorted.length,
  avgHCI:  ranks.hci.sorted.reduce((s, iso) => s + GOV_DATA[iso].hci_egdi, 0) / ranks.hci.sorted.length,
  avgEPI:  ranks.epi.sorted.reduce((s, iso) => s + GOV_DATA[iso].epi, 0) / ranks.epi.sorted.length,
  avgCGSI: ranks.cgsi.sorted.reduce((s, iso) => s + GOV_DATA[iso].cgsi, 0) / ranks.cgsi.sorted.length,
  avgPSDI: ranks.psdi.sorted.reduce((s, iso) => s + GOV_DATA[iso].psdi, 0) / ranks.psdi.sorted.length,
  avgDCEI: ranks.dcei.sorted.reduce((s, iso) => s + GOV_DATA[iso].dcei, 0) / ranks.dcei.sorted.length,
  avgGTEI: ranks.gtei.sorted.reduce((s, iso) => s + GOV_DATA[iso].gtei, 0) / ranks.gtei.sorted.length,

  // Sub-indices rankings
  rankOSI: ranks.osi.map, rankTII: ranks.tii.map, rankHCI: ranks.hci.map, rankEPI: ranks.epi.map,
  rankCGSI: ranks.cgsi.map, rankPSDI: ranks.psdi.map, rankDCEI: ranks.dcei.map, rankGTEI: ranks.gtei.map,
  rankDD: sortAndRank('dd').map, rankID: sortAndRank('id').map, rankGP: sortAndRank('gp').map,
  rankAD: sortAndRank('ad').map, rankIU: sortAndRank('iu').map, rankPR: sortAndRank('pr').map,

  // All country scores for relative position bar
  allEgdi:   Object.fromEntries(ALC_ISO_LIST.map(iso => [iso, GOV_DATA[iso].egdi])),
  allGci:    Object.fromEntries(ALC_ISO_LIST.map(iso => [iso, GOV_DATA[iso].gciScore])),
  allGtmi:   Object.fromEntries(_alcGtmiSorted.map(iso => [iso, GOV_DATA[iso].gtmiScore])),
  allOcde:   Object.fromEntries(ALC_ISO_LIST.filter(iso => GOV_DATA[iso].ocde != null).map(iso => [iso, GOV_DATA[iso].ocde])),
  allHdi:    Object.fromEntries(_alcHdiSorted.map(iso => [iso, GOV_DATA[iso].hdi])),
  allAi:     Object.fromEntries(_alcAiSorted.map(iso => [iso, GOV_DATA[iso].ai])),
};

// GCI is now static - just a helper for backward compat
function getGciData(iso3) {
  const g = GOV_DATA[iso3];
  if (!g || g.gciScore == null) return { gciScore: null, gciYear: null, gciTier: null, gciTierLabel: null };
  const tier = getGciTier(g.gciScore);
  return { gciScore: g.gciScore, gciYear: g.gciYear, gciTier: tier, gciTierLabel: GCI_TIER_LABELS[tier] };
}

// ─── Country list + static metadata (BID Departments) ───
const COUNTRIES = [
  // CSC (Cono Sur)
  { iso3: 'ARG', name: 'Argentina',            flag: '🇦🇷', numericId: '032', capital: 'Buenos Aires',       timezone: 'America/Argentina/Buenos_Aires', currency: 'Peso argentino',        currencyCode: 'ARS', domain: '.ar', phoneCode: '+54'    },
  { iso3: 'BRA', name: 'Brasil',               flag: '🇧🇷', numericId: '076', capital: 'Brasilia',           timezone: 'America/Sao_Paulo',             currency: 'Real brasileño',        currencyCode: 'BRL', domain: '.br', phoneCode: '+55'    },
  { iso3: 'CHL', name: 'Chile',                flag: '🇨🇱', numericId: '152', capital: 'Santiago',            timezone: 'America/Santiago',               currency: 'Peso chileno',          currencyCode: 'CLP', domain: '.cl', phoneCode: '+56'    },
  { iso3: 'PRY', name: 'Paraguay',             flag: '🇵🇾', numericId: '600', capital: 'Asunción',           timezone: 'America/Asuncion',               currency: 'Guaraní',               currencyCode: 'PYG', domain: '.py', phoneCode: '+595'   },
  { iso3: 'URY', name: 'Uruguay',              flag: '🇺🇾', numericId: '858', capital: 'Montevideo',         timezone: 'America/Montevideo',             currency: 'Peso uruguayo',         currencyCode: 'UYU', domain: '.uy', phoneCode: '+598'   },
  
  // CAN (Países Andinos)
  { iso3: 'BOL', name: 'Bolivia',              flag: '🇧🇴', numericId: '068', capital: 'Sucre',              timezone: 'America/La_Paz',                currency: 'Boliviano',             currencyCode: 'BOB', domain: '.bo', phoneCode: '+591'   },
  { iso3: 'COL', name: 'Colombia',             flag: '🇨🇴', numericId: '170', capital: 'Bogotá',             timezone: 'America/Bogota',                currency: 'Peso colombiano',       currencyCode: 'COP', domain: '.co', phoneCode: '+57'    },
  { iso3: 'ECU', name: 'Ecuador',              flag: '🇪🇨', numericId: '218', capital: 'Quito',              timezone: 'America/Guayaquil',              currency: 'Dólar estadounidense',  currencyCode: 'USD', domain: '.ec', phoneCode: '+593'   },
  { iso3: 'PER', name: 'Perú',                 flag: '🇵🇪', numericId: '604', capital: 'Lima',               timezone: 'America/Lima',                   currency: 'Sol peruano',           currencyCode: 'PEN', domain: '.pe', phoneCode: '+51'    },
  { iso3: 'VEN', name: 'Venezuela',            flag: '🇻🇪', numericId: '862', capital: 'Caracas',            timezone: 'America/Caracas',                currency: 'Bolívar digital',       currencyCode: 'VES', domain: '.ve', phoneCode: '+58'    },

  // CID (Centroamérica, México, Panamá, RD y Haití)
  { iso3: 'BLZ', name: 'Belice',               flag: '🇧🇿', numericId: '084', capital: 'Belmopán',           timezone: 'America/Belize',                 currency: 'Dólar beliceño',        currencyCode: 'BZD', domain: '.bz', phoneCode: '+501'   },
  { iso3: 'CRI', name: 'Costa Rica',           flag: '🇨🇷', numericId: '188', capital: 'San José',           timezone: 'America/Costa_Rica',             currency: 'Colón costarricense',   currencyCode: 'CRC', domain: '.cr', phoneCode: '+506'   },
  { iso3: 'SLV', name: 'El Salvador',          flag: '🇸🇻', numericId: '222', capital: 'San Salvador',       timezone: 'America/El_Salvador',            currency: 'Dólar estadounidense',  currencyCode: 'USD', domain: '.sv', phoneCode: '+503'   },
  { iso3: 'GTM', name: 'Guatemala',            flag: '🇬🇹', numericId: '320', capital: 'Ciudad de Guatemala',timezone: 'America/Guatemala',              currency: 'Quetzal',               currencyCode: 'GTQ', domain: '.gt', phoneCode: '+502'   },
  { iso3: 'HTI', name: 'Haití',                flag: '🇭🇹', numericId: '332', capital: 'Puerto Príncipe',    timezone: 'America/Port-au-Prince',         currency: 'Gourde',                currencyCode: 'HTG', domain: '.ht', phoneCode: '+509'   },
  { iso3: 'HND', name: 'Honduras',             flag: '🇭🇳', numericId: '340', capital: 'Tegucigalpa',        timezone: 'America/Tegucigalpa',            currency: 'Lempira',               currencyCode: 'HNL', domain: '.hn', phoneCode: '+504'   },
  { iso3: 'MEX', name: 'México',               flag: '🇲🇽', numericId: '484', capital: 'Ciudad de México',   timezone: 'America/Mexico_City',            currency: 'Peso mexicano',         currencyCode: 'MXN', domain: '.mx', phoneCode: '+52'    },
  { iso3: 'NIC', name: 'Nicaragua',            flag: '🇳🇮', numericId: '558', capital: 'Managua',            timezone: 'America/Managua',                currency: 'Córdoba',               currencyCode: 'NIO', domain: '.ni', phoneCode: '+505'   },
  { iso3: 'PAN', name: 'Panamá',               flag: '🇵🇦', numericId: '591', capital: 'Ciudad de Panamá',   timezone: 'America/Panama',                 currency: 'Balboa / Dólar USD',    currencyCode: 'PAB', domain: '.pa', phoneCode: '+507'   },
  { iso3: 'DOM', name: 'República Dominicana', flag: '🇩🇴', numericId: '214', capital: 'Santo Domingo',      timezone: 'America/Santo_Domingo',          currency: 'Peso dominicano',       currencyCode: 'DOP', domain: '.do', phoneCode: '+1-809' },

  // CCB (Caribe)
  { iso3: 'BHS', name: 'Bahamas',              flag: '🇧🇸', numericId: '044', capital: 'Nassau',             timezone: 'America/Nassau',                 currency: 'Dólar bahameño',        currencyCode: 'BSD', domain: '.bs', phoneCode: '+1-242' },
  { iso3: 'BRB', name: 'Barbados',             flag: '🇧🇧', numericId: '052', capital: 'Bridgetown',         timezone: 'America/Barbados',               currency: 'Dólar barbadense',      currencyCode: 'BBD', domain: '.bb', phoneCode: '+1-246' },
  { iso3: 'GUY', name: 'Guyana',               flag: '🇬🇾', numericId: '328', capital: 'Georgetown',         timezone: 'America/Guyana',                 currency: 'Dólar guyanés',         currencyCode: 'GYD', domain: '.gy', phoneCode: '+592'   },
  { iso3: 'JAM', name: 'Jamaica',              flag: '🇯🇲', numericId: '388', capital: 'Kingston',           timezone: 'America/Jamaica',                currency: 'Dólar jamaicano',       currencyCode: 'JMD', domain: '.jm', phoneCode: '+1-876' },
  { iso3: 'SUR', name: 'Surinam',              flag: '🇸🇷', numericId: '740', capital: 'Paramaribo',         timezone: 'America/Paramaribo',             currency: 'Dólar surinamés',       currencyCode: 'SRD', domain: '.sr', phoneCode: '+597'   },
  { iso3: 'TTO', name: 'Trinidad y Tobago',    flag: '🇹🇹', numericId: '780', capital: 'Puerto España',      timezone: 'America/Port_of_Spain',          currency: 'Dólar trinitense',      currencyCode: 'TTD', domain: '.tt', phoneCode: '+1-868' },
];

const BID_REGION_BY_ISO = {
  ARG: 'Cono Sur',
  BRA: 'Cono Sur',
  CHL: 'Cono Sur',
  PRY: 'Cono Sur',
  URY: 'Cono Sur',
  BOL: 'Grupo Andino',
  COL: 'Grupo Andino',
  ECU: 'Grupo Andino',
  PER: 'Grupo Andino',
  VEN: 'Grupo Andino',
  BLZ: 'Centroamérica y México',
  CRI: 'Centroamérica y México',
  SLV: 'Centroamérica y México',
  GTM: 'Centroamérica y México',
  HND: 'Centroamérica y México',
  MEX: 'Centroamérica y México',
  NIC: 'Centroamérica y México',
  PAN: 'Centroamérica y México',
  BHS: 'Caribe',
  BRB: 'Caribe',
  GUY: 'Caribe',
  JAM: 'Caribe',
  SUR: 'Caribe',
  TTO: 'Caribe',
  DOM: 'Caribe',
  HTI: 'Caribe',
};

const BORDER_COUNTRIES_BY_ISO = {
  ARG: ['BOL', 'BRA', 'CHL', 'PRY', 'URY'],
  BOL: ['ARG', 'BRA', 'CHL', 'PRY', 'PER'],
  BRA: ['ARG', 'BOL', 'COL', 'GUY', 'PRY', 'PER', 'SUR', 'URY', 'VEN'],
  CHL: ['ARG', 'BOL', 'PER'],
  COL: ['BRA', 'ECU', 'PAN', 'PER', 'VEN'],
  CRI: ['NIC', 'PAN'],
  DOM: ['HTI'],
  ECU: ['COL', 'PER'],
  SLV: ['GTM', 'HND'],
  GTM: ['BLZ', 'SLV', 'HND', 'MEX'],
  GUY: ['BRA', 'SUR', 'VEN'],
  HTI: ['DOM'],
  HND: ['GTM', 'SLV', 'NIC'],
  MEX: ['BLZ', 'GTM'],
  NIC: ['CRI', 'HND'],
  PAN: ['COL', 'CRI'],
  PRY: ['ARG', 'BOL', 'BRA'],
  PER: ['BOL', 'BRA', 'CHL', 'COL', 'ECU'],
  SUR: ['BRA', 'GUY'],
  URY: ['ARG', 'BRA'],
  VEN: ['BRA', 'COL', 'GUY'],
};
  
COUNTRIES.forEach((country) => {
  country.bidRegion = BID_REGION_BY_ISO[country.iso3] || null;
  country.borderCountries = BORDER_COUNTRIES_BY_ISO[country.iso3] || [];
});

// ─── Fetch single indicator from World Bank ───────────
const REGION_COUNTRY_COUNT = COUNTRIES.length;
const REGION_ISO_CODES = COUNTRIES.map(country => country.iso3);
const WORLD_BANK_REGION_COUNTRY_PATH = REGION_ISO_CODES.join(';');
const UNDP_REGION_COUNTRY_LIST = REGION_ISO_CODES.join(',');

function getEntriesWithValue(byIso = {}) {
  return Object.entries(byIso)
    .filter(([, entry]) => entry && entry.value != null)
    .map(([iso, entry]) => ({ iso, ...entry }));
}

function deriveAggregateYear(entries = []) {
  const years = entries
    .map(entry => String(entry?.date || '').trim())
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

function buildAggregateIndicator(def, byIso, extra = {}) {
  const entries = getEntriesWithValue(byIso);
  return {
    ...def,
    isRegionAggregate: true,
    value: extra.value ?? null,
    date: extra.date ?? deriveAggregateYear(entries),
    source: extra.source || entries[0]?.source || def.source || 'Banco Mundial',
    rankALC: null,
    totalALC: REGION_COUNTRY_COUNT,
  };
}

function buildRegionalAggregateIndicators(regionDataByKey, hdiRegionData) {
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
    population: () => buildAggregateIndicator(INDICATORS.population, regionDataByKey.population.byIso, { value: populationTotal }),
    laborForce: () => buildAggregateIndicator(INDICATORS.laborForce, regionDataByKey.laborForce.byIso, { value: laborForceTotal }),
    unemployment: () => buildAggregateIndicator(INDICATORS.unemployment, regionDataByKey.unemployment.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.unemployment?.byIso), laborForceWeights),
    }),
    gdpTotal: () => buildAggregateIndicator(INDICATORS.gdpTotal, regionDataByKey.gdpTotal.byIso, { value: gdpTotal }),
    gdpPerCapita: () => buildAggregateIndicator(INDICATORS.gdpPerCapita, regionDataByKey.gdpPerCapita.byIso, {
      value: populationTotal > 0 ? gdpTotal / populationTotal : null,
      date: deriveAggregateYear([...populationEntries, ...gdpEntries]),
    }),
    gdpGrowth: () => buildAggregateIndicator(INDICATORS.gdpGrowth, regionDataByKey.gdpGrowth.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.gdpGrowth?.byIso), gdpWeights),
    }),
    hdi: () => buildAggregateIndicator(INDICATORS.hdi, hdiRegionData.byIso, {
      value: 0.783,
      date: '2023',
      source: 'PNUD HDR 2025',
    }),
    gini: () => buildAggregateIndicator(INDICATORS.gini, regionDataByKey.gini.byIso, {
      value: averageEntries(getEntriesWithValue(regionDataByKey.gini?.byIso)),
    }),
    internetUsers: () => buildAggregateIndicator(INDICATORS.internetUsers, regionDataByKey.internetUsers.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.internetUsers?.byIso), populationWeights),
    }),
    householdInternet: () => buildAggregateIndicator(INDICATORS.householdInternet, regionDataByKey.householdInternet.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.householdInternet?.byIso), populationWeights),
    }),
    mobileSubs: () => buildAggregateIndicator(INDICATORS.mobileSubs, regionDataByKey.mobileSubs.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.mobileSubs?.byIso), populationWeights),
    }),
    broadband: () => buildAggregateIndicator(INDICATORS.broadband, regionDataByKey.broadband.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.broadband?.byIso), populationWeights),
    }),
    coverage5g: () => buildAggregateIndicator(INDICATORS.coverage5g, regionDataByKey.coverage5g.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.coverage5g?.byIso), populationWeights),
    }),
    coverage4g: () => buildAggregateIndicator(INDICATORS.coverage4g, regionDataByKey.coverage4g.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.coverage4g?.byIso), populationWeights),
    }),
    coverage3g: () => buildAggregateIndicator(INDICATORS.coverage3g, regionDataByKey.coverage3g.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.coverage3g?.byIso), populationWeights),
    }),
    findexBuy: () => buildAggregateIndicator(INDICATORS.findexBuy, regionDataByKey.findexBuy.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexBuy?.byIso), populationWeights),
    }),
    findexPayOnline: () => buildAggregateIndicator(INDICATORS.findexPayOnline, regionDataByKey.findexPayOnline.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexPayOnline?.byIso), populationWeights),
    }),
    findexBalance: () => buildAggregateIndicator(INDICATORS.findexBalance, regionDataByKey.findexBalance.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexBalance?.byIso), populationWeights),
    }),
    findexMadePay: () => buildAggregateIndicator(INDICATORS.findexMadePay, regionDataByKey.findexMadePay.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexMadePay?.byIso), populationWeights),
    }),
    findexRecvPay: () => buildAggregateIndicator(INDICATORS.findexRecvPay, regionDataByKey.findexRecvPay.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.findexRecvPay?.byIso), populationWeights),
    }),
    digitalServicesExports: () => buildAggregateIndicator(INDICATORS.digitalServicesExports, regionDataByKey.digitalServicesExports.byIso, {
      value: sumEntries(getEntriesWithValue(regionDataByKey.digitalServicesExports?.byIso)),
    }),
    ictPatents: () => buildAggregateIndicator(INDICATORS.ictPatents, regionDataByKey.ictPatents.byIso, {
      value: sumEntries(getEntriesWithValue(regionDataByKey.ictPatents?.byIso)),
    }),
    stemGraduates: () => buildAggregateIndicator(INDICATORS.stemGraduates, regionDataByKey.stemGraduates.byIso, {
      value: weightedAverageEntries(getEntriesWithValue(regionDataByKey.stemGraduates?.byIso), populationWeights),
    }),
  };

  return Object.fromEntries(
    Object.keys(INDICATORS).map((key) => [key, aggregateStrategies[key] ? aggregateStrategies[key]() : null])
  );
}

function buildRegionalGovData() {
  const avgGtmiGroup = 'ALC';
  const avgGciTier = getGciTier(ALC_GOV_STATS.gciAvg);
  return {
    isRegionAggregate: true,
    egdi: {
      score: ALC_GOV_STATS.egdiAvg,
      group: getEgdiGroup(ALC_GOV_STATS.egdiAvg),
      rankWorld: null,
      rankALC: null,
      alcAvg: ALC_GOV_STATS.egdiAvg,
      diffVsAlc: 0,
      subindices: {
        osi: { score: ALC_GOV_STATS.avgOSI, alcAvg: ALC_GOV_STATS.avgOSI, rankALC: null },
        tii: { score: ALC_GOV_STATS.avgTII, alcAvg: ALC_GOV_STATS.avgTII, rankALC: null },
        hci: { score: ALC_GOV_STATS.avgHCI, alcAvg: ALC_GOV_STATS.avgHCI, rankALC: null },
        epi: { score: ALC_GOV_STATS.avgEPI, alcAvg: ALC_GOV_STATS.avgEPI, rankALC: null }
      },
      year: '2024',
      allAlc: ALC_GOV_STATS.allEgdi,
    },
    gci: {
      score: ALC_GOV_STATS.gciAvg,
      tier: avgGciTier,
      tierLabel: GCI_TIER_LABELS[avgGciTier] ?? null,
      rankALC: null,
      alcAvg: ALC_GOV_STATS.gciAvg,
      diffVsAlc: 0,
      year: '2024',
      allAlc: ALC_GOV_STATS.allGci,
    },
    gtmi: {
      group: avgGtmiGroup,
      groupLabel: 'Promedio ALC',
      score: ALC_GOV_STATS.gtmiAvg,
      rankWorld: null,
      rankALC: null,
      alcAvg: ALC_GOV_STATS.gtmiAvg,
      diffVsAlc: 0,
      subindices: {
        cgsi: { score: ALC_GOV_STATS.avgCGSI, alcAvg: ALC_GOV_STATS.avgCGSI, rankALC: null },
        psdi: { score: ALC_GOV_STATS.avgPSDI, alcAvg: ALC_GOV_STATS.avgPSDI, rankALC: null },
        dcei: { score: ALC_GOV_STATS.avgDCEI, alcAvg: ALC_GOV_STATS.avgDCEI, rankALC: null },
        gtei: { score: ALC_GOV_STATS.avgGTEI, alcAvg: ALC_GOV_STATS.avgGTEI, rankALC: null }
      },
      year: '2025',
      allAlc: ALC_GOV_STATS.allGtmi,
    },
    ocde: {
      score: ALC_GOV_STATS.ocdeAvg,
      rankALC: null,
      alcAvg: ALC_GOV_STATS.ocdeAvg,
      diffVsAlc: 0,
      subindices: {
        dd: { score: ALC_GOV_STATS.ocdeAvgDD, alcAvg: ALC_GOV_STATS.ocdeAvgDD, rankALC: null },
        id: { score: ALC_GOV_STATS.ocdeAvgID, alcAvg: ALC_GOV_STATS.ocdeAvgID, rankALC: null },
        gp: { score: ALC_GOV_STATS.ocdeAvgGP, alcAvg: ALC_GOV_STATS.ocdeAvgGP, rankALC: null },
        ad: { score: ALC_GOV_STATS.ocdeAvgAD, alcAvg: ALC_GOV_STATS.ocdeAvgAD, rankALC: null },
        iu: { score: ALC_GOV_STATS.ocdeAvgIU, alcAvg: ALC_GOV_STATS.ocdeAvgIU, rankALC: null },
        pr: { score: ALC_GOV_STATS.ocdeAvgPR, alcAvg: ALC_GOV_STATS.ocdeAvgPR, rankALC: null }
      },
      year: '2022',
      allAlc: ALC_GOV_STATS.allOcde,
    },
    ai: {
      score: ALC_GOV_STATS.aiAvg,
      rankALC: null,
      alcAvg: ALC_GOV_STATS.aiAvg,
      diffVsAlc: 0,
      year: '2023',
      allAlc: ALC_GOV_STATS.allAi,
    }
  };
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

const LOWER_IS_BETTER_INDICATORS = new Set(['SI.POV.GINI']);

function buildIndicatorRanking(valuesByIso, indicatorCode = null) {
  const lowerIsBetter = LOWER_IS_BETTER_INDICATORS.has(String(indicatorCode || '').toUpperCase());
  const sorted = Object.entries(valuesByIso)
    .filter(([, entry]) => entry && entry.value != null)
    .sort((a, b) => lowerIsBetter ? a[1].value - b[1].value : b[1].value - a[1].value);

  return Object.fromEntries(sorted.map(([iso], index) => [iso, index + 1]));
}

function getRegionFallbackRankings(indicatorKey) {
  if (indicatorKey !== 'hdi') {
    return { byIso: {}, rankMap: {} };
  }

  const byIso = Object.fromEntries(
    REGION_ISO_CODES.map(iso => [
      iso,
      GOV_DATA[iso]?.hdi != null
        ? { value: GOV_DATA[iso].hdi, date: '2023', source: 'PNUD (fallback estatico local)' }
        : { value: null, date: null, source: 'PNUD (fallback estatico local)' }
    ])
  );

  return {
    byIso,
    rankMap: buildIndicatorRanking(byIso, 'hdi'),
  };
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
    REGION_ISO_CODES.map(iso => [iso, { value: null, date: null, source: 'Banco Mundial' }])
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

async function fetchData360RegionIndicator(databaseId, indicatorId, fallbackIndicatorCode = null, sourceLabel = 'Data360 del Banco Mundial') {
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
      REGION_ISO_CODES.map(iso => [iso, { value: null, date: null, source: sourceLabel }])
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

      byIso[iso] = {
        value,
        date,
        source: sourceLabel,
      };
    }

    const data = {
      byIso,
      rankMap: buildIndicatorRanking(byIso, indicatorId),
    };
    setTimedCache(indicatorRegionCache, cacheKey, data);
    return data;
  } catch (err) {
    if (!fallbackIndicatorCode) throw err;
    console.warn(`Data360 fallback para ${indicatorId}: ${err.message}`);
    return fetchWorldBankRegionIndicator(fallbackIndicatorCode);
  }
}

async function fetchUndpRegionIndicator(indicatorCode) {
  const cacheKey = `undp:${indicatorCode.toUpperCase()}`;
  const cached = getTimedCache(indicatorRegionCache, cacheKey, INDICATOR_REGION_TTL);
  if (cached) return cached;

  const { apiKey, baseUrl, years } = config.undp;
  if (!apiKey) {
    if (!warnedAboutUndpConfig) {
      warnedAboutUndpConfig = true;
      console.warn('PNUD API key no configurada en config.local.json o PNUD_API_KEY; se usara el fallback estatico para IDH.');
    }
    const fallback = getRegionFallbackRankings(indicatorCode.toLowerCase());
    setTimedCache(indicatorRegionCache, cacheKey, fallback);
    return fallback;
  }

  const byIso = Object.fromEntries(
    REGION_ISO_CODES.map(iso => [iso, { value: null, date: null, source: 'PNUD API' }])
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
    const fallback = getRegionFallbackRankings('hdi').byIso;
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

// ─── API: country list ────────────────────────────────
app.get('/api/countries', (_req, res) => {
  res.json(COUNTRIES);
});

// ─── API: indicator definitions ───────────────────────
app.get('/api/indicators', (_req, res) => {
  res.json(INDICATORS);
});

// ─── API: full country data ───────────────────────────
app.get('/api/country/:iso', async (req, res) => {
  const iso = req.params.iso.toUpperCase();
  const isRegionAggregate = iso === REGION_AGGREGATE_ISO;
  const country = isRegionAggregate ? { iso3: REGION_AGGREGATE_ISO } : COUNTRIES.find(c => c.iso3 === iso);
  if (!country) return res.status(404).json({ error: 'País no encontrado' });

  // Check cache
  const cached = getCached(iso);
  if (cached) return res.json(cached);

  try {
    // Fetch indicators + exchange rates in parallel
    const entries = Object.entries(INDICATORS).filter(([key]) => key !== 'hdi');
    const [ratesResult, countryMetadataResult, hdiRegionResult, ...indicatorRegionResults] = await Promise.allSettled([
      getExchangeRates(),
      isRegionAggregate ? Promise.resolve({ incomeLevel: null }) : fetchWorldBankCountryMetadata(iso),
      fetchUndpRegionIndicator('hdi'),
      ...entries.map(([, def]) => {
        if (def.databaseId) {
          return fetchData360RegionIndicator(def.databaseId, def.code, def.fallbackCode, def.source);
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
    const gci = getGciData(iso);
    const egdiGroup = getEgdiGroup(govStatic.egdi);
    const gtmiGroup = govStatic.gtmi || null;
    const hdiRegionData = hdiRegionResult.status === 'fulfilled'
      ? hdiRegionResult.value
      : getRegionFallbackRankings('hdi');
    const regionDataByKey = {};
    entries.forEach(([key], i) => {
      const result = indicatorRegionResults[i];
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
        indicators: buildRegionalAggregateIndicators(regionDataByKey, hdiRegionData),
        govData: buildRegionalGovData(),
      };

      setCache(iso, data);
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

    // HDI from PNUD API, with static fallback while local config is missing or the API has no data
    data.indicators['hdi'] = {
      ...INDICATORS.hdi,
      value: hdiEntry.value ?? govStatic.hdi ?? null,
      date: hdiEntry.date ?? '2023',
      source: hdiEntry.source || 'PNUD API',
      rankALC: hdiRegionData.rankMap[iso] ?? ALC_GOV_STATS.hdiRankALC[iso] ?? null,
      totalALC: REGION_COUNTRY_COUNT,
    };

    // ── Rich E-Government block ──
    data.govData = {
      egdi: {
        score: govStatic.egdi ?? null,
        group: egdiGroup,
        rankWorld: govStatic.egdiRank ?? null,
        rankALC: ALC_GOV_STATS.egdiRankALC[iso] ?? null,
        alcAvg: ALC_GOV_STATS.egdiAvg,
        diffVsAlc: govStatic.egdi != null ? +(govStatic.egdi - ALC_GOV_STATS.egdiAvg).toFixed(4) : null,
        subindices: {
          osi: { score: govStatic.osi ?? null, alcAvg: ALC_GOV_STATS.avgOSI, rankALC: ALC_GOV_STATS.rankOSI[iso] ?? null },
          tii: { score: govStatic.tii ?? null, alcAvg: ALC_GOV_STATS.avgTII, rankALC: ALC_GOV_STATS.rankTII[iso] ?? null },
          hci: { score: govStatic.hci_egdi ?? null, alcAvg: ALC_GOV_STATS.avgHCI, rankALC: ALC_GOV_STATS.rankHCI[iso] ?? null },
          epi: { score: govStatic.epi ?? null, alcAvg: ALC_GOV_STATS.avgEPI, rankALC: ALC_GOV_STATS.rankEPI[iso] ?? null }
        },
        year: '2024',
        allAlc: ALC_GOV_STATS.allEgdi,
      },
      gci: {
        score: gci.gciScore,
        tier: gci.gciTier,
        tierLabel: gci.gciTierLabel,
        rankALC: ALC_GOV_STATS.gciRankALC[iso] ?? null,
        alcAvg: ALC_GOV_STATS.gciAvg,
        diffVsAlc: gci.gciScore != null ? +(gci.gciScore - ALC_GOV_STATS.gciAvg).toFixed(2) : null,
        year: gci.gciYear,
        allAlc: ALC_GOV_STATS.allGci,
      },
      gtmi: {
        group: gtmiGroup,
        groupLabel: GTMI_GROUP_LABELS[gtmiGroup] ?? null,
        score: govStatic.gtmiScore ?? null,
        rankWorld: govStatic.gtmiRankWorld ?? null,
        rankALC: ALC_GOV_STATS.gtmiRankALC[iso] ?? null,
        alcAvg: ALC_GOV_STATS.gtmiAvg,
        diffVsAlc: govStatic.gtmiScore != null ? +(govStatic.gtmiScore - ALC_GOV_STATS.gtmiAvg).toFixed(4) : null,
        subindices: {
          cgsi: { score: govStatic.cgsi ?? null, alcAvg: ALC_GOV_STATS.avgCGSI, rankALC: ALC_GOV_STATS.rankCGSI[iso] ?? null },
          psdi: { score: govStatic.psdi ?? null, alcAvg: ALC_GOV_STATS.avgPSDI, rankALC: ALC_GOV_STATS.rankPSDI[iso] ?? null },
          dcei: { score: govStatic.dcei ?? null, alcAvg: ALC_GOV_STATS.avgDCEI, rankALC: ALC_GOV_STATS.rankDCEI[iso] ?? null },
          gtei: { score: govStatic.gtei ?? null, alcAvg: ALC_GOV_STATS.avgGTEI, rankALC: ALC_GOV_STATS.rankGTEI[iso] ?? null }
        },
        year: '2025',
        allAlc: ALC_GOV_STATS.allGtmi,
      },
      ocde: {
        score: govStatic.ocde ?? null,
        rankALC: govStatic.ocdeRankALC ?? null,
        alcAvg: ALC_GOV_STATS.ocdeAvg,
        diffVsAlc: govStatic.ocde != null ? +(govStatic.ocde - ALC_GOV_STATS.ocdeAvg).toFixed(4) : null,
        subindices: {
          dd: { score: govStatic.dd ?? null, alcAvg: ALC_GOV_STATS.ocdeAvgDD, rankALC: ALC_GOV_STATS.rankDD[iso] ?? null },
          id: { score: govStatic.id ?? null, alcAvg: ALC_GOV_STATS.ocdeAvgID, rankALC: ALC_GOV_STATS.rankID[iso] ?? null },
          gp: { score: govStatic.gp ?? null, alcAvg: ALC_GOV_STATS.ocdeAvgGP, rankALC: ALC_GOV_STATS.rankGP[iso] ?? null },
          ad: { score: govStatic.ad ?? null, alcAvg: ALC_GOV_STATS.ocdeAvgAD, rankALC: ALC_GOV_STATS.rankAD[iso] ?? null },
          iu: { score: govStatic.iu ?? null, alcAvg: ALC_GOV_STATS.ocdeAvgIU, rankALC: ALC_GOV_STATS.rankIU[iso] ?? null },
          pr: { score: govStatic.pr ?? null, alcAvg: ALC_GOV_STATS.ocdeAvgPR, rankALC: ALC_GOV_STATS.rankPR[iso] ?? null }
        },
        year: '2022',
        allAlc: ALC_GOV_STATS.allOcde,
      },
      ai: {
        score: govStatic.ai ?? null,
        rankALC: ALC_GOV_STATS.aiRankALC[iso] ?? null,
        alcAvg: ALC_GOV_STATS.aiAvg,
        diffVsAlc: govStatic.ai != null ? +(govStatic.ai - ALC_GOV_STATS.aiAvg).toFixed(2) : null,
        year: '2023',
        allAlc: ALC_GOV_STATS.allAi,
      }
    };

    setCache(iso, data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching indicators:', err);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

// ─── Static files ─────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return;
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return;
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

app.use('/img', express.static(path.join(__dirname, 'img')));

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});
