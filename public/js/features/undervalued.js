// /public/js/features/undervalued.js
import { apiGetTop, apiSearch } from '../shared/api.js';
import { getSessionId, readRating } from '../shared/utils.js';

let exchangeFilter = 'ALL';
let currentData = [];
let currentSort = { key:'rating', dir:-1 };
let cachedTop = [];
let aborter = null;

const listBox = () => document.querySelector('#akcie-container');
const loadingRow = (text='Načítání…') => { listBox().innerHTML = `<div class="glass-sub p-4 text-center rounded-xl">${text}</div>`; };

function updateAsOf(ts){
  const el = document.getElementById('asof');
  if(!el) return;
  try{ el.textContent = (ts?new Date(ts):new Date()).toLocaleString('cs-CZ'); }
  catch{ el.textContent = '—'; }
}

/* ===== helpers ===== */
const fmtPrice = (n)=> Number.isFinite(Number(n)) ? '$'+Number(n).toFixed(2) : '—';
function changeView(n){
  const x = Number(n);
  if (!Number.isFinite(x)) return { text:'—', cls:'', icon:'' };
  const up = x >= 0;
  const icon = up
    ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M4 14l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M4 10l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return { text:`${up?'+':''}${Math.abs(x).toFixed(2)}%`, cls: up?'up':'down', icon };
}
function riskView(v){
  const x = Number(v);
  if (!Number.isFinite(x)) return {label:'Střední', cls:'risk-mid'};
  if (x < 40) return {label:'Nízké', cls:'risk-low'};
  if (x < 70) return {label:'Střední', cls:'risk-mid'};
  if (x < 90) return {label:'Vysoké', cls:'risk-high'};
  return {label:'Extrémní', cls:'risk-extreme'};
}
function formatMarketCap(n){
  n = Number(n);
  if (!Number.isFinite(n) || n<=0) return '—';
  const units = [['T',1e12],['B',1e9],['M',1e6],['K',1e3]];
  for (const [u,v] of units) if (n>=v) return (n/v).toFixed(1).replace(/\.0$/,'')+u;
  return n.toLocaleString();
}

/* ===== row template ===== */
function rowTemplate(s){
  const rating = readRating(s);
  const ch = changeView(s.changesPercentage);
  const risk = riskView(s.risk);

  return `
<div class="row-card" data-symbol="${s.symbol || ''}">
  <div class="row-left">
    <div class="row-symbol">${s.symbol ?? '—'}</div>
    <div class="row-score">${Number.isFinite(rating) ? Math.round(rating) : '—'}</div>
    <div class="row-name">${s.name ?? '—'}</div>
  </div>

  <div class="row-right">
    <div class="m-box">
      <div class="m-label">Cena</div>
      <div class="m-value">${fmtPrice(s.price)}</div>
    </div>

    <div class="m-box">
  <div class="m-label"></div>
  <div class="m-value change ${ch.cls}">${ch.icon}${ch.text}</div>
</div>


    <div class="m-box">
      <div class="m-label">Rizikovost</div>
      <div class="m-value"><span class="risk-tag ${risk.cls}">${risk.label}</span></div>
    </div>

    <div class="m-box">
      <div class="m-label">Tržní kap.</div>
      <div class="m-value">${formatMarketCap(s.marketCap)}</div>
    </div>

    <div class="m-box">
      <div class="m-label">Burza</div>
      <div class="m-value m-value-ex">${s.exchange || '—'}</div>
    </div>

    <div class="row-chevron" aria-hidden="true">
      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>
</div>`;
}

function renderRows(data){
  if(!data || !data.length){
    loadingRow('Žádná data'); window.updateAiQuickPicks?.([]); return;
  }
  listBox().innerHTML = data.map(rowTemplate).join('');

  // click -> open analysis
  document.querySelectorAll('#akcie-container .row-card').forEach(card=>{
    const symbol = card.dataset.symbol;
    if (symbol) card.addEventListener('click', ()=> window.openAnalysis?.(symbol));
  });

  window.updateAiQuickPicks?.(data);
  updateAsOf();
}

/* ===== sorting (beze změn) ===== */
function applySort(){
  const map = {
    symbol:'symbol', name:'name', price:'price', change:'changesPercentage',
    volume:'volume', rating:'investureRating'
  };
  const key = map[currentSort.key];
  if(!key) return;

  const numeric = new Set(['price','changesPercentage','volume','investureRating']);
  const isNum = numeric.has(key);

  currentData.sort((a,b)=>{
    let va = a[key], vb = b[key];
    if(key === 'investureRating'){ va = readRating(a); vb = readRating(b); }
    if (va==null && vb==null) return 0;
    if (va==null) return 1;
    if (vb==null) return -1;
    return (isNum ? (Number(va)-Number(vb)) : String(va).localeCompare(String(vb))) * currentSort.dir;
  });
}
function markSortPills(){
  document.querySelectorAll('.sort-pill').forEach(p=>{
    p.classList.toggle('active', p.dataset.sort === currentSort.key);
  });
}
export function setSort(key){
  if (currentSort.key === key) currentSort.dir = -currentSort.dir;
  else {
    currentSort.key = key;
    currentSort.dir = (key === 'name' || key === 'symbol') ? 1 : -1;
  }
  applySort(); renderRows(currentData); markSortPills();
}
window.setSort = setSort;

