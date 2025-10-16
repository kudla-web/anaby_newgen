export const ENDPOINTS = {
  TOP:      "https://primary-production-e1615.up.railway.app/webhook/TOPAKCIE",
  SEARCH:   "https://primary-production-e1615.up.railway.app/webhook/stock-search-name",
  GET:      "https://primary-production-e1615.up.railway.app/webhook/get",
  ANALYSIS: "https://primary-production-e1615.up.railway.app/webhook/Analysis",
};

function sidHeader() {
  const sid = localStorage.getItem('sessionID') || '';
  return sid ? { 'X-Session-ID': sid } : {};
}

export async function apiGetTop({ limit = 50, offset = 0, exchange } = {}) {
  const url = new URL(ENDPOINTS.TOP);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (exchange && exchange !== 'ALL') url.searchParams.set('exchange', exchange);

  const r = await fetch(url.toString(), { headers: { 'Content-Type':'application/json', ...sidHeader() } });
  const j = await r.json().catch(()=>[]);
  return Array.isArray(j) ? j : (j?.data || []);
}

export async function apiSearch({ name, limit = 50, offset = 0, exchange } = {}) {
  const body = { name, limit, offset };
  if (exchange && exchange !== 'ALL') body.exchange = exchange;
  const r = await fetch(ENDPOINTS.SEARCH, {
    method:'POST', headers:{ 'Content-Type':'application/json', ...sidHeader() },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(()=>[]);
  return Array.isArray(j) ? j : (j?.data || []);
}

export async function apiGetSymbol(symbol) {
  const body = { symbol, sessionID: localStorage.getItem('sessionID') || '' };
  const r = await fetch(ENDPOINTS.GET, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

export async function apiAnalysis({ symbol, name }) {
  const body = { symbol, name, sessionID: localStorage.getItem('sessionID') || '' };
  const r = await fetch(ENDPOINTS.ANALYSIS, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
