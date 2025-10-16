// /public/js/shared/includes.js
export async function loadIncludes() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  const tasks = nodes.map(async (node) => {
    const path = node.getAttribute('data-include');
    if (!path) return;

    try {
      const url = new URL(path, window.location.href).toString(); // robustní vyřešení cesty
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const html = await res.text();
      node.innerHTML = html;
      node.removeAttribute('data-include');
    } catch (err) {
      console.error('include failed:', path, err);
      node.innerHTML = `<div style="padding:12px;border:1px solid #803; border-radius:10px; background:#2a0b15;">
        <div style="color:#ffd7d7; font-weight:700; margin-bottom:4px;">Nepodařilo se načíst partial</div>
        <div style="color:#ffb3b3; font-size:12px;">${path}</div>
      </div>`;
    }
  });

  await Promise.all(tasks);
}
