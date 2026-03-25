const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PATHS = [
  '/api/countries',
  '/api/indicators',
  '/api/country/ARG',
  '/api/country/ALC',
  '/api/bid-projects/ARG',
  '/api/bid-projects/ALC',
];

async function main() {
  let hasError = false;

  for (const path of PATHS) {
    try {
      const res = await fetch(`${BASE_URL}${path}`);
      if (!res.ok) {
        hasError = true;
        console.error(`${path} -> HTTP ${res.status}`);
        continue;
      }

      const body = await res.json();
      if (path === '/api/countries' && !Array.isArray(body)) {
        throw new Error('Respuesta invalida para countries');
      }
      if (path === '/api/indicators' && (!body || typeof body !== 'object')) {
        throw new Error('Respuesta invalida para indicators');
      }
      if (path.startsWith('/api/country/') && (!body.country || !body.indicators || !body.govData)) {
        throw new Error('Respuesta invalida para country');
      }
      if (path.startsWith('/api/bid-projects/') && (!Array.isArray(body.rows) || !body.searchUrl)) {
        throw new Error('Respuesta invalida para bid-projects');
      }

      console.log(`${path} -> OK`);
    } catch (err) {
      hasError = true;
      console.error(`${path} -> ${err.message}`);
    }
  }

  if (hasError) process.exitCode = 1;
}

main();
