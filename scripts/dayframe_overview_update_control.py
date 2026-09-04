import os
import re
from pathlib import Path


ROOT = Path("dist")


def replace_regex(path, pattern, repl, required=True):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    text, count = re.subn(pattern, repl, text)
    file_path.write_text(text, encoding="utf-8")
    if count == 0 and required:
        raise SystemExit(f"{path}: missing expected pattern: {pattern}")


def append_once(path, marker, block):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    if marker not in text:
        text = text.rstrip() + "\n\n" + block.strip() + "\n"
        file_path.write_text(text, encoding="utf-8")


build = os.environ.get("BUILD_ID", "local")

if (ROOT / "sw.js").exists():
    replace_regex(
        "sw.js",
        r"const DAYFRAME_CACHE\s*=\s*'dayframe-shell-v\d+';",
        "const DAYFRAME_CACHE = 'dayframe-shell-v103';",
        required=False,
    )
    append_once(
        "sw.js",
        "data-dayframe-skip-waiting-handler-v1",
        """
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data && data.type === 'DAYFRAME_SKIP_WAITING') self.skipWaiting();
});
""",
    )

index_path = ROOT / "index.html"
if not index_path.exists():
    raise SystemExit("dist/index.html was not found")

index_text = index_path.read_text(encoding="utf-8")
auth_success_old = """async function authSuccess(name){
  const userEl=document.getElementById('sb-user-name');if(userEl)userEl.textContent=name;
  const avatarEl=document.getElementById('sb-user-avatar');if(avatarEl)avatarEl.textContent=(name||'U')[0].toUpperCase();
  const topName=document.getElementById('df-user-name');if(topName)topName.textContent=name||'Account';
  const topAvatar=document.getElementById('df-user-avatar');if(topAvatar)topAvatar.textContent=(name||'U')[0].toUpperCase();
  authSetLoading('login',false);authSetLoading('signup',false);
  await Promise.allSettled([
    loadHubFromSupabase(),
    loadSettingsFromSupabase(),
    moneyLoadBankData(false)
  ]);
  personalHubInit(name);
  restoreT212Snapshot();
  document.getElementById('auth-screen').classList.add('hidden');
  document.documentElement.classList.remove('df-session-pending');
  moneyHandleBankCallback();
  moneyHandleBankStart();
  const t212Status=await loadT212Status();
  if(t212Status.connected)setTimeout(()=>syncT212(),450);
}"""
auth_success_new = """async function authSuccess(name){
  window.__dayframeAuthSuccessNonBlocking = true;
  const userEl=document.getElementById('sb-user-name');if(userEl)userEl.textContent=name;
  const avatarEl=document.getElementById('sb-user-avatar');if(avatarEl)avatarEl.textContent=(name||'U')[0].toUpperCase();
  const topName=document.getElementById('df-user-name');if(topName)topName.textContent=name||'Account';
  const topAvatar=document.getElementById('df-user-avatar');if(topAvatar)topAvatar.textContent=(name||'U')[0].toUpperCase();
  authSetLoading('login',false);authSetLoading('signup',false);
  personalHubInit(name);
  restoreT212Snapshot();
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.documentElement.classList.remove('df-session-pending');
  moneyHandleBankCallback();
  moneyHandleBankStart();
  Promise.allSettled([
    loadHubFromSupabase(),
    loadSettingsFromSupabase(),
    moneyLoadBankData(false)
  ]).then(()=>personalHubInit(name)).catch(e=>console.warn('Dayframe background data load failed:',e?.message||e));
  Promise.resolve()
    .then(()=>loadT212Status())
    .then(t212Status=>{if(t212Status?.connected)setTimeout(()=>syncT212(),450)})
    .catch(()=>{});
}"""
if "__dayframeAuthSuccessNonBlocking" not in index_text:
    if auth_success_old not in index_text:
        raise SystemExit("dist/index.html: authSuccess shape was not found")
    index_text = index_text.replace(auth_success_old, auth_success_new, 1)
if 'rel="preload" as="style" href="https://fonts.googleapis.com/css2' not in index_text:
    index_text = re.sub(
        r'<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="(https://fonts\.googleapis\.com/css2\?[^\"]+)")[^>]*>',
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '\n<link rel="preload" as="style" href="\\1" onload="this.onload=null;this.rel=\'stylesheet\'">'
        '\n<noscript><link rel="stylesheet" href="\\1"></noscript>',
        index_text,
        count=1,
    )
index_text = re.sub(
    r"\n?<style id=\"df-update-manager-style\">[\s\S]*?</style>\s*<script data-dayframe-update-manager[\s\S]*?</script>",
    "",
    index_text,
)

