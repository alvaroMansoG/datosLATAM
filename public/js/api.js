export async function fetchCountries() {
  const res = await fetch('/api/countries');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCountryData(iso) {
  const res = await fetch(`/api/country/${iso}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchBidProjects(iso) {
  const res = await fetch(`/api/bid-projects/${iso}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
