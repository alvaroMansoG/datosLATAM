import { fetchCountries, fetchCountryData } from './api.js';

/* ============================================
   app.js â€” D3 map + indicator dashboard
   ============================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// DOM refs
const selectEl          = $('#country-select');
const countryPicker     = $('#country-picker');
const countryPickerTrigger = $('#country-picker-trigger');
const countryPickerTriggerText = $('#country-picker-trigger-text');
const countryPickerPanel = $('#country-picker-panel');
const loader            = $('#loader');
const errorEl           = $('#error');
const errorMsg          = $('#error-msg');
const emptyState        = $('#empty-state');
const indicatorsWrapper = $('#indicators-wrapper');
const coreCards         = $('#core-cards');
const digitalCards      = $('#digital-cards');
const macroCards        = $('#macro-cards');
const findexCards       = $('#findex-cards');
const govCards          = $('#gov-cards');
const countryInfo       = $('#country-info');
const mapContainer      = $('#map-container');
const mapPlaceholder    = $('#map-placeholder');
const countryBanner     = $('#country-banner');
const bannerFlag        = $('#banner-flag');
const bannerName        = $('#banner-name');
const bannerSubregion   = $('#banner-subregion');
const bannerIncomeLevel = $('#banner-income-level');
const bannerMetaBlock   = $('#banner-meta-block');
const bannerRegionFlags = $('#banner-region-flags');
const infoMetaBlock     = $('#info-meta-block');
const infoRows          = $('#info-rows');
const infoRegionFlags   = $('#info-region-flags');
const mapRegionTrigger  = $('#map-region-trigger');
const basicLinks        = $('#basic-links');
const connectivityLinks = $('#connectivity-links');
const findexLinks       = $('#findex-links');
const basicMethodNote   = $('#basic-method-note');
const connectivityMethodNote = $('#connectivity-method-note');
const findexMethodNote  = $('#findex-method-note');
const govMethodNote     = $('#gov-method-note');
const dimensionsMethodNote = $('#dimensions-method-note');
const govRadarNote = $('#gov-radar-note');
const dimRadarNote = $('#dim-radar-note');
const govChartTitle = $('#gov-chart-title');
const govChartToggle = $('#gov-chart-toggle');

// State
let countries = [];
let selectedIso = null;
let clockInterval = null;
let _govRadarChart = null;
let _dimRadarChart = null;
let activeDimIndex = 'egdi';
let govSelectedYears = {};
let govChartView = 'comparison';

const INCOME_LEVEL_TOOLTIP = 'ClasificaciÃ³n del Banco Mundial segÃºn el ingreso nacional bruto per cÃ¡pita del paÃ­s. Fuente: metadata oficial de paÃ­s del Banco Mundial.';

// Numeric ID â†’ ISO3 mapping (built from server data)
const REGION_AGGREGATE_ISO = 'ALC';
const REGION_OPTION = {
  iso3: REGION_AGGREGATE_ISO,
  name: 'Am\u00E9rica Latina y el Caribe',
  isRegionAggregate: true,
};

const REGION_SECTION_NOTES = {
  basic: 'Nota metodol\u00F3gica: suma para totales, promedio ponderado para desempleo y promedio simple para Gini. El IDH usa el dato oficial del PNUD para ALC.',
  connectivity: 'Nota metodol\u00F3gica: promedios ponderados por poblaci\u00F3n para todos los indicadores de conectividad.',
  findex: 'Nota metodol\u00F3gica: suma para exportaciones digitales y patentes TIC; promedio ponderado por poblaci\u00F3n para Findex y STEM.',
  gov: 'Nota metodol\u00F3gica: se muestran promedios regionales de los \u00EDndices y sub\u00EDndices disponibles para los 26 pa\u00EDses.',
  dimensions: 'Nota metodol\u00F3gica: cada dimensi\u00F3n muestra el promedio regional del sub\u00EDndice correspondiente.',
};

const REGION_METHOD_TOOLTIPS = {
  'SP.POP.TOTL': 'Agregado regional calculado como la suma de la poblaci\u00F3n de los 26 pa\u00EDses de ALC.',
  'SL.TLF.TOTL.IN': 'Agregado regional calculado como la suma de la fuerza laboral total de los 26 pa\u00EDses de ALC.',
  'SL.UEM.TOTL.ZS': 'Agregado regional calculado como promedio ponderado por la fuerza laboral de cada pa\u00EDs.',
  'NY.GDP.MKTP.CD': 'Agregado regional calculado como la suma del PIB nominal de los 26 pa\u00EDses de ALC.',
  'NY.GDP.PCAP.CD': 'Agregado regional calculado como PIB nominal total de ALC dividido entre la poblaci\u00F3n total de ALC.',
  'NY.GDP.MKTP.KD.ZG': 'Agregado regional calculado como promedio ponderado por el PIB nominal de cada pa\u00EDs.',
  'UNDP.HDI': 'Dato oficial del PNUD para Am\u00E9rica Latina y el Caribe publicado en el anexo estad\u00EDstico del HDR 2025: 0,783 para 2023.',
  'SI.POV.GINI': 'Promedio simple de los \u00EDndices de Gini nacionales disponibles. No equivale al Gini regional real.',
  'ITU_DH_INT_USER_PT': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'ITU_DH_HH_INT': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'ITU_DH_MOB_SUB_PER_100': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'IT.NET.BBND.P2': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'ITU_DH_POP_COV_5G': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'ITU_DH_POP_COV_4G': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'ITU_DH_POP_COV_3G': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  FIN26B: 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  FIN27A: 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  FIN9B: 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'g20.made': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'g20.received': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
  'UNCTAD_DE_DIG_SERVTRADE_ANN_EXP': 'Agregado regional calculado como la suma de las exportaciones de servicios digitales de los pa\u00EDses con dato disponible.',
  'WIPO_ICT_PAT_PUB_TOT': 'Agregado regional calculado como la suma de las publicaciones de patentes TIC de los pa\u00EDses con dato disponible.',
  'UNESCO_UIS_GRAD_STEM': 'Agregado regional calculado como promedio ponderado por poblaci\u00F3n.',
};

let numericToIso = {};
const ISO2_BY_ISO3 = {
  ARG: 'ar', BOL: 'bo', BRA: 'br', CHL: 'cl', COL: 'co', CRI: 'cr', DOM: 'do',
  ECU: 'ec', SLV: 'sv', GTM: 'gt', HTI: 'ht', HND: 'hn', JAM: 'jm', MEX: 'mx',
  NIC: 'ni', PAN: 'pa', PRY: 'py', PER: 'pe', TTO: 'tt', URY: 'uy', VEN: 've',
  GUY: 'gy', SUR: 'sr', BLZ: 'bz', BHS: 'bs', BRB: 'bb'
};
const INDICATOR_ICONS = {
  'SP.POP.TOTL': '\uD83D\uDC65',
  'SL.TLF.TOTL.IN': '\uD83D\uDC68\u200D\uDCBC',
  'SL.UEM.TOTL.ZS': '\uD83D\uDCC9',
  'NY.GDP.MKTP.CD': '\uD83C\uDFDB\uFE0F',
  'NY.GDP.PCAP.CD': '\uD83D\uDCB0',
  'NY.GDP.MKTP.KD.ZG': '\uD83D\uDCC8',
  'UNDP.HDI': '\uD83C\uDF93',
  'SI.POV.GINI': '\u2696\uFE0F',
  'ITU_DH_INT_USER_PT': '\uD83C\uDF10',
  'ITU_DH_HH_INT': '\uD83C\uDFE0',
  'IT.NET.USER.ZS': '\uD83C\uDF10',
  'ITU_DH_MOB_SUB_PER_100': '\uD83D\uDCF1',
  'IT.CEL.SETS.P2': '\uD83D\uDCF1',
  'IT.NET.BBND.P2': '\uD83D\uDCE1',
  'ITU_DH_POP_COV_5G': '\uD83D\uDCF6',
  'ITU_DH_POP_COV_4G': '\uD83D\uDCF6',
  'ITU_DH_POP_COV_3G': '\uD83D\uDCF6',
  FIN26B: '\uD83D\uDED2',
  FIN27A: '\uD83D\uDCB3',
  FIN9B: '\uD83C\uDFE6',
  'g20.made': '\uD83D\uDCB8',
  'g20.received': '\uD83D\uDCE5',
  'UNCTAD_DE_DIG_SERVTRADE_ANN_EXP': '\uD83C\uDF0D',
  'WIPO_ICT_PAT_PUB_TOT': '\uD83D\uDCA1',
  'UNESCO_UIS_GRAD_STEM': '\uD83E\uDDEA',
};
const CONNECTIVITY_CARD_GROUPS = [
  {
    title: 'Uso y acceso a internet',
    icon: '\uD83C\uDF10',
    keys: ['internetUsers', 'householdInternet'],
  },
  {
    title: 'Suscripciones y banda ancha',
    icon: '\uD83D\uDCF1',
    keys: ['mobileSubs', 'broadband'],
  },
  {
    title: 'Cobertura mÃ³vil',
    icon: '\uD83D\uDCF6',
    keys: ['coverage5g', 'coverage4g', 'coverage3g'],
  },
];
const BID_REGION_ORDER = ['Cono Sur', 'Grupo Andino', 'Centroam\u00E9rica y M\u00E9xico', 'Caribe'];
const ECONOMY_TALENT_CARD_GROUPS = [
  {
    title: 'Servicios financieros digitales',
    icon: '\uD83D\uDCB3',
    keys: ['findexBuy', 'findexPayOnline', 'findexBalance', 'findexMadePay', 'findexRecvPay'],
  },
  {
    title: 'Comercio digital e innovaci\u00F3n',
    icon: '\uD83D\uDCC8',
    keys: ['digitalServicesExports', 'ictPatents'],
  },
  {
    title: 'Talento STEM',
    icon: '\uD83C\uDF93',
    keys: ['stemGraduates'],
  },
];
const INDICATOR_TOOLTIPS = {
  'SP.POP.TOTL': 'PoblaciÃ³n total residente estimada a mitad de aÃ±o, sin importar la situaciÃ³n legal o la ciudadanÃ­a.',
  'SL.TLF.TOTL.IN': 'Personas de 15 aÃ±os o mÃ¡s que aportan trabajo para producir bienes y servicios; incluye ocupadas y desocupadas que buscan empleo.',
  'SL.UEM.TOTL.ZS': 'Porcentaje de la fuerza laboral que no tiene trabajo, pero estÃ¡ disponible y lo busca activamente.',
  'NY.GDP.MKTP.CD': 'Valor total de los bienes y servicios producidos en la economÃ­a durante el perÃ­odo, expresado en dÃ³lares corrientes de Estados Unidos.',
  'NY.GDP.PCAP.CD': 'PIB en dÃ³lares corrientes dividido entre la poblaciÃ³n total.',
  'NY.GDP.MKTP.KD.ZG': 'VariaciÃ³n porcentual anual del PIB a precios constantes.',
  'UNDP.HDI': 'Ãndice compuesto del PNUD que resume logros medios en salud, educaciÃ³n e ingreso.',
  'SI.POV.GINI': 'Mide cuÃ¡nto se desvÃ­a la distribuciÃ³n del ingreso o del consumo de la igualdad perfecta. Un valor de 0 representa igualdad total y 100 desigualdad total.',
  'ITU_DH_INT_USER_PT': 'Porcentaje de personas que usaron Internet desde cualquier lugar y dispositivo durante los Ãºltimos tres meses.',
  'ITU_DH_HH_INT': 'Porcentaje de hogares con acceso a Internet en el hogar.',
  'ITU_DH_MOB_SUB_PER_100': 'NÃºmero de suscripciones mÃ³viles celulares activas por cada 100 habitantes.',
  'IT.NET.BBND.P2': 'Suscripciones fijas de banda ancha por cada 100 personas, incluyendo accesos de alta velocidad a Internet por redes fijas.',
  'ITU_DH_POP_COV_5G': 'Porcentaje de la poblaciÃ³n que vive dentro del alcance de una seÃ±al mÃ³vil 5G, tenga o no una suscripciÃ³n activa.',
  'ITU_DH_POP_COV_4G': 'Porcentaje de la poblaciÃ³n que vive dentro del alcance de una seÃ±al mÃ³vil 4G, tenga o no una suscripciÃ³n activa.',
  'ITU_DH_POP_COV_3G': 'Porcentaje de la poblaciÃ³n que vive dentro del alcance de una seÃ±al mÃ³vil 3G, tenga o no una suscripciÃ³n activa.',
  FIN26B: 'Porcentaje de adultos que usaron un mÃ³vil o Internet para comprar algo en lÃ­nea.',
  FIN27A: 'Porcentaje de adultos que usaron un mÃ³vil o Internet para pagar una compra en lÃ­nea.',
  FIN9B: 'Porcentaje de adultos que usaron un mÃ³vil o Internet para consultar el saldo de una cuenta financiera.',
  'g20.made': 'Porcentaje de adultos que realizaron al menos un pago digital.',
  'g20.received': 'Porcentaje de adultos que recibieron al menos un pago digital.',
  'UNCTAD_DE_DIG_SERVTRADE_ANN_EXP': 'Valor de las exportaciones internacionales de servicios entregables digitalmente, expresado en millones de d\u00F3lares estadounidenses.',
  'WIPO_ICT_PAT_PUB_TOT': 'N\u00FAmero total de publicaciones de patentes relacionadas con tecnolog\u00EDas de la informaci\u00F3n y la comunicaci\u00F3n.',
  'UNESCO_UIS_GRAD_STEM': 'Porcentaje de graduados de educaci\u00F3n terciaria provenientes de programas STEM.',
};

INDICATOR_TOOLTIPS['SI.POV.GINI'] = 'Mide cu\u00E1nto se desv\u00EDa la distribuci\u00F3n del ingreso o del consumo de la igualdad perfecta. Un valor de 0 representa igualdad total y 100 desigualdad total. Para el agregado ALC se muestra un promedio simple de \u00EDndices nacionales; no equivale al Gini regional real.';

const GOV_INDEX_META = {
  egdi: { org: 'NACIONES UNIDAS', name: 'E-Government Development Index (EGDI)', scaleMax: 1, hasDimensions: true },
  gtmi: { org: 'BANCO MUNDIAL', name: 'GovTech Maturity Index (GTMI)', scaleMax: 1, hasDimensions: true },
  gci: { org: 'ITU', name: 'Global Cybersecurity Index (GCI)', scaleMax: 100, hasDimensions: true },
  ocde: { org: 'OCDE / BID', name: 'Digital Government Index', scaleMax: 1, hasDimensions: true },
  ai: { org: 'OXFORD INSIGHTS', name: 'Government AI Readiness Index', scaleMax: 100, hasDimensions: true },
  nri: { org: 'PORTULANS', name: 'Network Readiness Index (NRI)', scaleMax: 100, hasDimensions: true },
};

function getGovSubindexScaleMax(indexKey) {
  if (indexKey === 'gci') return 20;
  return GOV_INDEX_META[indexKey]?.scaleMax || 1;
}

function getGovRadarNormalizationNote() {
  return 'Cada índice se normaliza sobre su escala teórica máxima para llevarlo a una escala común de 0 a 1 en el radar. EGDI, GTMI e IGD usan 0-1; GCI, AI Readiness y NRI usan 0-100.';
}

function getGovHistoryNormalizationNote() {
  return 'Cada línea muestra la evolución histórica del índice normalizada sobre su escala teórica máxima. Los huecos indican años sin dato comparable o no disponible.';
}

function getGovOverviewTitle() {
  return govChartView === 'history' ? 'Evolución histórica de los índices' : 'Comparación entre índices';
}

const GOV_OVERVIEW_COLORS = {
  egdi: '#3f6db3',
  gtmi: '#7a5bd6',
  gci: '#2e8b57',
  ocde: '#22a3b8',
  ai: '#e08b2c',
  nri: '#2f7aa3',
};

function getDimensionScaleNote(indexKey) {
  const notes = {
    egdi: 'Subíndices EGDI en escala de 0 a 1.',
    gtmi: 'Pilares GTMI en escala de 0 a 1.',
    gci: 'Pilares GCI en escala de 0 a 20.',
    ocde: 'Dimensiones IGD en escala de 0 a 1.',
    ai: 'Pilares AI Readiness en escala de 0 a 100.',
    nri: 'Pilares NRI en escala de 0 a 100.',
  };
  return notes[indexKey] || 'Las subdimensiones se muestran en su escala original.';
}
const GOV_INDEX_ORDER = ['egdi', 'gtmi', 'gci', 'ocde', 'ai', 'nri'];
const GOV_GROUP_META = {
  egdi: {
    VHEGDI: { label: 'Nivel Muy Alto', color: '#0B5E55', icon: 'star', tooltip: 'Desempeño digital de referencia' },
    HEGDI: { label: 'Nivel Alto', color: '#2E8B57', icon: 'arrow-up', tooltip: 'Capacidad digital sólida' },
    MEGDI: { label: 'Nivel Medio', color: '#E0A100', icon: 'bar-mid', tooltip: 'Desarrollo digital intermedio' },
    LEGDI: { label: 'Nivel Bajo', color: '#C94C4C', icon: 'circle', tooltip: 'Capacidad digital limitada' },
  },
  gtmi: {
    A: { label: 'Grupo A: Líderes', color: '#0B5E55', icon: 'trophy', tooltip: 'Referente en madurez GovTech' },
    B: { label: 'Grupo B: Enfoque Significativo', color: '#2E8B57', icon: 'arrow-up', tooltip: 'Impulso GovTech consolidado' },
    C: { label: 'Grupo C: Cierto Enfoque', color: '#E0A100', icon: 'compass', tooltip: 'Avances parciales en GovTech' },
    D: { label: 'Grupo D: Enfoque Mínimo', color: '#C94C4C', icon: 'seed', tooltip: 'Madurez GovTech incipiente' },
  },
  gci: {
    1: { label: 'Tier 1: Ejemplares', color: '#0B5E55', icon: 'shield', tooltip: 'Referencia internacional en ciberseguridad' },
    2: { label: 'Tier 2: Avanzados', color: '#2E8B57', icon: 'lock', tooltip: 'Capacidades robustas de ciberseguridad' },
    3: { label: 'Tier 3: Establecidos', color: '#E0A100', icon: 'check', tooltip: 'Base institucional ya establecida' },
    4: { label: 'Tier 4: En evolución', color: '#E67E22', icon: 'trend-up', tooltip: 'Capacidades en proceso de mejora' },
    5: { label: 'Tier 5: En desarrollo', color: '#C94C4C', icon: 'tool', tooltip: 'Marco de ciberseguridad en desarrollo' },
  },
};

const GOV_SUBINDEX_LABELS = {
  egdi: {
    osi: 'Servicios en l\u00EDnea (OSI)',
    tii: 'Infraestructura de telecomunicaciones (TII)',
    hci: 'Capital humano (HCI)',
  },
  gtmi: {
    cgsi: 'Sistemas b\u00E1sicos (CGSI)',
    psdi: 'Portales y servicios (PSDI)',
    dcei: 'Habilitadores digitales (DCEI)',
    gtei: 'Entorno GovTech (GTEI)',
  },
  gci: {
    legal: 'Marco legal',
    technical: 'Medidas t\u00E9cnicas',
    organizational: 'Medidas organizacionales',
    capacity: 'Desarrollo de capacidades',
    cooperation: 'Cooperaci\u00F3n',
  },
  ocde: {
    dd: 'Digital por dise\u00F1o',
    id: 'Impulsado por los datos',
    gp: 'Gobierno como plataforma',
    ad: 'Abierto por defecto',
    iu: 'Dirigido por el usuario',
    pr: 'Proactivo',
  },
  ai: {
    policyCapacity: 'Capacidad de pol\u00EDtica p\u00FAblica',
    aiInfrastructure: 'Infraestructura para IA',
    governance: 'Gobernanza',
    publicSectorAdoption: 'Adopci\u00F3n en el sector p\u00FAblico',
    developmentDiffusion: 'Desarrollo y difusi\u00F3n',
    resilience: 'Resiliencia',
  },
  nri: {
    technology: 'Tecnolog\u00EDa',
    people: 'Personas',
    governance: 'Gobernanza',
    impact: 'Impacto',
  },
};

const GOV_SUBINDEX_COLORS = ['#6b52c2', '#d14f61', '#68c7be', '#f0a03a', '#4f88e8', '#7f64c8'];

function fixText(value) {
  if (typeof value !== 'string') return value;

  return value
    .replace(/\u00C3\u00A1/g, '\u00E1')
    .replace(/\u00C3\u00A9/g, '\u00E9')
    .replace(/\u00C3\u00AD/g, '\u00ED')
    .replace(/\u00C3\u00B3/g, '\u00F3')
    .replace(/\u00C3\u00BA/g, '\u00FA')
    .replace(/\u00C3\u00B1/g, '\u00F1')
    .replace(/\u00C3\u0081/g, '\u00C1')
    .replace(/\u00C3\u0089/g, '\u00C9')
    .replace(/\u00C3\u008D/g, '\u00CD')
    .replace(/\u00C3\u0093/g, '\u00D3')
    .replace(/\u00C3\u009A/g, '\u00DA')
    .replace(/\u00C3\u0091/g, '\u00D1')
    .replace(/\u00C2\u00B7/g, '\u00B7')
    .replace(/\u00E2\u20AC\u201D/g, '\u2014')
    .replace(/\u00E2\u20AC\u00A6/g, '\u2026')
    .replace(/\u00E2\u2014\u008F/g, '\u25CF')
    .replace(/\u00CE\u201D/g, '\u0394');
}

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getRadarAbbreviatedLabel(indexKey, label, index) {
  const base = String(label || '').trim();
  if (indexKey === 'egdi') {
    const egdiMap = {
      'Servicios en línea (OSI)': 'OSI',
      'Infraestructura de telecomunicaciones (TII)': 'TII',
      'Capital humano (HCI)': 'HCI',
    };
    return `${index + 1}. ${egdiMap[base] || base}`;
  }
  if (indexKey === 'gtmi') {
    const gtmiMap = {
      'Sistemas básicos (CGSI)': 'CGSI',
      'Portales y servicios (PSDI)': 'PSDI',
      'Habilitadores digitales (DCEI)': 'DCEI',
      'Entorno GovTech (GTEI)': 'GTEI',
    };
    return `${index + 1}. ${gtmiMap[base] || base}`;
  }
  const compactMap = {
    'Servicios en línea (OSI)': 'Serv. en línea',
    'Infraestructura de telecomunicaciones (TII)': 'Infraestr. telecom.',
    'Capital humano (HCI)': 'Capital humano',
    'Sistemas básicos (CGSI)': 'Sist. básicos',
    'Portales y servicios (PSDI)': 'Portales y serv.',
    'Habilitadores digitales (DCEI)': 'Hab. digitales',
    'Entorno GovTech (GTEI)': 'Entorno GovTech',
    'Marco legal': 'Marco legal',
    'Medidas técnicas': 'Medidas técnicas',
    'Medidas organizacionales': 'Med. organizac.',
    'Desarrollo de capacidades': 'Desarr. capacidades',
    'Cooperación': 'Cooperación',
    'Digital por diseño': 'Digital diseño',
    'Impulsado por los datos': 'Impulso datos',
    'Gobierno como plataforma': 'Gob. plataforma',
    'Abierto por defecto': 'Abierto defecto',
    'Dirigido por el usuario': 'Usuario',
    'Proactivo': 'Proactivo',
    'Capacidad de política pública': 'Cap. política',
    'Infraestructura para IA': 'Infraestr. IA',
    'Gobernanza': 'Gobernanza',
    'Adopción en el sector público': 'Adopción pública',
    'Desarrollo y difusión': 'Desarr. difusión',
    'Resiliencia': 'Resiliencia',
    'Tecnología': 'Tecnología',
    'Personas': 'Personas',
    'Impacto': 'Impacto',
  };
  const shortened = compactMap[base] || (base.length > 18 ? `${base.slice(0, 16).trim()}…` : base);
  return `${index + 1}. ${shortened}`;
}

function getFlagEmoji(iso3) {
  const iso2 = ISO2_BY_ISO3[iso3];
  if (!iso2) return '';

  return iso2
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
}

function renderNeighborPills(borderCountries = []) {
  const container = $('#info-neighbors');
  if (!container) return;

  if (!Array.isArray(borderCountries) || borderCountries.length === 0) {
    container.innerHTML = '<span class="neighbor-empty">Sin fronteras terrestres</span>';
    return;
  }

  container.innerHTML = buildCountryPillsMarkup(borderCountries, 'neighbor-pill', 'w40');
  bindCountryPillNavigation(container);
}

function renderRegionCountryPills(container, memberCountries = []) {
  if (!container) return;
  container.innerHTML = buildCountryPillsMarkup(memberCountries, 'region-country-pill', 'w40');
  bindCountryPillNavigation(container);
}

function formatCountryNameWithRegion(country) {
  const name = fixText(country?.name || '');
  const bidRegion = fixText(country?.bidRegion || '');
  return bidRegion ? `${name} \u00B7 ${bidRegion}` : name;
}

function getFlagCdnUrl(iso3, size = 'w80') {
  const iso2 = ISO2_BY_ISO3[iso3] || 'xx';
  return `https://flagcdn.com/${size}/${iso2}.png`;
}

function buildCountryPillsMarkup(isoList = [], className = 'neighbor-pill', flagSize = 'w40') {
  return isoList.map((iso3) => {
    const match = countries.find((country) => country.iso3 === iso3);
    const name = fixText(match?.name || iso3);
    const iso2 = (ISO2_BY_ISO3[iso3] || iso3).toUpperCase();
    const flagUrl = getFlagCdnUrl(iso3, flagSize);
    return `
      <button type="button" class="${className}" data-iso="${iso3}" title="${escapeHtmlAttr(name)}" aria-label="Ir a ${escapeHtmlAttr(name)}">
        <img class="${className}-flag" src="${flagUrl}" alt="Bandera de ${escapeHtmlAttr(name)}" loading="lazy" />
        <span class="${className}-code">${iso2}</span>
      </button>
    `;
  }).join('');
}

function bindCountryPillNavigation(container) {
  if (!container) return;
  container.querySelectorAll('[data-iso]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const iso = pill.dataset.iso;
      if (iso) loadCountry(iso);
    });
  });
}

function normalizeCountryId(id) {
  return String(id).padStart(3, '0');
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function ensureMapLibraries() {
  if (!window.d3) {
    await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
  }
  if (!window.topojson) {
    await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
  }
}

// â”€â”€â”€ Country color palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BID corporate blue palette for map countries
const COUNTRY_COLORS = {
  // CSC
  '032': '#004e70', // ARG
  '076': '#0a4060', // BRA
  '152': '#003e5a', // CHL
  '600': '#2d6485', // PRY
  '858': '#2d6485', // URY
  // CAN
  '068': '#1968bc', // BOL
  '170': '#003e5a', // COL
  '218': '#00374e', // ECU
  '604': '#003e5a', // PER
  '862': '#004e70', // VEN
  // CID
  '084': '#1968bc', // BLZ
  '188': '#004e70', // CRI
  '222': '#2d6485', // SLV
  '320': '#003e5a', // GTM
  '332': '#004e70', // HTI
  '340': '#00374e', // HND
  '484': '#004e70', // MEX
  '558': '#003e5a', // NIC
  '591': '#1968bc', // PAN
  '214': '#1968bc', // DOM
  // CCB
  '044': '#1968bc', // BHS
  '052': '#00374e', // BRB
  '328': '#1968bc', // GUY
  '388': '#003e5a', // JAM
  '740': '#2d6485', // SUR
  '780': '#2d6485', // TTO
};

// Small countries that need smaller labels or offsets
const LABEL_CONFIG = {
  '222': { dx: 0, dy: 0, small: true  }, // SLV
  '084': { dx: 0, dy: 0, small: true  }, // BLZ
  '780': { dx: 12, dy: 0, small: true }, // TTO
  '388': { dx: 0, dy: -2, small: true }, // JAM
  '332': { dx: 0, dy: 0, small: true  }, // HTI
  '214': { dx: 5, dy: 0, small: true  }, // DOM
  '328': { dx: 0, dy: 0, small: true  }, // GUY
  '740': { dx: 0, dy: 0, small: true  }, // SUR
  '858': { dx: 8, dy: 0, small: false }, // URY
  '591': { dx: 0, dy: 0, small: true  }, // PAN
  '188': { dx: 0, dy: 0, small: true  }, // CRI
  '558': { dx: 0, dy: 0, small: true  }, // NIC
  '340': { dx: 0, dy: 0, small: true  }, // HND
  '320': { dx: 0, dy: 0, small: true  }, // GTM
  '044': { dx: 0, dy: -2, small: true }, // BHS
  '052': { dx: 2, dy: 0, small: true  }, // BRB
};

// Country names for map labels (in Spanish)
const COUNTRY_NAMES_ES = {
  '032': 'Argentina',   '068': 'Bolivia',  '076': 'Brasil',   '084': 'Belice',
  '152': 'Chile',       '170': 'Colombia', '188': 'Costa Rica','044': 'Bahamas',
  '214': 'Rep. Dom.',   '218': 'Ecuador',  '222': 'El Salvador','320': 'Guatemala',
  '328': 'Guyana',      '332': 'Hait\u00ED',    '340': 'Honduras', '388': 'Jamaica',
  '484': 'M\u00E9xico', '558': 'Nicaragua','591': 'Panam\u00E1',   '600': 'Paraguay',
  '604': 'Per\u00FA',   '740': 'Surinam',  '780': 'Trinidad y T.','858': 'Uruguay',
  '862': 'Venezuela',   '052': 'Barbados'
};
const WORLD_BANK_COUNTRY_SLUGS = {
  ARG: 'argentina',
  BOL: 'bolivia',
  BRA: 'brasil',
  CHL: 'chile',
  COL: 'colombia',
  CRI: 'costa-rica',
  DOM: 'republica-dominicana',
  ECU: 'ecuador',
  SLV: 'el-salvador',
  GTM: 'guatemala',
  HTI: 'haiti',
  HND: 'honduras',
  JAM: 'jamaica',
  MEX: 'mexico',
  NIC: 'nicaragua',
  PAN: 'panama',
  PRY: 'paraguay',
  PER: 'peru',
  TTO: 'trinidad-y-tabago',
  URY: 'uruguay',
  VEN: 'venezuela',
  GUY: 'guyana',
  SUR: 'suriname',
  BLZ: 'belice',
  BHS: 'bahamas-las',
  BRB: 'barbados',
};

function getIndicatorSourceMeta(indicator, country) {
  const sourceYear = indicator.date ? ` (${indicator.date})` : '';
  const iso3 = country?.iso3 || '';
  const worldBankSlug = WORLD_BANK_COUNTRY_SLUGS[iso3] || '';
  const isHdi = indicator.code === 'UNDP.HDI' || String(indicator.source || '').toUpperCase().includes('PNUD');

  if (isHdi) {
    return {
      label: `PNUD${sourceYear}`,
      url: iso3 ? `https://hdr.undp.org/data-center/specific-country-data#/countries/${iso3}` : 'https://hdr.undp.org/data-center/specific-country-data',
    };
  }

  if (indicator.databaseId === 'ITU_DH') {
    return {
      label: `ITU DataHub v\u00EDa Data360 del Banco Mundial${sourceYear}`,
      url: `https://data360.worldbank.org/en/indicator/${indicator.code}`,
    };
  }

  if (indicator.databaseId === 'UNCTAD_DE') {
    return {
      label: `UNCTAD v\u00EDa Data360 del Banco Mundial${sourceYear}`,
      url: `https://data360.worldbank.org/en/indicator/${indicator.code}`,
    };
  }

  if (indicator.databaseId === 'WIPO_ICT') {
    return {
      label: `WIPO v\u00EDa Data360 del Banco Mundial${sourceYear}`,
      url: `https://data360.worldbank.org/en/indicator/${indicator.code}`,
    };
  }

  if (indicator.databaseId === 'UNESCO_UIS') {
    return {
      label: `UNESCO UIS v\u00EDa Data360 del Banco Mundial${sourceYear}`,
      url: `https://data360.worldbank.org/en/indicator/${indicator.code}`,
    };
  }

  if (indicator.category === 'connectivity') {
    return {
      label: `Data360${sourceYear}`,
      url: iso3 ? `https://data360.worldbank.org/en/economy/${iso3}?tab=Digital` : 'https://data360.worldbank.org',
    };
  }

  if (indicator.category === 'findex') {
    return {
      label: `Global FINDEX${sourceYear}`,
      url: 'https://data360.worldbank.org/en/dataset/WB_FINDEX',
    };
  }

  return {
    label: `Banco Mundial${sourceYear}`,
    url: worldBankSlug ? `https://datos.bancomundial.org/pais/${worldBankSlug}` : 'https://datos.bancomundial.org',
  };
}

function collectSourceMetas(indicators, country) {
  const sourceMetas = [];
  const sourceKeys = new Set();

  indicators.filter(Boolean).forEach((indicator) => {
    const sourceMeta = getIndicatorSourceMeta(indicator, country);
    const dedupeKey = `${sourceMeta.label}|${sourceMeta.url}`;
    if (sourceKeys.has(dedupeKey)) return;
    sourceKeys.add(dedupeKey);
    sourceMetas.push(sourceMeta);
  });

  return sourceMetas;
}

function getRankMeta(indicator) {
  const hasRegionalRank = indicator.rankALC != null && indicator.totalALC;
  const medalMap = {
    1: { icon: '\uD83E\uDD47', className: 'top-1' },
    2: { icon: '\uD83E\uDD48', className: 'top-2' },
    3: { icon: '\uD83E\uDD49', className: 'top-3' },
  };
  const medal = hasRegionalRank ? (medalMap[indicator.rankALC] || null) : null;
  const rankBadge = hasRegionalRank
    ? `#${indicator.rankALC}`
    : '--';
  const rankTooltip = hasRegionalRank
    ? `Posici\u00F3n del pa\u00EDs para este indicador dentro de los ${indicator.totalALC} pa\u00EDses de Am\u00E9rica Latina y el Caribe.`
    : 'No hay ranking regional disponible para este indicador.';

  return { hasRegionalRank, medal, rankBadge, rankTooltip };
}

// â”€â”€â”€ Format helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatLocaleNumber(value, decimals = 2, useGrouping = true) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  }).format(Number(value));
}

function formatMillions(value, unitLabel = 'M') {
  const formatted = formatLocaleNumber(Number(value) / 1_000_000, 2);
  return formatted ? `${formatted} ${unitLabel}` : null;
}

function formatValueWithYearHtml(displayValue, year) {
  if (!displayValue) return '--';
  return year
    ? `${displayValue} <span class="data-year-sep" aria-hidden="true">\u00B7</span> <span class="data-year-inline">${year}</span>`
    : displayValue;
}

function buildValueRowHtml(displayValue, hasData, year, tooltip, prefixLabel = '') {
  const prefixHtml = prefixLabel
    ? `<span class="card-inline-prefix">${prefixLabel}</span>`
    : '';

  if (!year) {
    return `
      <div class="card-value-row" title="${escapeHtmlAttr(tooltip)}" aria-label="${escapeHtmlAttr(tooltip)}">
        ${prefixHtml}
        <span class="card-value ${hasData ? '' : 'no-data'}">${hasData ? displayValue : '--'}</span>
      </div>
    `;
  }

  return `
    <div class="card-value-row" title="${escapeHtmlAttr(tooltip)}" aria-label="${escapeHtmlAttr(tooltip)}">
      ${prefixHtml}
      <span class="card-value ${hasData ? '' : 'no-data'}">${hasData ? displayValue : '--'}</span>
      <span class="card-value-sep" aria-hidden="true">\u00B7</span>
      <span class="card-year">${year}</span>
    </div>
  `;
}

function buildMetaItemHtml(label, displayHtml, metaIndicator, extraClass = '') {
  const tooltip = getIndicatorTooltip(metaIndicator);
  const { hasRegionalRank, medal, rankBadge, rankTooltip } = getRankMeta(metaIndicator);
  const hasData = displayHtml && displayHtml !== '--';
  const hideRegionalRank = Boolean(metaIndicator?.isRegionAggregate);
  const rankHtml = hideRegionalRank
    ? ''
    : `<span class="card-meta-rank ${hasRegionalRank ? '' : 'no-data'} ${medal ? medal.className : ''}" title="${escapeHtmlAttr(rankTooltip)}" aria-label="${escapeHtmlAttr(rankTooltip)}">
          ${medal ? `<span class="card-alc-medal" aria-hidden="true">${medal.icon}</span>` : ''}
          <span>${rankBadge}</span>
        </span>`;

  return `
      <span class="card-meta-row ${hasData ? '' : 'no-data'} ${extraClass}" title="${escapeHtmlAttr(tooltip)}" aria-label="${escapeHtmlAttr(tooltip)}">
        ${rankHtml}
        <span class="card-meta-copy">${label}: ${displayHtml || '--'}</span>
      </span>
    `;
}

function formatValue(value, format) {
  if (value === null || value === undefined) return null;
  switch (format) {
    case 'number':   return formatLocaleNumber(value, 2);
    case 'currency': return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    case 'millionUsd': return `${formatLocaleNumber(value, 2)} M USD`;
    case 'percent':  return `${formatLocaleNumber(value, 2)}%`;
    case 'decimal':  return (typeof value === 'number') ? formatLocaleNumber(value, 2, false) : String(value);
    case 'rank':     return `#${value} / 193`;
    case 'gtmi':     return `Grupo ${value}`;
    case 'gciTier':  return value ? value : null;
    default:         return String(value);
  }
}

function formatTime(timezone) {
  try {
    const now = new Date();
    const dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: timezone });
    const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: timezone });
    return `${dayFmt.format(now)}, ${timeFmt.format(now)}`;
  } catch { return '\u2014'; }
}

function formatExchangeRate(rate, code) {
  if (code === 'USD' || code === 'PAB') return '1 USD = 1.00 (dolarizado)';
  if (rate === null || rate === undefined) return 'No disponible';
  return `1 USD = ${rate.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${code}`;
}

// â”€â”€â”€ Create indicator card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function createCard(indicator, country, allIndicators = {}) {
  const card = document.createElement('div');
  card.className = 'card';
  const showCardSources = indicator.category !== 'basic';
  const hideRegionalRank = Boolean(country?.isRegionAggregate);
  const customTitleMap = {
    'SP.POP.TOTL': 'Demograf\u00EDa, mercado laboral y desarrollo',
    'NY.GDP.MKTP.CD': 'Econom\u00EDa',
  };
  const inlinePrefixMap = {
    'SP.POP.TOTL': 'Poblaci\u00F3n:',
    'NY.GDP.MKTP.CD': 'PIB:',
  };
  
  const badgeThemeMap = {
    basic: {
      bg: '#dbe8ef',
      ink: 'var(--bid-azul)',
      border: '#bcd8df',
    },
    connectivity: {
      bg: '#dbedf8',
      ink: '#35749b',
      border: '#b7dbf2',
    },
    findex: {
      bg: '#deebde',
      ink: '#599a69',
      border: '#accdb4',
    },
    gov: {
      bg: '#e3e1df',
      ink: '#605f59',
      border: '#d3d2d1',
    },
  };
  const badgeTheme = badgeThemeMap[indicator.category] || badgeThemeMap.basic;
  card.style.setProperty('--badge-bg', badgeTheme.bg);
  card.style.setProperty('--badge-ink', badgeTheme.ink);
  card.style.setProperty('--badge-border', badgeTheme.border);

  // For gov indicators use the special gciTierLabel if it exists
  let displayValue;
  if (indicator.format === 'gciTier' && indicator.gciTierLabel) {
    displayValue = indicator.gciTierLabel;
  } else {
    displayValue = formatValue(indicator.value, indicator.format);
  }
  if (indicator.code === 'SP.POP.TOTL' && indicator.value != null) {
    displayValue = formatMillions(indicator.value);
  }
  if (indicator.code === 'NY.GDP.MKTP.CD' && indicator.value != null) {
    displayValue = formatMillions(indicator.value, 'M USD');
  }
  const hasData = displayValue !== null;
  const mainTooltip = getIndicatorTooltip(indicator);
  const mainValueHtml = buildValueRowHtml(displayValue, hasData, indicator.date, mainTooltip, inlinePrefixMap[indicator.code] || '');
  const cardTitle = customTitleMap[indicator.code] || fixText(indicator.label);
  const embeddedIndicators = [];
  let extraMetaHtml = '';

  if (indicator.code === 'SP.POP.TOTL') {
    if (allIndicators.laborForce) {
      const laborForce = allIndicators.laborForce;
      embeddedIndicators.push(laborForce);
      const laborForceValue = formatValue(laborForce.value, laborForce.format);
      const laborForceShare = indicator.value && laborForce.value != null
        ? formatLocaleNumber((Number(laborForce.value) / Number(indicator.value)) * 100, 2, false)
        : null;
      const laborForceText = laborForceValue
        ? `${laborForceValue}${laborForceShare ? ` (${laborForceShare}%)` : ''}`
        : '--';

      extraMetaHtml += buildMetaItemHtml('Fuerza laboral', formatValueWithYearHtml(laborForceText, laborForce.date), laborForce);
    }

    if (allIndicators.unemployment) {
      const unemployment = allIndicators.unemployment;
      embeddedIndicators.push(unemployment);
      const unemploymentValue = formatValue(unemployment.value, unemployment.format);
      extraMetaHtml += buildMetaItemHtml('Desempleo', formatValueWithYearHtml(unemploymentValue, unemployment.date), unemployment);
    }

    if (allIndicators.hdi) {
      const hdi = allIndicators.hdi;
      embeddedIndicators.push(hdi);
      const hdiValue = formatValue(hdi.value, hdi.format);
      extraMetaHtml += buildMetaItemHtml('\u00CDndice de desarrollo humano', formatValueWithYearHtml(hdiValue, hdi.date), hdi, 'card-meta-break');
    }
  }

  if (indicator.code === 'NY.GDP.MKTP.CD') {
    const gdpPerCapita = allIndicators.gdpPerCapita;
    const gdpGrowth = allIndicators.gdpGrowth;
    const gini = allIndicators.gini;

    if (gdpPerCapita) {
      embeddedIndicators.push(gdpPerCapita);
      const gdpPerCapitaValue = formatValue(gdpPerCapita.value, gdpPerCapita.format);
      extraMetaHtml += buildMetaItemHtml('PIB per c\u00E1pita', formatValueWithYearHtml(gdpPerCapitaValue, gdpPerCapita.date), gdpPerCapita);
    }

    if (gdpGrowth) {
      embeddedIndicators.push(gdpGrowth);
      const gdpGrowthValue = formatValue(gdpGrowth.value, gdpGrowth.format);
      extraMetaHtml += buildMetaItemHtml('Crecimiento del PIB', formatValueWithYearHtml(gdpGrowthValue, gdpGrowth.date), gdpGrowth);
    }

    if (gini) {
      embeddedIndicators.push(gini);
      const giniValue = formatValue(gini.value, gini.format);
      extraMetaHtml += buildMetaItemHtml('\u00CDndice de Gini', formatValueWithYearHtml(giniValue, gini.date), gini);
    }
  }
  
  const sourceMetas = collectSourceMetas([indicator, ...embeddedIndicators], country);
  const { hasRegionalRank, medal, rankBadge, rankTooltip } = getRankMeta(indicator);
  const mainRankHtml = hideRegionalRank
    ? ''
    : `<span class="card-alc-badge ${hasRegionalRank ? '' : 'no-data'} ${medal ? medal.className : ''}" title="${escapeHtmlAttr(rankTooltip)}" aria-label="${escapeHtmlAttr(rankTooltip)}">
            ${medal ? `<span class="card-alc-medal" aria-hidden="true">${medal.icon}</span>` : ''}
            <span>${rankBadge}</span>
          </span>`;

  if (showCardSources && sourceMetas.length > 1) {
    card.classList.add('card-with-source-group');
  }

  card.innerHTML = `
    <div class="card-badge">${INDICATOR_ICONS[indicator.code] || fixText(indicator.icon) || ''}</div>
      <div class="card-content">
        <span class="card-label" title="${escapeHtmlAttr(mainTooltip)}" aria-label="${escapeHtmlAttr(mainTooltip)}">${cardTitle}</span>
        <div class="card-main-row">
          ${mainRankHtml}
          <div class="card-main-copy">
            ${mainValueHtml}
          </div>
        </div>
      ${extraMetaHtml}
      ${!showCardSources ? ''
        : sourceMetas.length === 1
        ? `<a class="card-source" href="${sourceMetas[0].url}" target="_blank" rel="noopener noreferrer">${fixText(sourceMetas[0].label)}</a>`
        : `<div class="card-source-group">
            ${sourceMetas.map((sourceMeta) => `
              <a class="card-source-link" href="${sourceMeta.url}" target="_blank" rel="noopener noreferrer">${fixText(sourceMeta.label)}</a>
            `).join('')}
          </div>`
      }
    </div>
  `;
  return card;
}

function createCompoundCard({ title, icon, metrics, country, showSources = true, theme = { bg: '#dbedf8', ink: '#35749b', border: '#b7dbf2' } }) {
  const card = document.createElement('div');
  card.className = 'card card-compound';
  const hideRegionalRank = Boolean(country?.isRegionAggregate);
  card.style.setProperty('--badge-bg', theme.bg);
  card.style.setProperty('--badge-ink', theme.ink);
  card.style.setProperty('--badge-border', theme.border);

  const metricRows = metrics.map((indicator) => {
    const displayValue = formatValue(indicator.value, indicator.format);
    const hasData = displayValue !== null;
    const { hasRegionalRank, medal, rankBadge, rankTooltip } = getRankMeta(indicator);
    const metricTooltip = getIndicatorTooltip(indicator);
    const metricText = formatValueWithYearHtml(displayValue, indicator.date);
    const metricRankHtml = hideRegionalRank
      ? ''
      : `<span class="card-mini-rank ${hasRegionalRank ? '' : 'no-data'} ${medal ? medal.className : ''}" title="${escapeHtmlAttr(rankTooltip)}" aria-label="${escapeHtmlAttr(rankTooltip)}">
            ${medal ? `<span class="card-alc-medal" aria-hidden="true">${medal.icon}</span>` : ''}
            <span>${rankBadge}</span>
          </span>`;

      return `
        <div class="card-metric-row" title="${escapeHtmlAttr(metricTooltip)}" aria-label="${escapeHtmlAttr(metricTooltip)}">
        ${metricRankHtml}
        <div class="card-metric-copy">
          <span class="card-metric-label">${fixText(indicator.label)}</span>
          <span class="card-metric-value ${hasData ? '' : 'no-data'}">${hasData ? metricText : '--'}</span>
        </div>
      </div>
    `;
  }).join('');

  const sourceMetas = collectSourceMetas(metrics, country);

  card.innerHTML = `
    <div class="card-badge">${icon}</div>
    <div class="card-content card-content-compound">
      <span class="card-label">${title}</span>
      <div class="card-metric-list">
        ${metricRows}
      </div>
      ${showSources
        ? `<div class="card-source-group">
            ${sourceMetas.map((sourceMeta) => `
              <a class="card-source-link" href="${sourceMeta.url}" target="_blank" rel="noopener noreferrer">${fixText(sourceMeta.label)}</a>
            `).join('')}
          </div>`
        : ''
      }
    </div>
  `;

  return card;
}

// â”€â”€â”€ Render indicators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Render indicators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderIndicators(data) {
  const containers = { 
    basic: document.getElementById('basic-cards'), 
    connectivity: document.getElementById('connectivity-cards'), 
    findex: document.getElementById('findex-cards') 
  };
  Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });
  
  if (document.getElementById('basic-section')) document.getElementById('basic-section').style.display = 'block';
  if (document.getElementById('connectivity-section')) document.getElementById('connectivity-section').style.display = 'block';

  CONNECTIVITY_CARD_GROUPS.forEach((group) => {
    const metrics = group.keys
      .map(key => data.indicators[key])
      .filter(Boolean);

    if (metrics.length && containers.connectivity) {
      containers.connectivity.appendChild(createCompoundCard({
        title: group.title,
        icon: group.icon,
        metrics,
        country: data.country,
        showSources: false,
      }));
    }
  });

  ECONOMY_TALENT_CARD_GROUPS.forEach((group) => {
    const metrics = group.keys
      .map(key => data.indicators[key])
      .filter(Boolean);

    if (metrics.length && containers.findex) {
      containers.findex.appendChild(createCompoundCard({
        title: group.title,
        icon: group.icon,
        metrics,
        country: data.country,
        showSources: false,
        theme: { bg: '#deebde', ink: '#599a69', border: '#accdb4' },
      }));
    }
  });

  for (const [, indicator] of Object.entries(data.indicators)) {
    if (indicator.category === 'connectivity' || indicator.category === 'findex') continue;
    if (indicator.embeddedIn) continue;
    const container = containers[indicator.category];
    if (container) container.appendChild(createCard(indicator, data.country, data.indicators));
  }

  if (basicLinks) {
    const iso3 = data.country?.iso3 || '';
    const isRegionAggregate = Boolean(data.country?.isRegionAggregate);
    const worldBankSlug = WORLD_BANK_COUNTRY_SLUGS[iso3] || '';
    const worldBankUrl = worldBankSlug
      ? `https://datos.bancomundial.org/pais/${worldBankSlug}`
      : 'https://datos.bancomundial.org';
    const undpUrl = !isRegionAggregate && iso3
      ? `https://hdr.undp.org/data-center/specific-country-data#/countries/${iso3}`
      : 'https://hdr.undp.org/data-center/specific-country-data';

    basicLinks.innerHTML = `
      <span>Fuente:</span>
      <a href="${worldBankUrl}" target="_blank" rel="noopener noreferrer">Banco Mundial</a>
      <span>&middot;</span>
      <a href="${undpUrl}" target="_blank" rel="noopener noreferrer">PNUD</a>
    `;
  }

  if (connectivityLinks) {
    const iso3 = data.country?.iso3 || '';
    const connectivityUrl = iso3 && !data.country?.isRegionAggregate
      ? `https://data360.worldbank.org/en/dataset/ITU_DH?country=${iso3}`
      : 'https://data360.worldbank.org/en/dataset/ITU_DH';

    connectivityLinks.innerHTML = `
      <span>Fuente:</span>
      <a href="${connectivityUrl}" target="_blank" rel="noopener noreferrer">ITU via Banco Mundial</a>
    `;
  }

  if (findexLinks) {
    const iso3 = data.country?.iso3 || '';
    const suffix = iso3 && !data.country?.isRegionAggregate ? `?country=${iso3}` : '';

    findexLinks.innerHTML = `
      <span>Fuente:</span>
      <a href="https://data360.worldbank.org/en/dataset/WB_FINDEX" target="_blank" rel="noopener noreferrer">Global Findex</a>
      <span>&middot;</span>
      <a href="https://data360.worldbank.org/en/dataset/UNCTAD_DE${suffix}" target="_blank" rel="noopener noreferrer">UNCTAD via Banco Mundial</a>
      <span>&middot;</span>
      <a href="https://data360.worldbank.org/en/dataset/WIPO_ICT${suffix}" target="_blank" rel="noopener noreferrer">WIPO via Banco Mundial</a>
      <span>&middot;</span>
      <a href="https://data360.worldbank.org/en/dataset/UNESCO_UIS${suffix}" target="_blank" rel="noopener noreferrer">UNESCO via Banco Mundial</a>
    `;
  }
}

// â”€â”€â”€ Radar chart instance (shared) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Position bar helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildPositionBar(scores, currentIso, countryName, alcAvg, allNames, isCategory) {
  // Sort all scores numerically to find min/max
  let vals = Object.values(scores).filter(v => v != null);
  let min, max;
  if (isCategory) {
    const numMap = { A: 1, B: 0.7, C: 0.4, D: 0.15 };
    const numArr = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, numMap[v] ?? 0]));
    return buildPositionBar(numArr, currentIso, countryName, null, allNames, false);
  }
  min = Math.min(...vals);
  max = Math.max(...vals);
  
  // If all scores are the same, give it a tiny range so math doesn't break
  const range = max - min || 1;
  const numCountries = vals.length;

  let markersHtml = '';
  
  // Formatter for values (e.g., GCI 96.5 vs EGDI 0.840)
  const is100Scale = max > 10;
  function fmt(v) { return formatLocaleNumber(v, 2, false); }

  // 1. Draw all other countries as small markers
  for (const [iso, val] of Object.entries(scores)) {
    if (val == null || iso === currentIso) continue;
    const pct = ((val - min) / range) * 100;
    const hoverName = allNames && allNames[iso] ? allNames[iso] : iso;
    markersHtml += `
      <div class="gov-marker" style="left:${pct.toFixed(2)}%">
        <div class="gov-marker-label">${hoverName} <span style="font-weight:700;margin-left:4px">${fmt(val)}</span></div>
      </div>
    `;
  }

  // 2. Draw ALC Average marker if available
  if (alcAvg != null) {
    const alcPct = ((alcAvg - min) / range) * 100;
    markersHtml += `
      <div class="gov-marker alc-avg" style="left:${alcPct.toFixed(2)}%">
        <div class="gov-marker-label">ALC Media <span style="font-weight:700;margin-left:4px">${fmt(alcAvg)}</span></div>
      </div>
    `;
  }


  // 3. Draw Current Country marker (stands out, drawn last so it's on top visually)
  const current = scores[currentIso] ?? null;
  if (current != null) {
    const currentPct = ((current - min) / range) * 100;
    const lbl = countryName.split(' ')[0] + (countryName.includes('Rep\u00FAblica') ? ' Dom.' : '');
    markersHtml += `
      <div class="gov-marker active-country" style="left:${currentPct.toFixed(2)}%">
        <div class="gov-marker-label">${lbl}: <span style="font-weight:700;margin-left:4px">${fmt(current)}</span></div>
      </div>
    `;
  }

  const div = document.createElement('div');
  div.className = 'gov-posbar-wrap';
  div.innerHTML = `
    <div class="gov-posbar-label">Posici\u00F3n relativa en ALC (${numCountries} pa\u00EDses)</div>
    <div class="gov-posbar-track">
      ${markersHtml}
    </div>
  `;
  return div;
}

// â”€â”€â”€ Rich E-Government index card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getGovOrgBadge(clsKey, org) {
  const map = {
    egdi: 'ONU',
    gtmi: 'BM',
    gci: 'ITU',
    ocde: 'BID',
    ai: 'OI',
    nri: 'NRI',
  };
  return map[clsKey] || org;
}

function getGovOrgTooltip(clsKey, org) {
  const map = {
    egdi: 'Ãndice elaborado por Naciones Unidas.',
    gtmi: 'Ãndice elaborado por el Banco Mundial.',
    gci: 'Ãndice elaborado por la UniÃ³n Internacional de Telecomunicaciones.',
    ocde: 'Ãndice de referencia BID/OCDE para gobierno digital.',
    ai: 'Ãndice elaborado por Oxford Insights.',
    nri: 'Ãndice elaborado por Portulans Institute.',
  };
  return map[clsKey] || `Ãndice elaborado por ${org}.`;
}

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(107, 114, 128, ${alpha})`;
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return `rgba(107, 114, 128, ${alpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getGovGroupMeta(clsKey, value) {
  if (!value) return null;
  const text = fixText(String(value)).toUpperCase();

  if (clsKey === 'egdi') {
    return GOV_GROUP_META.egdi[text] || null;
  }

  if (clsKey === 'gtmi') {
    if (text === 'A' || /GROUP\s*A\b/.test(text) || text.includes('LEADER')) return GOV_GROUP_META.gtmi.A;
    if (text === 'B' || /GROUP\s*B\b/.test(text) || text.includes('SIGNIFICANT')) return GOV_GROUP_META.gtmi.B;
    if (text === 'C' || /GROUP\s*C\b/.test(text) || text.includes('CERTAIN')) return GOV_GROUP_META.gtmi.C;
    if (text === 'D' || /GROUP\s*D\b/.test(text) || text.includes('MINIMAL')) return GOV_GROUP_META.gtmi.D;
  }

  if (clsKey === 'gci') {
    if (/TIER\s*1\b/.test(text)) return GOV_GROUP_META.gci[1];
    if (/TIER\s*2\b/.test(text)) return GOV_GROUP_META.gci[2];
    if (/TIER\s*3\b/.test(text)) return GOV_GROUP_META.gci[3];
    if (/TIER\s*4\b/.test(text)) return GOV_GROUP_META.gci[4];
    if (/TIER\s*5\b/.test(text)) return GOV_GROUP_META.gci[5];
  }

  return null;
}

function getGovGroupLabel(clsKey, value) {
  const meta = getGovGroupMeta(clsKey, value);
  if (meta) return meta.label;
  if (!value) return '\u2014';
  if (clsKey === 'egdi') {
    const map = { VHEGDI: 'Muy alto', HEGDI: 'Alto', MEGDI: 'Medio', LEGDI: 'Bajo' };
    return map[value] || value;
  }
  if (clsKey === 'gtmi') {
    const text = String(value);
    return text.includes('Â·') ? text.split('Â·')[0].trim() : text;
  }
  if (clsKey === 'gci') {
    const text = String(value);
    return text.includes('Â·') ? text.split('Â·')[0].trim() : text;
  }
  return value;
}

function getGovGroupTooltip(clsKey, value) {
  const meta = getGovGroupMeta(clsKey, value);
  if (meta) return meta.tooltip;
  if (!value) return 'No hay grupo disponible para este Ã­ndice.';
  if (clsKey === 'egdi') {
    return 'ClasificaciÃ³n EGDI: VHEGDI = Muy alto, HEGDI = Alto, MEGDI = Medio, LEGDI = Bajo.';
  }
  if (clsKey === 'gtmi') {
    return `ClasificaciÃ³n GTMI reportada por el Banco Mundial: ${value}.`;
  }
  if (clsKey === 'gci') {
    return `CategorÃ­a del GCI: ${value}.`;
  }
  return `ClasificaciÃ³n reportada por el Ã­ndice: ${value}.`;
}

function formatGovRank(rank, withMedal = false) {
  if (rank == null) return '\u2014';
  const medals = { 1: '\uD83E\uDD47', 2: '\uD83E\uDD48', 3: '\uD83E\uDD49' };
  return withMedal && medals[rank] ? `${medals[rank]} #${rank}` : `#${rank}`;
}


function getGovIndexDisplayName(indexKey) {
  if (indexKey === 'ocde') return 'OCDE / BID';
  if (indexKey === 'ai') return 'AI Readiness';
  if (indexKey === 'nri') return 'NRI';
  return indexKey.toUpperCase();
}

function getCurrentGovYear(indexKey, indexData) {
  const availableYears = indexData?.availableYears || [];
  if (!availableYears.length) return null;
  const requestedYear = govSelectedYears[indexKey];
  if (requestedYear && availableYears.includes(requestedYear)) {
    return requestedYear;
  }
  const fallbackYear = indexData.latestYear || availableYears[0];
  govSelectedYears[indexKey] = fallbackYear;
  return fallbackYear;
}

function getGovSeriesEntry(indexData, year) {
  return (indexData && year && indexData.series) ? indexData.series[year] || null : null;
}

function formatGovScore(indexKey, score) {
  if (score == null) return '\u2014';
  const digits = (indexKey === 'gci' || indexKey === 'ai' || indexKey === 'nri') ? 2 : 3;
  return formatLocaleNumber(score, digits, false);
}

function getGovHeaderRows(indexKey, entry) {
  const rankWorldText = formatGovRank(entry?.rankWorld, false);
  const rankAlcText = formatGovRank(entry?.rankALC, true);
  const rawGroupValue = entry?.tierLabel || entry?.group;
  const groupMeta = getGovGroupMeta(indexKey, rawGroupValue);
  const groupValue = groupMeta?.label || getGovGroupLabel(indexKey, rawGroupValue);

  if (indexKey === 'ocde') {
    return [
      {
        label: 'Ranking BID',
        value: rankAlcText,
        kind: 'rank',
        tooltip: 'Posicion del pais dentro del indice BID/OCDE para America Latina y el Caribe.',
      },
    ];
  }

  const rows = [];

  if (rawGroupValue != null || groupMeta) {
    rows.push({
      label: 'Grupo',
      value: groupValue,
      kind: 'group',
      tooltip: groupMeta?.tooltip || getGovGroupTooltip(indexKey, rawGroupValue),
      color: groupMeta?.color || '',
      icon: groupMeta?.icon || '',
    });
  }

  rows.push({
      label: 'Ranking mundial',
      value: rankWorldText,
      kind: 'rank',
      tooltip: 'Posicion del pais en el ranking mundial del indice para el ano seleccionado.',
    });
  rows.push({
      label: 'Ranking ALC',
      value: rankAlcText,
      kind: 'rank',
      tooltip: 'Posicion del pais dentro de America Latina y el Caribe para el ano seleccionado. Los puestos 1, 2 y 3 muestran medalla.',
    });

  return rows;
}

function buildGovCard({ indexKey, indexData, countryName, countryIso, allAlcNames, onYearChange }) {
  const meta = GOV_INDEX_META[indexKey];
  const currentYear = getCurrentGovYear(indexKey, indexData);
  const entry = getGovSeriesEntry(indexData, currentYear);
  const govTooltip = getGovMethodTooltip(indexKey, countryIso, currentYear);
  const diffValue = entry?.diffVsAlc;
  const diffClass = diffValue >= 0 ? 'gov-diff-positive' : 'gov-diff-negative';
  const diffText = diffValue != null
    ? `${diffValue >= 0 ? '+' : '-'}${formatLocaleNumber(Math.abs(diffValue), 2, false)}`
    : '\u2014';
  const scoreDisplay = formatGovScore(indexKey, entry?.score);
  const headerRows = getGovHeaderRows(indexKey, entry);
  const orgBadge = getGovOrgBadge(indexKey, meta.org);

  const card = document.createElement('div');
  card.className = 'gov-card';
  card.innerHTML = `
    <div class="gov-card-header ${indexKey}">
      <div class="gov-card-title-area">
        <div class="gov-card-org-logo ${indexKey}" title="${escapeHtmlAttr(getGovOrgTooltip(indexKey, meta.org))}" aria-label="${escapeHtmlAttr(getGovOrgTooltip(indexKey, meta.org))}">${orgBadge}</div>
        <div class="gov-card-title-wrap">
          <div class="gov-card-org">${meta.org}</div>
          <div class="gov-card-name">${meta.name}</div>
          <div class="gov-card-year-row">
            <span class="gov-card-year-label">Serie hist\u00F3rica</span>
            <select class="gov-card-year-select" data-gov-index="${indexKey}" aria-label="Seleccionar ano de ${meta.name}">
              ${(indexData?.availableYears || []).map((year) => `
                <option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
        <div class="gov-card-header-meta">
        ${headerRows.map((row) => `
          <div class="gov-card-header-item" title="${escapeHtmlAttr(row.tooltip)}" aria-label="${escapeHtmlAttr(row.tooltip)}">
            <span class="gov-card-header-label">${row.label}</span>
            <span
              class="${row.kind === 'group' ? `gov-group-badge ${indexKey}` : 'gov-card-header-val'}"
              ${row.kind === 'group' && row.color ? `style="background:${escapeHtmlAttr(hexToRgba(row.color, 0.14))};color:${escapeHtmlAttr(row.color)};border-color:${escapeHtmlAttr(hexToRgba(row.color, 0.28))}"` : ''}
              ${row.kind === 'group' && row.icon ? `data-icon="${escapeHtmlAttr(row.icon)}"` : ''}
            >${row.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="gov-card-body">
      <div class="gov-card-score-panel" title="${escapeHtmlAttr(govTooltip)}" aria-label="${escapeHtmlAttr(govTooltip)}">
        <div class="gov-card-score-value ${indexKey}">${scoreDisplay}</div>
        <div class="gov-card-score-diff">
          <span class="gov-card-score-diff-label">Dif. vs media ALC</span>
          <span class="${diffClass}">${diffText}</span>
        </div>
      </div>
    </div>
  `;

  card.querySelector('.gov-card-year-select')?.addEventListener('change', (event) => {
    onYearChange(indexKey, event.target.value);
  });

  if (entry?.allAlc && Object.keys(entry.allAlc).length > 0 && countryIso !== REGION_AGGREGATE_ISO) {
    const posBar = buildPositionBar(entry.allAlc, countryIso, countryName, entry.alcAvg, allAlcNames, false);
    card.querySelector('.gov-card-body').appendChild(posBar);
  }

  return card;
}

function updateGovRadarChart(govData, countryName) {
  if (govRadarNote) {
    govRadarNote.textContent = getGovRadarNormalizationNote();
  }
  const labels = ['EGDI', 'GCI', 'GTMI', 'OCDE/BID', 'AI Readiness', 'NRI'];
  const countryValues = ['egdi', 'gci', 'gtmi', 'ocde', 'ai', 'nri'].map((indexKey) => {
    const entry = getGovSeriesEntry(govData[indexKey], getCurrentGovYear(indexKey, govData[indexKey]));
    const scaleMax = GOV_INDEX_META[indexKey].scaleMax;
    return entry?.score != null ? entry.score / scaleMax : 0;
  });
  const alcValues = ['egdi', 'gci', 'gtmi', 'ocde', 'ai', 'nri'].map((indexKey) => {
    const entry = getGovSeriesEntry(govData[indexKey], getCurrentGovYear(indexKey, govData[indexKey]));
    const scaleMax = GOV_INDEX_META[indexKey].scaleMax;
    return entry?.alcAvg != null ? entry.alcAvg / scaleMax : 0;
  });

  const radarCtx = document.getElementById('govRadarChart')?.getContext('2d');
  if (!radarCtx) return;
  if (_govRadarChart) {
    _govRadarChart.destroy();
    _govRadarChart = null;
  }

  _govRadarChart = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: countryName,
          data: countryValues,
          backgroundColor: 'rgba(25, 104, 188, 0.18)',
          borderColor: '#1968bc',
          pointBackgroundColor: '#1968bc',
          pointRadius: 5,
          borderWidth: 2,
        },
        {
          label: 'Media ALC',
          data: alcValues,
          backgroundColor: 'rgba(230, 126, 34, 0.10)',
          borderColor: '#e67e22',
          pointBackgroundColor: '#e67e22',
          pointRadius: 4,
          borderWidth: 2,
          borderDash: [6, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: { stepSize: 0.25, color: '#6b8599', font: { size: 10, weight: '500' }, backdropColor: 'transparent' },
          pointLabels: { font: { size: 13, weight: '700' }, color: '#1a2b3c' },
          grid: { color: 'rgba(0,78,112,0.1)' },
          angleLines: { color: 'rgba(0,78,112,0.15)' },
        },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { font: { size: 12 }, boxWidth: 15, color: '#1a2b3c', padding: 20 } },
      },
    },
  });
}

function renderGovSection(govData, countryName, countryIso, allAlcNames) {
  const section = document.getElementById('gov-section');
  const container = document.getElementById('gov-index-cards');
  if (!section || !container || !govData) return;

  container.innerHTML = '';
  section.style.display = 'block';

  const onYearChange = (indexKey, year) => {
    govSelectedYears[indexKey] = year;
    renderGovSection(govData, countryName, countryIso, allAlcNames);
    renderDimensionsSection(govData, countryName, allAlcNames, countryIso);
  };

  GOV_INDEX_ORDER.forEach((indexKey) => {
    const indexData = govData[indexKey];
    if (!indexData?.availableYears?.length) return;
    container.appendChild(buildGovCard({ indexKey, indexData, countryName, countryIso, allAlcNames, onYearChange }));
  });

  updateGovRadarChart(govData, countryName);
}

function renderDimRadarChart(indexKey, rows, countryName, isRegionAggregate) {
  const radarCtx = document.getElementById('dimRadarChart')?.getContext('2d');
  if (!radarCtx) return;
  if (_dimRadarChart) {
    _dimRadarChart.destroy();
    _dimRadarChart = null;
  }

  const labels = rows.map((row, index) => row.radarLabel || getRadarAbbreviatedLabel(indexKey, row.label, index));
  const maxScale = getGovSubindexScaleMax(indexKey);
  const datasets = [{
    label: isRegionAggregate ? 'ALC' : countryName,
    data: rows.map((row) => (row.score ?? 0) / maxScale),
    backgroundColor: 'rgba(25, 104, 188, 0.14)',
    borderColor: '#1968bc',
    pointBackgroundColor: rows.map((row) => row.color),
    pointBorderColor: '#ffffff',
    borderWidth: 2,
    pointRadius: 4,
  }];

  if (!isRegionAggregate) {
    datasets.push({
      label: 'Media ALC',
      data: rows.map((row) => (row.alcAvg ?? 0) / maxScale),
      backgroundColor: 'rgba(240, 160, 58, 0.08)',
      borderColor: '#f0a03a',
      pointBackgroundColor: '#f0a03a',
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 3,
    });
  }

  _dimRadarChart = new Chart(radarCtx, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: { display: false },
          pointLabels: { font: { size: 11, weight: '600' }, color: '#51687c' },
          grid: { color: 'rgba(0,78,112,0.1)' },
          angleLines: { color: 'rgba(0,78,112,0.15)' },
        },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 14, color: '#51687c' } },
        tooltip: {
          callbacks: {
            title(items) {
              const item = items?.[0];
              if (!item) return '';
              const row = rows[item.dataIndex];
              return row ? (row.radarLabel || row.shortLabel) : '';
            },
            label(context) {
              const row = rows[context.dataIndex];
              if (!row) return context.dataset.label;
              const value = context.raw * maxScale;
              return `${context.dataset.label}: ${formatGovScore(indexKey, value)}`;
            },
          },
        },
      },
    },
  });
}

function renderDimensionsSection(govData, countryName, allNamesMap, countryIso) {
  const section = $('#gov-dimensions-section');
  const tabs = Array.from($$('.dim-tab'));
  const content = $('#gov-dim-content');
  const empty = $('#gov-dim-empty');
  const listContainer = $('#dim-list-container');
  const indexNameLabel = $('#dim-active-index-name');
  const yearSelect = $('#dim-year-select');
  if (!section || !content || !empty || !listContainer || !indexNameLabel || !yearSelect) return;

  section.style.display = 'block';

  const validTabKeys = tabs
    .map((tab) => tab.dataset.index)
    .filter((indexKey) => govData[indexKey]?.availableYears?.length);
  if (!validTabKeys.length) {
    section.style.display = 'none';
    return;
  }
  if (!validTabKeys.includes(activeDimIndex)) {
    activeDimIndex = validTabKeys[0];
  }

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.index === activeDimIndex);
    tab.onclick = () => {
      activeDimIndex = tab.dataset.index;
      renderDimensionsSection(govData, countryName, allNamesMap, countryIso);
    };
  });

  const indexData = govData[activeDimIndex];
  const currentYear = getCurrentGovYear(activeDimIndex, indexData);
  const entry = getGovSeriesEntry(indexData, currentYear);
  const labelsMap = GOV_SUBINDEX_LABELS[activeDimIndex] || {};
  const subindices = entry?.subindices || {};
  const subKeys = Object.keys(subindices).filter((key) => subindices[key] && subindices[key].score != null);

  indexNameLabel.textContent = `${getGovIndexDisplayName(activeDimIndex)} \u00B7 ${currentYear || ''}`.trim();
  yearSelect.innerHTML = (indexData?.availableYears || []).map((year) => `
    <option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>
  `).join('');
  yearSelect.onchange = (event) => {
    govSelectedYears[activeDimIndex] = event.target.value;
    renderGovSection(govData, countryName, countryIso, allNamesMap);
    renderDimensionsSection(govData, countryName, allNamesMap, countryIso);
  };

  if (!subKeys.length) {
    if (dimRadarNote) {
      dimRadarNote.textContent = '';
    }
    content.style.display = 'none';
    empty.style.display = 'block';
    empty.textContent = currentYear
      ? `No hay desglose por sub\u00EDndices disponible para ${getGovIndexDisplayName(activeDimIndex)} en ${currentYear}.`
      : 'No hay desglose por sub\u00EDndices disponible para este \u00EDndice.';
    if (_dimRadarChart) {
      _dimRadarChart.destroy();
      _dimRadarChart = null;
    }
    return;
  }

  content.style.display = 'block';
  empty.style.display = 'none';

  const dimTooltip = getDimensionMethodTooltip(activeDimIndex, govData?.isRegionAggregate, currentYear);
  if (dimRadarNote) {
    dimRadarNote.textContent = getDimensionScaleNote(activeDimIndex);
  }
  const rows = subKeys.map((subKey, index) => {
    const item = subindices[subKey];
    const label = labelsMap[subKey] || subKey.toUpperCase();
    const shortLabel = `${index + 1}. ${label}`;
    return {
      key: subKey,
      label,
      shortLabel,
      radarLabel: getRadarAbbreviatedLabel(activeDimIndex, label, index),
      score: item.score,
      alcAvg: item.alcAvg,
      rankALC: item.rankALC,
      diff: item.score != null && item.alcAvg != null ? item.score - item.alcAvg : null,
      color: GOV_SUBINDEX_COLORS[index % GOV_SUBINDEX_COLORS.length],
      tooltip: `${label}. ${dimTooltip}`,
    };
  });

  renderDimRadarChart(activeDimIndex, rows, countryName, Boolean(govData?.isRegionAggregate));

  listContainer.innerHTML = rows.map((row, index) => {
    const scoreText = formatGovScore(activeDimIndex, row.score);
    const avgText = formatGovScore(activeDimIndex, row.alcAvg);
    const diffText = row.diff == null
      ? '\u2014'
      : `${row.diff >= 0 ? '+' : '-'}${formatLocaleNumber(Math.abs(row.diff), 2, false)}`;
    const diffClass = row.diff == null ? '' : (row.diff >= 0 ? 'dim-diff-positive' : 'dim-diff-negative');
    const subindexScaleMax = getGovSubindexScaleMax(activeDimIndex);
    const width = subindexScaleMax
      ? Math.min(100, ((row.score ?? 0) / subindexScaleMax) * 100)
      : 0;
    const rankText = row.rankALC != null ? formatGovRank(row.rankALC, true) : (govData?.isRegionAggregate ? 'ALC' : '\u2014');

    return `
      <div class="dim-row" title="${escapeHtmlAttr(row.tooltip)}" aria-label="${escapeHtmlAttr(row.tooltip)}">
        <div class="dim-row-header">
          <div class="dim-row-title" style="color:${row.color}">
            <span class="dim-dot">\u25CF</span> ${row.shortLabel}
          </div>
          <div class="dim-row-score-box">
            <div class="dim-row-score" style="color:${row.color}">${scoreText}</div>
            <div class="dim-row-rank">${rankText}</div>
          </div>
        </div>
        <div class="dim-row-bar-wrap">
          <div class="dim-row-bar-track"></div>
          <div class="dim-row-bar-fill" style="width:${width.toFixed(1)}%; background-color:${row.color}"></div>
        </div>
        <div class="dim-row-footer">
          <span class="dim-row-footer-avg">ALC ${avgText}</span>
          <span class="dim-row-footer-diff ${diffClass}">\u0394 ${diffText}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderCountryInfo(country) {
  const isRegionAggregate = Boolean(country.isRegionAggregate);
  $('#info-flag').textContent = isRegionAggregate ? '\uD83C\uDF0E' : getFlagEmoji(country.iso3);
  $('#info-name').textContent   = fixText(country.name);
  $('#info-subregion').textContent = fixText(country.bidRegion || '\u2014');
  const infoIncomeLevel = $('#info-income-level');
  infoIncomeLevel.textContent = fixText(country.incomeLevel || '\u2014');
  infoIncomeLevel.title = INCOME_LEVEL_TOOLTIP;
  infoIncomeLevel.setAttribute('aria-label', INCOME_LEVEL_TOOLTIP);

  if (isRegionAggregate) {
    infoMetaBlock.classList.add('hidden');
    infoRows.classList.add('hidden');
    infoRegionFlags.classList.remove('hidden');
    renderRegionCountryPills(infoRegionFlags, country.memberCountries || []);
    if (clockInterval) clearInterval(clockInterval);
  } else {
    infoMetaBlock.classList.remove('hidden');
    infoRows.classList.remove('hidden');
    infoRegionFlags.classList.add('hidden');
    $('#info-capital').textContent = fixText(country.capital);
    $('#info-currency').textContent = `${fixText(country.currency)} (${country.currencyCode})`;
    $('#info-exchange').textContent = formatExchangeRate(country.exchangeRate, country.currencyCode);
    $('#info-domain').textContent  = country.domain;
    renderNeighborPills(country.borderCountries);
    $('#info-timezone').textContent = fixText(country.timezone);

    // Update clock immediately, then every second
    updateClock(country.timezone);
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => updateClock(country.timezone), 1000);
  }

  countryInfo.classList.remove('hidden');
}

// â”€â”€â”€ Render country banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderBanner(country) {
  const isRegionAggregate = Boolean(country.isRegionAggregate);
  if (isRegionAggregate) {
    bannerFlag.classList.add('hidden');
    bannerMetaBlock.classList.add('hidden');
    bannerRegionFlags.classList.remove('hidden');
    renderRegionCountryPills(bannerRegionFlags, country.memberCountries || []);
  } else {
    const iso2 = ISO2_BY_ISO3[country.iso3] || 'xx';
    bannerFlag.classList.remove('hidden');
    bannerMetaBlock.classList.remove('hidden');
    bannerRegionFlags.classList.add('hidden');
    bannerFlag.src = `https://flagcdn.com/w160/${iso2}.png`;
    bannerFlag.alt = `Bandera de ${fixText(country.name)}`;
  }
  bannerName.textContent = fixText(country.name);
  bannerSubregion.textContent = fixText(country.bidRegion || '\u2014');
  bannerIncomeLevel.textContent = fixText(country.incomeLevel || '\u2014');
  bannerIncomeLevel.title = INCOME_LEVEL_TOOLTIP;
  bannerIncomeLevel.setAttribute('aria-label', INCOME_LEVEL_TOOLTIP);
  countryBanner.classList.remove('hidden');
}

function updateClock(timezone) {
  $('#info-time').textContent = formatTime(timezone);
}

// â”€â”€â”€ UI states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showLoading() {
  loader.classList.remove('hidden');
  errorEl.classList.add('hidden');
  emptyState.classList.add('hidden');
  indicatorsWrapper.classList.add('hidden');
}
function hideLoading() { loader.classList.add('hidden'); }
function showError(msg) {
  hideLoading();
  errorMsg.textContent = msg;
  errorEl.classList.remove('hidden');
}

// â”€â”€â”€ Load country data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadCountry(iso) {
  if (!iso) return;
  selectedIso = iso;

  // Sync dropdown
  selectEl.value = iso;
  updateCountryPickerSelection();

  // Highlight on map
  highlightCountry(iso);

  showLoading();
  try {
    const res = await fetch(`/api/country/${iso}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    hideLoading();
    emptyState.classList.add('hidden');
    indicatorsWrapper.classList.remove('hidden');

    renderCountryInfo(data.country);
    renderBanner(data.country);
    renderIndicators(data);
    updateRegionalMethodNotes(data.country);
    // Add ALC name map for tooltips
    const allNamesMap = {};
    if (countries) { // Assuming 'countries' is the global list of all ALC countries
      countries.forEach(c => allNamesMap[c.iso3] = fixText(c.name));
      renderGovSection(data.govData, fixText(data.country.name), data.country.iso3, allNamesMap);
      renderDimensionsSection(data.govData, fixText(data.country.name), allNamesMap, data.country.iso3);
    } else {
      renderGovSection(data.govData, fixText(data.country.name), data.country.iso3, {});
    }
  } catch (err) {
    console.error(err);
    showError('No se pudieron obtener los datos. Int\u00E9ntalo de nuevo.');
  }
}

function closeCountryPicker() {
  if (!countryPickerPanel || !countryPickerTrigger) return;
  countryPickerPanel.classList.add('hidden');
  countryPickerTrigger.setAttribute('aria-expanded', 'false');
}

function toggleCountryPicker() {
  if (!countryPickerPanel || !countryPickerTrigger) return;
  const willOpen = countryPickerPanel.classList.contains('hidden');
  countryPickerPanel.classList.toggle('hidden', !willOpen);
  countryPickerTrigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

async function initMap() {
  try {
    await ensureMapLibraries();
    const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
    const allCountries = topojson.feature(world, world.objects.countries);

    const latamIds = new Set(Object.keys(COUNTRY_COLORS).map(normalizeCountryId));

    // Separate LATAM vs rest (for context)
    const latamFeatures = allCountries.features.filter(f => latamIds.has(normalizeCountryId(f.id)));
    const contextFeatures = allCountries.features.filter(f => {
      const id = normalizeCountryId(f.id);
      if (latamIds.has(id)) return false;
      // Show nearby countries for context (US, Guiana Fr., etc.)
      // Use a bounding box: lon -120 to -30, lat -60 to 35
      const centroid = d3.geoCentroid(f);
      return centroid[0] > -120 && centroid[0] < -30 && centroid[1] > -60 && centroid[1] < 38;
    });

    // SVG dimensions
    const width = 380;
    const height = 580;

    // Projection fitted to LATAM
    const projection = d3.geoMercator()
      .fitExtent([[10, 10], [width - 10, height - 10]], {
        type: 'FeatureCollection',
        features: latamFeatures,
      });

    const path = d3.geoPath().projection(projection);

    // Clear placeholder
    mapPlaceholder.remove();

    const svg = d3.select('#map-container')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Context countries (non-interactive)
    svg.selectAll('.non-latam')
      .data(contextFeatures)
      .join('path')
      .attr('class', 'country-path non-latam')
      .attr('d', path);

    // LATAM countries
    svg.selectAll('.latam')
      .data(latamFeatures)
      .join('path')
      .attr('class', 'country-path')
      .attr('d', path)
      .attr('data-id', d => normalizeCountryId(d.id))
      .style('fill', d => COUNTRY_COLORS[normalizeCountryId(d.id)] || '#2c5282')
      .on('click', (event, d) => {
        const numId = normalizeCountryId(d.id);
        const iso = numericToIso[numId];
        if (iso) loadCountry(iso);
      });

    // Labels
    svg.selectAll('.country-label')
      .data(latamFeatures)
      .join('text')
      .attr('class', d => {
        const cfg = LABEL_CONFIG[normalizeCountryId(d.id)];
        return `country-label${cfg && cfg.small ? ' small-label' : ''}`;
      })
      .attr('x', d => {
        const c = path.centroid(d);
        const cfg = LABEL_CONFIG[normalizeCountryId(d.id)];
        return c[0] + (cfg ? cfg.dx : 0);
      })
      .attr('y', d => {
        const c = path.centroid(d);
        const cfg = LABEL_CONFIG[normalizeCountryId(d.id)];
        return c[1] + (cfg ? cfg.dy : 0);
      })
      .text(d => fixText(COUNTRY_NAMES_ES[normalizeCountryId(d.id)] || ''));

  } catch (err) {
    console.error('Error loading map:', err);
    if (mapPlaceholder) {
      mapPlaceholder.innerHTML = '<p style="color:#f87171">Error al cargar el mapa</p>';
    }
  }
}

// â”€â”€â”€ Highlight country on map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateCountryPickerSelection() {
  if (!countryPickerPanel || !countryPickerTriggerText) return;

  const selectedCountry = countries.find(country => country.iso3 === selectedIso) || null;
  countryPickerTriggerText.textContent = selectedIso === REGION_AGGREGATE_ISO
    ? REGION_OPTION.name
    : (selectedCountry ? fixText(selectedCountry.name) : '\u2014 Elige un pa\u00EDs \u2014');

  $$('.country-picker-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.iso === selectedIso);
  });
}

function renderCountryPicker() {
  if (!countryPickerPanel) return;

  const groupedCountries = BID_REGION_ORDER.map((region) => ({
    region,
    countries: countries.filter((country) => country.bidRegion === region),
  })).filter((group) => group.countries.length);

  const regionFlagsPreview = countries.map((country) => {
    const iso2 = (ISO2_BY_ISO3[country.iso3] || country.iso3).toUpperCase();
    return `
      <span class="picker-region-pill" title="${escapeHtmlAttr(fixText(country.name))}" aria-hidden="true">
        <img class="picker-region-pill-flag" src="${getFlagCdnUrl(country.iso3, 'w40')}" alt="" loading="lazy" />
        <span class="picker-region-pill-code">${iso2}</span>
      </span>
    `;
  }).join('');

  countryPickerPanel.innerHTML = `
    <section class="country-picker-group country-picker-group-region">
      <h3 class="country-picker-group-title">Agregado regional</h3>
      <button type="button" class="country-picker-card country-picker-card-region ${selectedIso === REGION_AGGREGATE_ISO ? 'active' : ''}" data-iso="${REGION_AGGREGATE_ISO}">
        <span class="country-picker-region-icon" aria-hidden="true">\uD83C\uDF0E</span>
        <span class="country-picker-region-name">${REGION_OPTION.name}</span>
        <span class="country-picker-region-flags">${regionFlagsPreview}</span>
      </button>
    </section>
    ${groupedCountries.map(({ region, countries: regionCountries }) => `
      <section class="country-picker-group">
        <h3 class="country-picker-group-title">${fixText(region)}</h3>
        <div class="country-picker-grid">
          ${regionCountries.map((country) => `
            <button type="button" class="country-picker-card ${country.iso3 === selectedIso ? 'active' : ''}" data-iso="${country.iso3}">
              <img class="country-picker-flag" src="${getFlagCdnUrl(country.iso3)}" alt="Bandera de ${fixText(country.name)}" loading="lazy" />
              <span class="country-picker-name">${fixText(country.name)}</span>
              <span class="country-picker-chevron" aria-hidden="true">&#8250;</span>
            </button>
          `).join('')}
        </div>
      </section>
    `).join('')}
  `;

  $$('.country-picker-card').forEach((card) => {
    card.addEventListener('click', () => {
      closeCountryPicker();
      loadCountry(card.dataset.iso);
    });
  });

  updateCountryPickerSelection();
}

function highlightCountry(iso) {
  $$('.country-path.selected').forEach(el => el.classList.remove('selected'));
  mapRegionTrigger?.classList.toggle('active', iso === REGION_AGGREGATE_ISO);

  if (iso === REGION_AGGREGATE_ISO) {
    $$('.country-path').forEach(el => el.classList.add('selected'));
    return;
  }

  const country = countries.find(c => c.iso3 === iso);
  if (!country) return;
  const pathEl = $(`[data-id="${country.numericId}"]`);
  if (pathEl) pathEl.classList.add('selected');
}

async function init() {
  try {
    countries = await fetchCountries();

    countries.forEach(c => {
      numericToIso[c.numericId] = c.iso3;
    });

    const regionOption = document.createElement('option');
    regionOption.value = REGION_AGGREGATE_ISO;
    regionOption.textContent = REGION_OPTION.name;
    selectEl.appendChild(regionOption);

    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.iso3;
      opt.textContent = `${getFlagEmoji(c.iso3)}  ${fixText(c.name)}`;
      selectEl.appendChild(opt);
    });

    renderCountryPicker();
  } catch (err) {
    console.error('Error loading country list:', err);
  }

  selectEl.addEventListener('change', e => loadCountry(e.target.value));
  mapRegionTrigger?.addEventListener('click', () => loadCountry(REGION_AGGREGATE_ISO));
  if (countryPickerTrigger) {
    countryPickerTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleCountryPicker();
    });
  }
  document.addEventListener('click', (event) => {
    if (countryPicker && !countryPicker.contains(event.target)) {
      closeCountryPicker();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCountryPicker();
    }
  });

  await initMap();
  await loadCountry(REGION_AGGREGATE_ISO);
}

function getIndicatorTooltip(indicator) {
  if (indicator?.isRegionAggregate && REGION_METHOD_TOOLTIPS[indicator.code]) {
    return REGION_METHOD_TOOLTIPS[indicator.code];
  }
  return INDICATOR_TOOLTIPS[indicator.code] || fixText(indicator.label) || 'Indicador sin descripci\u00F3n disponible.';
}

function updateRegionalMethodNotes(country) {
  const isRegionAggregate = Boolean(country?.isRegionAggregate);
  const entries = [
    [basicMethodNote, REGION_SECTION_NOTES.basic],
    [connectivityMethodNote, REGION_SECTION_NOTES.connectivity],
    [findexMethodNote, REGION_SECTION_NOTES.findex],
    [govMethodNote, REGION_SECTION_NOTES.gov],
    [dimensionsMethodNote, REGION_SECTION_NOTES.dimensions],
  ];

  entries.forEach(([el, text]) => {
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('hidden', !isRegionAggregate);
  });
}

function getGovMethodTooltip(clsKey, countryIso, year = null) {
  if (countryIso !== REGION_AGGREGATE_ISO) return 'Indicador compuesto de referencia internacional para gobierno digital.';

  const map = {
    egdi: `Promedio regional del EGDI para ${year || 'el a\u00F1o seleccionado'}. Los sub\u00EDndices tambi\u00E9n se muestran como promedios regionales.`,
    gtmi: `Promedio regional del GTMI para ${year || 'el a\u00F1o seleccionado'}. Los sub\u00EDndices tambi\u00E9n se muestran como promedios regionales.`,
    gci: `Promedio regional del GCI para ${year || 'el a\u00F1o seleccionado'}.`,
    ocde: `Promedio regional del \u00EDndice OCDE/BID y de sus dimensiones para ${year || 'el a\u00F1o seleccionado'}.`,
    ai: `Promedio regional del Government AI Readiness Index para ${year || 'el a\u00F1o seleccionado'}.`,
    nri: `Promedio regional del Network Readiness Index para ${year || 'el a\u00F1o seleccionado'}, con pa\u00EDses disponibles.`,
  };

  return map[clsKey] || 'Promedio regional del indicador para los 26 pa\u00EDses de ALC.';
}

function getDimensionMethodTooltip(tabKey, isRegionAggregate, year = null) {
  if (!isRegionAggregate) {
    return `Sub\u00EDndice del indicador seleccionado para ${year || 'el a\u00F1o seleccionado'} y comparaci\u00F3n frente al promedio de ALC.`;
  }

  const map = {
    egdi: `Cada dimensi\u00F3n muestra el promedio regional del sub\u00EDndice EGDI correspondiente para ${year || 'el a\u00F1o seleccionado'}.`,
    gtmi: `Cada dimensi\u00F3n muestra el promedio regional del sub\u00EDndice GTMI correspondiente para ${year || 'el a\u00F1o seleccionado'}.`,
    gci: `Cada dimensi\u00F3n muestra el pilar GCI correspondiente para ${year || 'el a\u00F1o seleccionado'}, a partir de Data360 del Banco Mundial.`,
    ocde: `Cada dimensi\u00F3n muestra el promedio regional del sub\u00EDndice OCDE/BID correspondiente para ${year || 'el a\u00F1o seleccionado'}.`,
    nri: `Cada pilar muestra el promedio regional del NRI para ${year || 'el a\u00F1o seleccionado'}, con pa\u00EDses disponibles.`,
  };

  return map[tabKey] || 'Promedio regional de la dimensi\u00F3n para los 26 pa\u00EDses de ALC.';
}

init();


