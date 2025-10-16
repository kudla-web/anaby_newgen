import { apiGetSymbol, apiAnalysis } from '../shared/api.js';
import { fmtUSD, tryFormatTimestamp, renderTradingViewChart, renderChange, splitBullets, readRating } from '../shared/utils.js';

function showAnalysisHome(){
  document.getElementById('ai-empty')?.setAttribute('style','display:block;');
  document.getElementById('ai-widget')?.setAttribute('style','display:none;');
  document.getElementById('aiBack')?.classList.add('hidden');
  const chip = document.getElementById('aiSymbolChip');
  chip?.classList.add('hidden'); if (chip) chip.textContent = '—';
  const chart = document.getElementById('chart'); if(chart) chart.innerHTML = '';
  history.replaceState({}, '', location.pathname);
}

export function updateAiQuickPicks(list){
  const box = document.getElementById('aiQuickPicks');
  if(!box) return; box.innerHTML = '';
  if(!Array.isArray(list) || !list.length) return;
  const sorted = [...list].sort((a,b)=> (readRating(b)||0) - (readRating(a)||0)).slice(0,8);
  for(const it of sorted){
    const sym = it.symbol || ''; const name = it.name || sym || '—';
    if(!sym) continue;
    const btn = document.createElement('button');
    btn.textContent = `${sym} · ${name}`.slice(0,42);
    btn.title = `${sym} — ${name}`;
    btn.onclick = ()=> openAnalysis(sym);
    box.appendChild(btn);
  }
}
window.updateAiQuickPicks = updateAiQuickPicks;

export async function openAnalysis(symbol){
  window.__showTab?.('analyza');
  await loadBasicInfo(symbol);
}
window.openAnalysis = openAnalysis;

