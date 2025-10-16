export function getSessionId() {
  const urlParams = new URLSearchParams(location.search);
  const fromUrl = urlParams.get('sessionID');
  if (fromUrl) localStorage.setItem('sessionID', fromUrl);
  return localStorage.getItem('sessionID') || '';
}

export const fmtUSD = new Intl.NumberFormat('cs-CZ', { style:'currency', currency:'USD', maximumFractionDigits:2 });

export function tryFormatTimestamp(ts){
  if(!ts) return null;
  let d = null;
  if(typeof ts === 'number'){ d = new Date(ts < 1e12 ? ts*1000 : ts); }
  else{
    const p = Date.parse(ts);
    if(!Number.isNaN(p)) d = new Date(p);
  }
  return d ? d.toLocaleString('cs-CZ', { hour12:false }) : null;
}

export function renderTradingViewChart(symbol){
  const el = document.getElementById('chart');
  if (!el || !window.TradingView) return;
  el.innerHTML = '';
  new window.TradingView.widget({
    autosize:true, symbol, interval:'D', timezone:'Etc/UTC',
    theme:'dark', style:'1', locale:'en', toolbar_bg:'#1A1B1E',
    enable_publishing:false, allow_symbol_change:true, container_id:'chart'
  });
}

export function renderChange(val, el){
  el?.classList?.remove('positive','negative');
  const n = parseFloat(val);
  if (Number.isNaN(n)) { if(el) el.textContent = '—'; return; }
  if (n < 0){ el.textContent = `⬇️ ${n.toFixed(2)}%`; el.classList.add('negative'); }
  else      { el.textContent = `⬆️ ${n.toFixed(2)}%`; el.classList.add('positive'); }
}

export function splitBullets(text){
  if(!text) return [];
  const cleaned = String(text).replace(/\r/g,'').trim();
  const parts = cleaned.split(/\n|;|•|(?:^|\s)[\-–]\s/g).map(s=>s.trim()).filter(s=>s && s.length>1);
  return [...new Set(parts)];
}

export const num = (v)=>{ const n = Number(v); return Number.isFinite(n) ? n : NaN; };
export function readRating(obj){
  const cand = [obj?.investureRating, obj?.rating, obj?.ai_score, obj?.aiScore, obj?.score];
  for (const c of cand){ const n = num(c); if(!Number.isNaN(n)) return n; }
  return NaN;
}
export const fmt1 = (n)=> Number.isFinite(n) ? n.toFixed(1) : '—';