/* ===== hints/keyboard + data flow (zůstává) ===== */
function debounce(fn, delay=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), delay); }; }
function renderHintExamples(list){
  const box = document.getElementById('hintExamples'); if(!box) return;
  box.innerHTML = '';
  const items = (list && list.length ? list : currentData).slice(0,6);
  items.forEach(s=>{
    const btn = document.createElement('button');
    btn.textContent = `${s.symbol || '—'}`;
    btn.title = s.name || s.symbol || '';
    btn.addEventListener('click', ()=> {
      const inp = document.getElementById('search-akcie');
      if (inp) { inp.value = s.symbol || ''; inp.dispatchEvent(new Event('input', {bubbles:true})); }
      document.getElementById('search-hints')?.classList.add('hidden');
    });
    box.appendChild(btn);
  });
}
async function fetchTop(){
  try{
    const list = await apiGetTop({ limit:50, offset:0, exchange:exchangeFilter });
    cachedTop = list.slice(); currentData = list.slice();
    applySort(); renderRows(currentData); markSortPills();
    renderHintExamples(list);
  }catch(e){ console.error(e); loadingRow('Chyba při načítání'); }
}
async function fetchSearch(query, signal){
  const list = await apiSearch({ name: query, limit:50, offset:0, exchange:exchangeFilter });
  currentData = Array.isArray(list) ? list : (list?.data || []);
  applySort(); renderRows(currentData); markSortPills();
}
export function initUndervalued(){
  getSessionId();

  const input = document.getElementById('search-akcie');
  const clearBtn = document.getElementById('clear-search');

  const onSearch = debounce(async ()=>{
    const q = input?.value?.trim() || '';
    if(aborter) aborter.abort(); aborter = new AbortController();

    const status = document.querySelector('#hintStatus .hint-status');
    if (status) status.innerHTML = q.length < 2 ? 'Napiš alespoň <strong>2 znaky</strong>…' : 'Hledám shody…';

    if(q.length < 2){
      if (cachedTop.length){ currentData = cachedTop.slice(); applySort(); renderRows(currentData); markSortPills(); }
      else { loadingRow(); await fetchTop(); }
      return;
    }
    loadingRow();
    try{ await fetchSearch(q, aborter.signal); }
    catch(e){ if(e.name!=='AbortError'){ console.error(e); renderRows(currentData?.length ? currentData : cachedTop); } }
  }, 300);

  input?.addEventListener('focus', ()=>{
    document.getElementById('search-hints')?.classList.remove('hidden');
    renderHintExamples(cachedTop);
  });
  input?.addEventListener('blur', ()=>{ setTimeout(()=>document.getElementById('search-hints')?.classList.add('hidden'), 120); });
  input?.addEventListener('input', onSearch);

  clearBtn?.addEventListener('click', async ()=>{
    if (input) input.value = '';
    document.getElementById('search-hints')?.classList.add('hidden');
    if (cachedTop.length){ currentData = cachedTop.slice(); applySort(); renderRows(currentData); markSortPills(); }
    else { loadingRow(); await fetchTop(); }
  });

  document.addEventListener('keydown', (e)=>{
    if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
      const el = document.getElementById('search-akcie');
      if (document.activeElement !== el) { e.preventDefault(); el?.focus(); document.getElementById('search-hints')?.classList.remove('hidden'); }
    }
    if (e.key === 'Escape') {
      document.getElementById('search-hints')?.classList.add('hidden');
      if (document.activeElement === input) input.blur();
    }
  });

  document.querySelectorAll('.exchip').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      document.querySelectorAll('.exchip').forEach(b=>{
        b.classList.remove('active'); b.setAttribute('aria-pressed','false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');

      exchangeFilter = btn.dataset.ex || 'ALL';
      const q = input?.value?.trim() || '';
      loadingRow('Načítání…');
      try{
        if(q.length >= 2){
          if (aborter) aborter.abort(); aborter = new AbortController();
          await fetchSearch(q, aborter.signal);
        }else{
          await fetchTop();
        }
        renderHintExamples(cachedTop);
      }catch(e){ console.error(e); loadingRow('Chyba při načítání'); }
    });
  });
  const activeChip = document.querySelector('.exchip.active');
  document.querySelectorAll('.exchip').forEach(b=> b.setAttribute('aria-pressed', b===activeChip ? 'true' : 'false'));

  // legal chip
  (() => {
    const KEY = 'legal_chip_hidden_v1';
    const chip = document.getElementById('legalChip');
    const x = document.getElementById('legalChipX');
    if (localStorage.getItem(KEY) === '1') chip?.remove();
    x?.addEventListener('click', ()=>{ chip?.remove(); localStorage.setItem(KEY,'1'); });
  })();

  loadingRow(); fetchTop();
}