async function loadBasicInfo(symbol){
  if(!symbol){
    const url = new URL(location.href);
    symbol = url.searchParams.get('symbol') || url.searchParams.get('q') || '';
  }
  const aiEmpty = document.getElementById('ai-empty');
  const aiWidget = document.getElementById('ai-widget');
  const loader = document.getElementById('loader');
  const info = document.getElementById('infoContainer');
  const prosConsCont = document.getElementById('prosConsContainer');
  const consCont = document.getElementById('consContainer');
  const newsCont = document.getElementById('newsContainer');
  const prosListEl = document.getElementById('prosList');
  const consListEl = document.getElementById('consList');
  const newsListEl = document.getElementById('newsList');
  const backBtn = document.getElementById('aiBack');
  const chip = document.getElementById('aiSymbolChip');

  if(!symbol){ showAnalysisHome(); return; }

  aiEmpty.style.display = 'none'; aiWidget.style.display = 'block';
  backBtn?.classList.remove('hidden'); chip?.classList.remove('hidden'); chip.textContent = symbol;

  prosConsCont.style.display = 'none'; consCont.style.display = 'none'; newsCont.style.display = 'none';
  prosListEl.innerHTML = ''; consListEl.innerHTML = ''; newsListEl.textContent = 'Analyzuji...';

  info.style.display = 'none'; loader.style.display = 'block'; loader.textContent = '🔄 Načítání dat…';

  try{
    const data = await apiGetSymbol(symbol);
    if (data.check === 'ne'){ loader.textContent = '❌ Neplatný symbol.'; return; }

    document.getElementById('nadpis_komodita').textContent = (data.name || symbol || '—').toString().toUpperCase();
    renderTradingViewChart(data.tv_symbol);

    document.getElementById('cena_komodity').textContent = fmtUSD.format(Number(data.price || 0));
    renderChange(data.zmena_den, document.getElementById('zmena_den'));

    const lastNote = document.getElementById('lastPriceNote');
    const ts = data.lastPriceTime || data.priceTimestamp || data.last_update || data.updated_at;
    const pretty = tryFormatTimestamp(ts);
    lastNote.textContent = pretty ? ('Poslední známá cena: ' + pretty) : 'Údaje mohou být opožděné (hodiny/dny).';

    const riskEl = document.getElementById('rizikovost'); riskEl.className = 'badge';
    const r = parseFloat(data.rizikovost);
    if (r < 1)      { riskEl.textContent='Nízké';    riskEl.classList.add('risk-low'); }
    else if (r < 2) { riskEl.textContent='Střední';  riskEl.classList.add('risk-medium'); }
    else if (r < 4) { riskEl.textContent='Vysoké';   riskEl.classList.add('risk-high'); }
    else            { riskEl.textContent='Extrémní'; riskEl.classList.add('risk-extreme'); }

    const riskBox = document.getElementById('riskDetails');
    const riskReasons = Array.isArray(data.riziko_duvody) ? data.riziko_duvody : [];
    riskBox.innerHTML = (riskReasons.length
      ? '<strong>Důvody rizika:</strong><br>' + riskReasons.map(x=>`<a>${x}</a>`).join(',<br>')
      : '<strong>Důvody rizika:</strong> Žádné ukazatele rizika.');

    const nadh = document.getElementById('nadhodnocenost');
    const valueBox = document.getElementById('valueDetails');
    nadh.className = 'status glass-sub';
    const nVal = parseFloat(data.nadhodnocenost);
    let text='', cls='';
    if (nVal > 1){ text='Silně nadhodnocená'; cls='nad-silne'; }
    else if (nVal > 0){ text='Nadhodnocená'; cls='nad-mirne'; }
    else if (nVal === 0){ text='V normálu'; cls='norma'; }
    else if (nVal < -1){ text='Silně podhodnocená'; cls='pod-silne'; }
    else { text='Podhodnocená'; cls='pod-mirne'; }
    nadh.textContent = text; nadh.classList.add(cls);
    const valueReasons = (data.hodnota_duvody || '').toString().trim();
    valueBox.className = 'pill-box';
    valueBox.innerHTML = valueReasons || 'Žádné výjimečné metriky.';

    const rating = readRating(data);
    const ratingBox = document.getElementById('investureRatingBox');
    if (Number.isFinite(rating)){
      ratingBox.textContent = `${Math.round(rating)}/100`;
      ratingBox.style.background = rating>=80 ? 'green' : (rating>=50 ? 'goldenrod' : 'red');
    } else { ratingBox.textContent = '—'; ratingBox.style.background = '#222'; }

    loader.style.display = 'none'; info.style.display = 'block';

    const analysis = await apiAnalysis({ symbol, name: document.getElementById('nadpis_komodita').textContent });
    const prosArr = splitBullets(analysis.pros);
    const consArr = splitBullets(analysis.cons);
    const news = (analysis.news || '').trim();

    const prosListEl2 = document.getElementById('prosList');
    const consListEl2 = document.getElementById('consList');
    prosListEl2.innerHTML = ''; consListEl2.innerHTML = '';
    if (prosArr.length){ prosArr.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; prosListEl2.appendChild(li); }); }
    else { prosListEl2.innerHTML = '<li class="muted">Zatím žádná zřejmá pozitiva.</li>'; }
    if (consArr.length){ consArr.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; consListEl2.appendChild(li); }); }
    else { consListEl2.innerHTML = '<li class="muted">Zatím žádná zřejmá negativa.</li>'; }

    document.getElementById('newsList').textContent = news || 'Bez dalších poznámek k tomuto titulu.';
    newsCont.style.display = 'block';
  }catch(e){
    console.error(e);
    loader.textContent = '⚠️ Něco se pokazilo, zkus to znovu. Neplatné přihlášení/Interní chyba';
  }
}

export function initAnalysis(){
  document.querySelector('#aiBack')?.addEventListener('click', showAnalysisHome);
  const url = new URL(location.href);
  const s = url.searchParams.get('symbol') || url.searchParams.get('q');
  if (s) openAnalysis(s);
}