update_block = f"""
<style id="df-update-manager-style">
#df-app-update{{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:-8px 0 18px;padding:12px 14px;border:1px solid rgba(117,100,242,.16);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(255,243,250,.95));box-shadow:0 10px 26px rgba(31,37,68,.08);font-family:var(--ff,'Plus Jakarta Sans',system-ui,sans-serif);color:#151b2d}}
#df-app-update strong{{display:block;font-size:13px;font-weight:900;line-height:1.2}}
#df-app-update span{{display:block;margin-top:2px;color:#718096;font-size:12px;font-weight:700;line-height:1.35}}
#df-app-update button{{border:0;border-radius:999px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}}
#df-app-update button:disabled{{cursor:wait;opacity:.65}}
#df-app-update .df-app-update-refresh{{padding:10px 14px;background:linear-gradient(135deg,#7564f2,#ec5aa6);color:#fff;box-shadow:0 10px 20px rgba(117,100,242,.22)}}
#df-app-update .df-app-update-later{{padding:9px 11px;background:#f7f4ff;color:#6d60e8}}
#df-app-update:not([data-ready="true"]) .df-app-update-later{{display:none}}
@media (max-width:560px){{#df-app-update{{margin:0 0 14px;align-items:flex-start;display:grid;grid-template-columns:1fr auto auto}}}}
</style>
<script data-dayframe-update-manager={build!r}>
(() => {{
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  const VERSION = {build!r};
  const FLAG = 'data-dayframe-update-manager';
  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);
  let registration = null;
  let updateReady = false;
  let dismissed = false;
  let refreshing = false;
  let checkedOnce = false;
  let checking = false;
  let applying = false;
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;
  let becameVisibleAt = document.visibilityState === 'visible' ? 0 : -1;

  function safeToReloadNow() {{
    // Reload without asking when the page is hidden, was only just opened, or
    // has just been brought back to the foreground (a background resume, not
    // someone mid-task). Otherwise leave the manual banner to do the job.
    if (document.visibilityState !== 'visible') return true;
    const now = performance.now();
    if (now < 60000) return true;
    return becameVisibleAt >= 0 && (now - becameVisibleAt) < 4000;
  }}

  function autoReloadedRecently() {{
    try {{
      const at = Number(sessionStorage.getItem('dayframe_auto_reload_at') || 0);
      return at > 0 && (Date.now() - at) < 12000;
    }} catch {{ return false; }}
  }}

  function activateWaiting() {{
    const waiting = registration && registration.waiting;
    if (!waiting) return false;
    try {{ waiting.postMessage({{ type: 'DAYFRAME_SKIP_WAITING' }}); }} catch {{}}
    return true;
  }}

  function removePrompt() {{
    const node = document.getElementById('df-app-update');
    if (node) node.remove();
  }}

  function isHomeActive() {{
    return document.getElementById('pg-home')?.classList.contains('on') ||
      document.querySelector('.pg.on')?.id === 'pg-home';
  }}

  function updateMount() {{
    const home = document.getElementById('pg-home');
    if (!home) return null;
    return home.querySelector('.hub-shell') || home;
  }}

  function placePrompt(node) {{
    const mount = updateMount();
    if (!mount) return false;
    const topbar = mount.querySelector('.hub-topbar');
    if (topbar?.parentNode === mount) topbar.insertAdjacentElement('afterend', node);
    else mount.insertAdjacentElement('afterbegin', node);
    return true;
  }}

  function updateText(bar) {{
    const title = bar.querySelector('strong');
    const detail = bar.querySelector('span');
    const action = bar.querySelector('.df-app-update-refresh');
    const later = bar.querySelector('.df-app-update-later');
    bar.dataset.ready = updateReady ? 'true' : 'false';
    if (action) action.disabled = applying;
    if (later) later.disabled = applying;
    if (applying) {{
      if (title) title.textContent = 'Updating…';
      if (detail) detail.textContent = 'Clearing the old version and reloading — one moment.';
      if (action) action.textContent = 'Updating…';
      return;
    }}
    if (updateReady) {{
      if (title) title.textContent = 'Update ready';
      if (detail) detail.textContent = 'Refresh Dayframe for the newest fixes.';
      if (action) action.textContent = 'Update';
      return;
    }}
    if (checking) {{
      if (title) title.textContent = 'Checking for updates';
      if (detail) detail.textContent = 'Dayframe is looking for the newest version.';
      if (action) action.textContent = 'Checking';
      return;
    }}
    if (checkedOnce) {{
      if (title) title.textContent = 'Dayframe is up to date';
      if (detail) detail.textContent = 'This installed app has the newest files available.';
      if (action) action.textContent = 'Check again';
      return;
    }}
    if (title) title.textContent = 'Dayframe updates';
    if (detail) detail.textContent = 'Use this if the installed app looks behind.';
    if (action) action.textContent = 'Check';
  }}

  function ensurePrompt() {{
    if (dismissed || !isHomeActive()) {{
      removePrompt();
      return null;
    }}
    let bar = document.getElementById('df-app-update');
    if (bar) {{
      updateText(bar);
      placePrompt(bar);
      return bar;
    }}
    bar = document.createElement('div');
    bar.id = 'df-app-update';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<div><strong>Dayframe updates</strong><span>Use this if the installed app looks behind.</span></div><button type="button" class="df-app-update-refresh">Check</button><button type="button" class="df-app-update-later">Later</button>';
    bar.querySelector('.df-app-update-refresh')?.addEventListener('click', async () => {{
      if (updateReady) {{
        applying = true;
        ensurePrompt();
        try {{ sessionStorage.setItem('dayframe_update_reload', VERSION); }} catch {{}}
        // Belt-and-suspenders: the new service worker's own activate handler
        // already clears out old dayframe-shell-* cache entries, but that
        // only runs once it takes control. Clearing Cache Storage here too
        // means the reload below can never serve a stale cached response,
        // regardless of activation timing.
        try {{
          if (window.caches && caches.keys) {{
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k).catch(() => {{}})));
          }}
        }} catch {{}}
        const waiting = registration?.waiting;
        if (waiting) waiting.postMessage({{ type: 'DAYFRAME_SKIP_WAITING' }});
        setTimeout(() => window.location.reload(), 180);
        return;
      }}
      window.dayframeCheckForUpdate?.();
    }});
    bar.querySelector('.df-app-update-later')?.addEventListener('click', removePrompt);
    bar.querySelector('.df-app-update-later')?.addEventListener('click', () => {{ dismissed = true; }});
    updateText(bar);
    if (!placePrompt(bar)) {{
      bar.remove();
      return null;
    }}
    return bar;
  }}

  function showUpdatePrompt(reg) {{
    updateReady = true;
    registration = reg || registration;
    ensurePrompt();
  }}

  function renderUpdatePrompt() {{
    if (dismissed || !isHomeActive()) {{
      removePrompt();
      return;
    }}
    ensurePrompt();
  }}

  function watchRegistration(reg) {{
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) {{
      showUpdatePrompt(reg);
      activateWaiting();
    }}
    reg.addEventListener('updatefound', () => {{
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {{
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {{
          showUpdatePrompt(reg);
          activateWaiting();
        }}
      }});
    }});
  }}

  navigator.serviceWorker.addEventListener('controllerchange', () => {{
    if (refreshing) return;
    refreshing = true;
    let requested = false;
    try {{
      requested = sessionStorage.getItem('dayframe_update_reload') === VERSION;
      if (requested) sessionStorage.removeItem('dayframe_update_reload');
    }} catch {{}}
    // A new worker just took control.
    if (requested || (hadControllerAtLoad && !autoReloadedRecently() && safeToReloadNow())) {{
      try {{ sessionStorage.setItem('dayframe_auto_reload_at', String(Date.now())); }} catch {{}}
      window.location.reload();
      return;
    }}
    showUpdatePrompt(registration);
  }});

  document.addEventListener('visibilitychange', () => {{
    if (document.visibilityState === 'visible') becameVisibleAt = performance.now();
  }});

  function recheckOnResume() {{
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    if (!registration) return;
    registration.update().then(() => activateWaiting()).catch(() => {{}});
  }}
  document.addEventListener('visibilitychange', recheckOnResume);
  window.addEventListener('focus', recheckOnResume);

  window.dayframeCheckForUpdate = async function dayframeCheckForUpdate() {{
    if (checking) return;
    checking = true;
    ensurePrompt();
    try {{
      const reg = registration || await navigator.serviceWorker.ready;
      await reg.update();
      if (reg.waiting) showUpdatePrompt(reg);
      else checkedOnce = true;
    }} catch {{
      checkedOnce = true;
    }} finally {{
      checking = false;
      ensurePrompt();
    }}
  }};

  window.addEventListener('load', async () => {{
    try {{
      const reg = await navigator.serviceWorker.register('/sw.js', {{ updateViaCache: 'none' }});
      watchRegistration(reg);
      setTimeout(renderUpdatePrompt, 800);
      setTimeout(() => reg.update().catch(() => {{}}), 1200);
      setInterval(() => reg.update().catch(() => {{}}), 15 * 60 * 1000);
    }} catch {{}}
  }});
  document.addEventListener('click', () => setTimeout(renderUpdatePrompt, 120), true);
}})();
</script>"""

if "</body>" in index_text:
    index_text = index_text.replace("</body>", update_block + "\n</body>", 1)
else:
    index_text = index_text.rstrip() + update_block + "\n"

index_path.write_text(index_text, encoding="utf-8")
print("Dayframe overview update control applied.")
