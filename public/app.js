/* ============================================
   app.js — D3 map + indicator dashboard
   ============================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// DOM refs
const selectEl          = $('#country-select');
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

// State
let countries = [];
let selectedIso = null;
let clockInterval = null;
let _govRadarChart = null;
let _dimRadarChart = null;

// Numeric ID → ISO3 mapping (built from server data)
let numericToIso = {};

// ─── Country color palette ─────────────────────────────
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
  '328': 'Guyana',      '332': 'Haití',    '340': 'Honduras', '388': 'Jamaica',
  '484': 'México',      '558': 'Nicaragua','591': 'Panamá',   '600': 'Paraguay',
  '604': 'Perú',        '740': 'Surinam',  '780': 'Trinidad y T.','858': 'Uruguay',
  '862': 'Venezuela',   '052': 'Barbados'
};

// ─── Format helpers ────────────────────────────────────
function formatValue(value, format) {
  if (value === null || value === undefined) return null;
  switch (format) {
    case 'number':   return new Intl.NumberFormat('es-ES').format(Math.round(value));
    case 'currency': return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    case 'percent':  return value.toFixed(2) + '%';
    case 'decimal':  return (typeof value === 'number') ? value.toFixed(4) : String(value);
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
  } catch { return '—'; }
}

function formatExchangeRate(rate, code) {
  if (code === 'USD' || code === 'PAB') return '1 USD = 1.00 (dolarizado)';
  if (rate === null || rate === undefined) return 'No disponible';
  return `1 USD = ${rate.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${code}`;
}

// ─── Create indicator card ─────────────────────────────
function createCard(indicator) {
  const card = document.createElement('div');
  card.className = 'card';
  
  // Assign badge colors based on category/indicator
  let badgeColor = 'var(--bid-azul)';
  if (indicator.category === 'basic') badgeColor = '#7e64a6'; // Purple
  else if (indicator.category === 'connectivity') badgeColor = '#65bba6'; // Teal
  else if (indicator.category === 'findex') badgeColor = '#2db371'; // Green
  else if (indicator.category === 'gov') badgeColor = '#3a5ca8'; // Indigo for government indices
  
  // Set custom CSS variable for the badge background
  card.style.setProperty('--badge-bg', badgeColor);

  // For gov indicators use the special gciTierLabel if it exists
  let displayValue;
  if (indicator.format === 'gciTier' && indicator.gciTierLabel) {
    displayValue = indicator.gciTierLabel;
  } else {
    displayValue = formatValue(indicator.value, indicator.format);
  }
  const hasData = displayValue !== null;
  
  // The source label
  let source = indicator.source || 'Banco Mundial';
  if (!indicator.source) {
    if (indicator.category === 'basic' && indicator.label.includes('Humano')) source = 'PNUD / Naciones Unidas';
    else if (indicator.category === 'basic') source = 'Banco Mundial';
    if (indicator.category === 'connectivity') source = 'UIT / Banco Mundial';
    if (indicator.category === 'findex') source = 'Global Findex / Banco Mundial';
  }
  
  if (indicator.date) {
    source += ` · ${indicator.date}`;
  }

  card.innerHTML = `
    <div class="card-badge">${indicator.icon}</div>
    <div class="card-content">
      <span class="card-label">${indicator.label}</span>
      <span class="card-value ${hasData ? '' : 'no-data'}">${hasData ? displayValue : '--'}</span>
      <span class="card-source">${source}</span>
    </div>
  `;
  return card;
}

// ─── Render indicators ────────────────────────────────
// ─── Render indicators ────────────────────────────────
function renderIndicators(data) {
  const containers = { 
    basic: document.getElementById('basic-cards'), 
    connectivity: document.getElementById('connectivity-cards'), 
    findex: document.getElementById('findex-cards') 
  };
  Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });
  
  if (document.getElementById('basic-section')) document.getElementById('basic-section').style.display = 'block';
  if (document.getElementById('connectivity-section')) document.getElementById('connectivity-section').style.display = 'block';

  for (const [, indicator] of Object.entries(data.indicators)) {
    const container = containers[indicator.category];
    if (container) container.appendChild(createCard(indicator));
  }
}

// ─── Radar chart instance (shared) ───────────────────
// ─── Position bar helper ───────────────────────────────
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
  function fmt(v) { return is100Scale ? v.toFixed(1) : v.toFixed(3); }

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
    const lbl = countryName.split(' ')[0] + (countryName.includes('República') ? ' Dom.' : '');
    markersHtml += `
      <div class="gov-marker active-country" style="left:${currentPct.toFixed(2)}%">
        <div class="gov-marker-label">${lbl}: <span style="font-weight:700;margin-left:4px">${fmt(current)}</span></div>
      </div>
    `;
  }

  const div = document.createElement('div');
  div.className = 'gov-posbar-wrap';
  div.innerHTML = `
    <div class="gov-posbar-label">Posición relativa en ALC (${numCountries} países)</div>
    <div class="gov-posbar-track">
      ${markersHtml}
    </div>
  `;
  return div;
}

// ─── Rich E-Government index card ─────────────────────
function buildGovCard({ clsKey, org, name, year, scoreDisplay, group, groupLabel,
    rankWorld, rankALC, alcAvg, diffVsAlc, allAlc, allNames, countryName, countryIso, isCategory }) {
  const diffClass = diffVsAlc >= 0 ? 'gov-diff-positive' : 'gov-diff-negative';
  const diffStr   = diffVsAlc != null ? `${diffVsAlc >= 0 ? '+' : ''}${diffVsAlc}` : '—';

  const card = document.createElement('div');
  card.className = 'gov-card';
  card.innerHTML = `
    <div class="gov-card-header ${clsKey}">
      <div class="gov-card-score">${scoreDisplay}</div>
      <div class="gov-card-title-wrap">
        <div class="gov-card-org">${org}</div>
        <div class="gov-card-name">${name}</div>
        <div class="gov-card-year">${year}</div>
      </div>
    </div>
    <div class="gov-card-body">
      <div class="gov-card-rows">
        <span class="gov-card-row-label">Grupo ${org.split(' ')[0]}</span>
        <span></span>
        <span class="gov-group-badge">${group || '—'}</span>

        <span class="gov-card-row-label">Ranking mundial</span>
        <span></span>
        <span class="gov-card-row-val">${rankWorld != null ? `#${rankWorld}` : '—'}</span>

        <span class="gov-card-row-label">Ranking ALC</span>
        <span></span>
        <span class="gov-card-row-val">${rankALC != null ? `#${rankALC} / 26` : '—'}</span>

        <span class="gov-card-row-label">Dif. vs media ALC</span>
        <span></span>
        <span class="${diffClass}">${diffStr}</span>
      </div>
    </div>
  `;

  // Append position bar
  if (allAlc && Object.keys(allAlc).length > 0) {
    const posBar = buildPositionBar(allAlc, countryIso, countryName, alcAvg, allNames, isCategory);
    card.querySelector('.gov-card-body').appendChild(posBar);
  }
  return card;
}

// ─── Render E-Government section ─────────────────────
function renderGovSection(govData, countryName, countryIso, allAlcNames) {
  const container = document.getElementById('gov-index-cards');
  container.innerHTML = '';
  if (!govData || (!govData.egdi && !govData.gci && !govData.gtmi)) {
    document.getElementById('gov-section').style.display = 'none';
    return;
  }
  document.getElementById('gov-section').style.display = 'block';

  const egdi = govData.egdi || {};
  const gci  = govData.gci || {};
  const gtmi = govData.gtmi || {};
  const ocde = govData.ocde || {};
  const ai   = govData.ai || {};

  // ── 1. EGDI card (top-left)
  container.appendChild(buildGovCard({
    clsKey: 'egdi', org: 'NACIONES UNIDAS', name: 'E-Government Development Index (EGDI)', year: egdi.year || '2024',
    scoreDisplay: egdi.score != null ? egdi.score.toFixed(4) : '—',
    group: egdi.group, rankWorld: egdi.rankWorld, rankALC: egdi.rankALC,
    alcAvg: egdi.alcAvg, diffVsAlc: egdi.diffVsAlc, allAlc: egdi.allAlc,
    allNames: allAlcNames, countryName, countryIso, isCategory: false,
  }));

  // ── 2. GTMI card (top-right)
  const gtmiCard = buildGovCard({
    clsKey: 'gtmi', org: 'BANCO MUNDIAL', name: 'GovTech Maturity Index (GTMI)', year: gtmi.year,
    scoreDisplay: gtmi.score != null ? gtmi.score.toFixed(3) : (gtmi.group || '—'),
    group: gtmi.groupLabel, rankWorld: gtmi.rankWorld, rankALC: gtmi.rankALC,
    alcAvg: gtmi.alcAvg, diffVsAlc: gtmi.diffVsAlc, allAlc: gtmi.allAlc,
    allNames: allAlcNames, countryName, countryIso, isCategory: false,
  });

  // Append sub-indices to GTMI card body
  if (gtmi.cgsi != null) {
    const subDiv = document.createElement('div');
    subDiv.className = 'gtmi-subindices';
    const subs = [
      { key: 'cgsi', label: 'CGSI · Sistemas Básicos', val: gtmi.cgsi },
      { key: 'psdi', label: 'PSDI · Portales y Servicios', val: gtmi.psdi },
      { key: 'dcei', label: 'DCEI · Habilitadores Digitales', val: gtmi.dcei },
      { key: 'gtei', label: 'GTEI · Entorno GovTech', val: gtmi.gtei },
    ];
    subDiv.innerHTML = `
      <div class="gtmi-sub-title">Sub-índices GTMI 2025</div>
      <div class="gtmi-sub-rows">
        ${subs.map(s => {
          const pct = (s.val * 100).toFixed(0);
          return `<div class="gtmi-sub-row">
            <span class="gtmi-sub-label">${s.label}</span>
            <div class="gtmi-sub-bar-wrap"><div class="gtmi-sub-bar" style="width:${pct}%"></div></div>
            <span class="gtmi-sub-val">${s.val.toFixed(3)}</span>
          </div>`;
        }).join('')}
      </div>`;
    gtmiCard.querySelector('.gov-card-body').appendChild(subDiv);
  }
  container.appendChild(gtmiCard);

  // ── 3. GCI card (mid-left)
  container.appendChild(buildGovCard({
    clsKey: 'gci', org: 'ITU', name: 'Global Cybersecurity Index (GCI)', year: gci.year || '2024',
    scoreDisplay: gci.score != null ? gci.score.toFixed(1) : '—',
    group: gci.tier, groupLabel: gci.tierLabel, rankWorld: null, rankALC: gci.rankALC,
    alcAvg: gci.alcAvg, diffVsAlc: gci.diffVsAlc, allAlc: gci.allAlc,
    allNames: allAlcNames, countryName, countryIso, isCategory: false,
  }));

  // ── 4. OCDE card (mid-right)
  if (ocde.score != null || (ocde.allAlc && Object.keys(ocde.allAlc).length > 0)) {
    container.appendChild(buildGovCard({
      clsKey: 'ocde', org: 'OCDE / BID', name: 'Digital Government Index', year: ocde.year || '',
      scoreDisplay: ocde.score != null ? ocde.score.toFixed(3) : '—',
      group: null, rankWorld: null, rankALC: ocde.rankALC,
      alcAvg: ocde.alcAvg, diffVsAlc: ocde.diffVsAlc, allAlc: ocde.allAlc,
      allNames: allAlcNames, countryName, countryIso, isCategory: false,
    }));
  }

  // ── 5. AI Readiness card (bottom, full-width)
  if (ai.score != null || (ai.allAlc && Object.keys(ai.allAlc).length > 0)) {
    container.appendChild(buildGovCard({
      clsKey: 'ai', org: 'OXFORD INSIGHTS', name: 'Government AI Readiness Index', year: ai.year || '2023',
      scoreDisplay: ai.score != null ? ai.score.toFixed(2) : '—',
      group: null, rankWorld: null, rankALC: ai.rankALC,
      alcAvg: ai.alcAvg, diffVsAlc: ai.diffVsAlc, allAlc: ai.allAlc,
      allNames: allAlcNames, countryName, countryIso, isCategory: false,
    }));
  }


  // ── 5. Radar chart
  const egdiNorm = egdi.score ?? 0;
  const gciNorm  = (gci.score ?? 0) / 100;
  const gtmiNorm = gtmi.score ?? 0;   // already 0-1
  const ocdeNorm = ocde.score ?? 0;
  const aiNorm   = (ai.score ?? 0) / 100; // AI is 0-100

  const radarCtx = document.getElementById('govRadarChart').getContext('2d');
  if (_govRadarChart) { _govRadarChart.destroy(); _govRadarChart = null; }
  _govRadarChart = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: ['EGDI', 'GCI', 'GTMI', 'OCDE/BID', 'AI Readiness'],
      datasets: [{
        label: `${countryName}`,
        data: [egdiNorm, gciNorm, gtmiNorm, ocdeNorm, aiNorm],
        backgroundColor: 'rgba(25, 104, 188, 0.18)',
        borderColor: '#1968bc',
        pointBackgroundColor: '#1968bc',
        pointRadius: 5,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0, // Make it fully responsive without delay
      layout: {
        padding: 5
      },
      scales: {
        r: {
          min: 0, max: 1,
          ticks: { stepSize: 0.25, color: '#6b8599', font: { size: 10, weight: '500' }, backdropColor: 'transparent' },
          pointLabels: { font: { size: 13, weight: '700' }, color: '#1a2b3c' },
          grid: { color: 'rgba(0,78,112,0.1)' },
          angleLines: { color: 'rgba(0,78,112,0.15)' },
        },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { font: { size: 12 }, boxWidth: 15, color: '#1a2b3c', padding: 20 } }
      },
    },
  });
}

// ─── Render Dimensions Sub-indices block ──────────────
function renderDimensionsSection(govData, countryName, allNamesMap) {
  const section = $('#gov-dimensions-section');
  if (!section) return;
  section.style.display = 'block';

  const tabs = $$('.dim-tab');
  const content = $('#gov-dim-content');
  const empty = $('#gov-dim-empty');
  const listContainer = $('#dim-list-container');
  const indexNameLabel = $('#dim-active-index-name');

  // Sub-index labels
  const SUB_LABELS = {
    'osi': 'Servicios en línea (OSI)',
    'tii': 'Infraestructura de telecomunicaciones (TII)',
    'hci': 'Capital humano (HCI)',
    'epi': 'Participación electrónica (EPI)',
    'cgsi': 'Sistemas Básicos (CGSI)',
    'psdi': 'Portales y Servicios (PSDI)',
    'dcei': 'Habilitadores Digitales (DCEI)',
    'gtei': 'Entorno GovTech (GTEI)',
    'dd': 'Digital por diseño (DD)',
    'id': 'Impulsado por los datos (ID)',
    'gp': 'Gobierno como plataforma (GP)',
    'ad': 'Abierto por defecto (AD)',
    'iu': 'Impulsado por los usuarios (IU)',
    'pr': 'Proactividad (PR)'
  };

  function formatVal(v) {
    if (v == null) return '—';
    return v.toFixed(3);
  }

  function renderTab(tabKey) {
    // 1. Check if subindices exist
    const indexData = govData[tabKey];
    if (tabKey === 'gci' || !indexData || !indexData.subindices) {
      content.style.display = 'none';
      empty.style.display = 'block';
      if (_dimRadarChart) { _dimRadarChart.destroy(); _dimRadarChart = null; }
      return;
    }

    content.style.display = 'block';
    empty.style.display = 'none';

    const subs = indexData.subindices;
    const keys = Object.keys(subs);
    const countryScores = keys.map(k => subs[k].score ?? 0);
    const alcAvgs = keys.map(k => subs[k].alcAvg ?? 0);
    const labelNames = keys.map(k => SUB_LABELS[k] || k.toUpperCase());

    // 2. Clear old chart if exists (we don't use it anymore)
    if (_dimRadarChart) { _dimRadarChart.destroy(); _dimRadarChart = null; }

    // 3. Set index name
    let displayName = tabKey.toUpperCase();
    if (tabKey === 'ocde') displayName = 'OCDE / BID';
    indexNameLabel.textContent = displayName;

    // 4. Render Bars List
    const DIM_COLORS = ['#6b52c2', '#c64c54', '#73bda8', '#e08e36', '#3b82f6', '#ec4899'];
    let listHtml = '';

    keys.forEach((k, idx) => {
      const db = subs[k];
      const sc = db.score ?? 0;
      const av = db.alcAvg ?? 0;
      const diff = db.score != null ? (sc - av) : null;
      let diffStr = '—';
      if (diff != null) {
        // e.g., +0,141 -> Format slightly differently from global numbers if needed 
        // to match mockup we use commas instead of dots if possible, 
        // but formatVal gives dots. Let's use dots for now or replace.
        const dFmt = Math.abs(diff).toFixed(3).replace('.', ',');
        diffStr = diff >= 0 ? `+${dFmt}` : `-${dFmt}`;
      }
      
      const scStr = formatVal(sc).replace('.', ',');
      const avStr = formatVal(av).replace('.', ',');
      const rankStr = db.rankALC || '—';
      const color = DIM_COLORS[idx % DIM_COLORS.length];

      listHtml += `
        <div class="dim-row">
          <div class="dim-row-header">
            <div class="dim-row-title" style="color: ${color}">
              <span class="dim-dot">●</span> ${idx+1} ${SUB_LABELS[k].split(' (')[0]} <span class="dim-row-title-acc">(${k.toUpperCase()})</span>
            </div>
            <div class="dim-row-score-box">
              <div class="dim-row-score" style="color: ${color}">${scStr}</div>
              <div class="dim-row-rank">#${rankStr}</div>
            </div>
          </div>
          <div class="dim-row-bar-wrap">
            <div class="dim-row-bar-track"></div>
            <div class="dim-row-bar-fill" style="width: ${(sc * 100).toFixed(1)}%; background-color: ${color}"></div>
          </div>
          <div class="dim-row-footer">
            ALC ${avStr} · Δ ${diffStr} · #${rankStr}/26
          </div>
        </div>
      `;
    });
    
    listContainer.innerHTML = listHtml;
  }

  // Set up tab listeners
  tabs.forEach(t => {
    // Only bind once
    t.onclick = () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      renderTab(t.dataset.index);
    };
  });

  // Render initial active tab
  const activeTab = document.querySelector('.dim-tab.active');
  if (activeTab) renderTab(activeTab.dataset.index);
}


// ─── Render country info panel ────────────────────────
function renderCountryInfo(country) {
  $('#info-flag').textContent   = country.flag;
  $('#info-name').textContent   = country.name;
  $('#info-capital').textContent = country.capital;
  $('#info-currency').textContent = `${country.currency} (${country.currencyCode})`;
  $('#info-exchange').textContent = formatExchangeRate(country.exchangeRate, country.currencyCode);
  $('#info-domain').textContent  = country.domain;
  $('#info-timezone').textContent = country.timezone;

  // Update clock immediately, then every second
  updateClock(country.timezone);
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => updateClock(country.timezone), 1000);

  countryInfo.classList.remove('hidden');
}

// ─── Render country banner ────────────────────────────
function renderBanner(country) {
  // ISO2 code for flag CDN (derive from ISO3)
  const iso2Map = {
    ARG:'ar',BOL:'bo',BRA:'br',CHL:'cl',COL:'co',CRI:'cr',DOM:'do',
    ECU:'ec',SLV:'sv',GTM:'gt',HTI:'ht',HND:'hn',JAM:'jm',MEX:'mx',NIC:'ni',
    PAN:'pa',PRY:'py',PER:'pe',TTO:'tt',URY:'uy',VEN:'ve',GUY:'gy',SUR:'sr',BLZ:'bz',
    BHS:'bs',BRB:'bb'
  };
  const iso2 = iso2Map[country.iso3] || 'xx';
  bannerFlag.src = `https://flagcdn.com/w160/${iso2}.png`;
  bannerFlag.alt = `Bandera de ${country.name}`;
  bannerName.textContent = country.name;
  countryBanner.classList.remove('hidden');
}

function updateClock(timezone) {
  $('#info-time').textContent = formatTime(timezone);
}

// ─── UI states ─────────────────────────────────────────
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

// ─── Load country data ────────────────────────────────
async function loadCountry(iso) {
  if (!iso) return;
  selectedIso = iso;

  // Sync dropdown
  selectEl.value = iso;

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
    // Add ALC name map for tooltips
    const allNamesMap = {};
    if (countries) { // Assuming 'countries' is the global list of all ALC countries
      countries.forEach(c => allNamesMap[c.iso3] = c.name);
      renderGovSection(data.govData, data.country.name, data.country.iso3, allNamesMap);
      renderDimensionsSection(data.govData, data.country.name, allNamesMap);
    } else {
      renderGovSection(data.govData, data.country.name, data.country.iso3, {});
    }
  } catch (err) {
    console.error(err);
    showError('No se pudieron obtener los datos. Inténtalo de nuevo.');
  }
}

// ─── D3 Map ───────────────────────────────────────────
async function initMap() {
  try {
    const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
    const allCountries = topojson.feature(world, world.objects.countries);

    const latamIds = new Set(Object.keys(COUNTRY_COLORS));

    // Separate LATAM vs rest (for context)
    const latamFeatures = allCountries.features.filter(f => latamIds.has(String(f.id)));
    const contextFeatures = allCountries.features.filter(f => {
      const id = String(f.id);
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
      .attr('data-id', d => String(d.id))
      .style('fill', d => COUNTRY_COLORS[String(d.id)] || '#2c5282')
      .on('click', (event, d) => {
        const numId = String(d.id);
        const iso = numericToIso[numId];
        if (iso) loadCountry(iso);
      });

    // Labels
    svg.selectAll('.country-label')
      .data(latamFeatures)
      .join('text')
      .attr('class', d => {
        const cfg = LABEL_CONFIG[String(d.id)];
        return `country-label${cfg && cfg.small ? ' small-label' : ''}`;
      })
      .attr('x', d => {
        const c = path.centroid(d);
        const cfg = LABEL_CONFIG[String(d.id)];
        return c[0] + (cfg ? cfg.dx : 0);
      })
      .attr('y', d => {
        const c = path.centroid(d);
        const cfg = LABEL_CONFIG[String(d.id)];
        return c[1] + (cfg ? cfg.dy : 0);
      })
      .text(d => COUNTRY_NAMES_ES[String(d.id)] || '');

  } catch (err) {
    console.error('Error loading map:', err);
    mapPlaceholder.innerHTML = '<p style="color:#f87171">Error al cargar el mapa</p>';
  }
}

// ─── Highlight country on map ─────────────────────────
function highlightCountry(iso) {
  // Remove previous selection
  $$('.country-path.selected').forEach(el => el.classList.remove('selected'));
  // Find the country path by numericId
  const country = countries.find(c => c.iso3 === iso);
  if (!country) return;
  const pathEl = $(`[data-id="${country.numericId}"]`);
  if (pathEl) pathEl.classList.add('selected');
}

// ─── Initialize ────────────────────────────────────────
async function init() {
  // Load country list
  try {
    const res = await fetch('/api/countries');
    countries = await res.json();

    // Build numeric → ISO mapping
    countries.forEach(c => {
      numericToIso[c.numericId] = c.iso3;
    });

    // Populate dropdown
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.iso3;
      opt.textContent = `${c.flag}  ${c.name}`;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading country list:', err);
  }

  // Events
  selectEl.addEventListener('change', e => loadCountry(e.target.value));

  // Init map
  await initMap();
}

init();
