// /public/js/auth-guard.js
const SESSION_WEBHOOK = 'https://primary-production-e1615.up.railway.app/webhook/validate-session';

function getSessionIdFromAny(){
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('sessionID');
  if (fromUrl) {
    try { localStorage.setItem('sessionID', fromUrl); } catch(_) {}
    return fromUrl;
  }
  try { return localStorage.getItem('sessionID') || ''; } catch(_) { return ''; }
}

async function validateSession(sid){
  // “best effort” – když endpoint mlčí, necháme uživatele projít (stejně si API řekne o session)
  const ctl = new AbortController();
  const to = setTimeout(()=>ctl.abort(), 4500);
  try{
    const res = await fetch(SESSION_WEBHOOK, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ sessionID: sid }),
      signal: ctl.signal
    });
    const j = await res.json().catch(()=>null);
    const rotated = j?.sessionID || j?.data?.sessionID || j?.data?.id;
    if (rotated) try { localStorage.setItem('sessionID', String(rotated)); } catch(_) {}
    // když server vrátí 200 ale bez ID, session necháme – dashboard i tak funguje s lokálním sid
  }catch(_){
    // timeout / síť – neblokujeme, jen nevalidujeme
  }finally{
    clearTimeout(to);
  }
}

export async function requireValidSession(){
  const sid = getSessionIdFromAny();
  if (!sid) {
    window.location.replace('/index.html');
    throw new Error('No session');
  }
  await validateSession(sid);
}

export function logout(){
  try { localStorage.removeItem('sessionID'); } catch(_){}
  window.location.href = '/index.html';
}
