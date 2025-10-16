// /public/js/main.js
import { loadIncludes } from './shared/includes.js';

function showErrorBanner(msg){
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#7f1d1d;color:#fff;padding:8px 12px;z-index:99999;font:14px/1.4 Inter,system-ui';
  div.textContent = msg;
  document.body.appendChild(div);
}

function showTab(id, btn){
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');

  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll(`.tab-button[data-tab="${id}"]`).forEach(b => b.classList.add('active'));
  }
}
window.__showTab = showTab;

async function init(){
  try {
    await loadIncludes(); // 1) vlož partialy (teprve pak existují prvky v DOM)

    // 2) Topbar: delegace
    document.body.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-button');
      if (btn?.dataset.tab) showTab(btn.dataset.tab, btn);

      if (e.target.closest('#goHomeLink')) {
        e.preventDefault();
        location.href = location.pathname.replace(/[^/]*$/, 'index.html');
      }
      if (e.target.closest('#userMenuBtn')) {
        document.getElementById('userMenu')?.classList.toggle('hidden');
      }
    });

    // 3) Načti feature moduly
    const [{ initUndervalued }, { initAnalysis, openAnalysis }] = await Promise.all([
      import('./features/undervalued.js'),
      import('./features/analysis.js'),
    ]);
    window.openAnalysis = openAnalysis;

    // 4) Inicializace obou podsystémů
    initUndervalued();
    initAnalysis();

    // 5) Výchozí tab
    const url = new URL(location.href);
    const hasSymbol = url.searchParams.get('symbol') || url.searchParams.get('q');
    showTab(hasSymbol ? 'analyza' : 'podhodnocene');

  } catch (e) {
    console.error('App init error:', e);
    showErrorBanner('Nepodařilo se spustit aplikaci — otevři konzoli pro detail chyby.');
  }
}

init();
