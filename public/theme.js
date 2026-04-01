/**
 * Traami theme system — include on every page
 * Injects CSS variables, theme picker button, and panel
 */
;(function() {
  // ── 1. Inject theme CSS into <head> ───────────────────
  const css = `
:root{
  --bg:#0f172a;--text:#e2e8f0;--sub:#94a3b8;--card:#1e293b;--border:#334155;
  --muted:#64748b;--brand:#4f46e5;--brand2:#7c3aed;
  --nav-bg:rgba(15,23,42,.97);--feat-bg:#1e293b;--how-bg:#0a0f1e;--stat-bg:#0f172a;
  --input-bg:#0f172a;--input-border:#475569;--placeholder:#94a3b8;
}
[data-theme="light"]{
  --bg:#f8fafc;--text:#0f172a;--sub:#475569;--card:#fff;--border:#e2e8f0;
  --muted:#64748b;--brand:#4f46e5;--brand2:#7c3aed;
  --nav-bg:rgba(248,250,252,.97);--feat-bg:#fff;--how-bg:#f1f5f9;--stat-bg:#f8fafc;
  --input-bg:#f8fafc;--input-border:#cbd5e1;--placeholder:#64748b;
}
[data-theme="green"]{
  --bg:#052e16;--text:#dcfce7;--sub:#86efac;--card:#14532d;--border:#166534;
  --muted:#4ade80;--brand:#16a34a;--brand2:#15803d;
  --nav-bg:rgba(5,46,22,.97);--feat-bg:#14532d;--how-bg:#022c17;--stat-bg:#052e16;
  --input-bg:#022c17;--input-border:#166534;--placeholder:#86efac;
}
[data-theme="midnight"]{
  --bg:#000;--text:#c7d2fe;--sub:#818cf8;--card:#0d0d1a;--border:#1e1b4b;
  --muted:#6366f1;--brand:#6366f1;--brand2:#4f46e5;
  --nav-bg:rgba(0,0,0,.97);--feat-bg:#0d0d1a;--how-bg:#050510;--stat-bg:#000;
  --input-bg:#050510;--input-border:#3730a3;--placeholder:#818cf8;
}
body{background:var(--bg)!important;color:var(--text)!important;transition:background .25s,color .25s}
/* Apply CSS vars to common elements on all pages */
.topbar,.topbar-nav,nav{background:linear-gradient(135deg,var(--brand),var(--brand2))!important}
input,select,textarea{background:var(--input-bg)!important;border-color:var(--input-border)!important;color:var(--text)!important}
input::placeholder,textarea::placeholder{color:var(--placeholder)!important;opacity:1}
.card,.section,.section-card{background:var(--card)!important;border-color:var(--border)!important}

/* Theme picker button */
#traamiThemeBtn{
  position:fixed;bottom:20px;left:20px;z-index:8888;
  background:var(--card);border:1px solid var(--border);
  color:var(--sub);border-radius:50px;padding:9px 14px;
  font-size:13px;font-weight:600;cursor:pointer;
  display:flex;align-items:center;gap:6px;
  box-shadow:0 4px 20px rgba(0,0,0,.35);
  transition:border-color .2s,color .2s;
  font-family:'Segoe UI',sans-serif;
}
#traamiThemeBtn:hover{border-color:var(--brand);color:var(--text)}

/* Theme picker panel */
#traamiThemePanel{
  position:fixed;bottom:64px;left:20px;z-index:8889;
  background:var(--card);border:1px solid var(--border);
  border-radius:16px;padding:14px;width:210px;
  box-shadow:0 20px 60px rgba(0,0,0,.5);
  display:none;font-family:'Segoe UI',sans-serif;
}
#traamiThemePanel.open{display:block}
#traamiThemePanel h4{
  font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:.5px;color:var(--sub);margin-bottom:10px;
}
.tt-opt{
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;border-radius:10px;cursor:pointer;
  font-size:13px;color:var(--text);transition:background .15s;
}
.tt-opt:hover,.tt-opt.active{background:rgba(79,70,229,.15)}
.tt-dot{width:16px;height:16px;border-radius:50%;flex-shrink:0;border:2px solid rgba(255,255,255,.15)}
@media(max-width:480px){
  #traamiThemePanel{left:8px;bottom:60px;width:calc(100vw - 16px)}
  #traamiThemeBtn{bottom:16px;left:12px}
}
`;

  const style = document.createElement("style")
  style.textContent = css
  document.head.appendChild(style)

  // ── 2. Inject button + panel into <body> ──────────────
  function inject() {
    const btn = document.createElement("button")
    btn.id = "traamiThemeBtn"
    btn.innerHTML = "🎨 Theme"
    btn.onclick = togglePanel
    document.body.appendChild(btn)

    const panel = document.createElement("div")
    panel.id = "traamiThemePanel"
    panel.innerHTML = `
      <h4>Choose a theme</h4>
      <div class="tt-opt" data-t="dark">
        <div class="tt-dot" style="background:#1e293b;border-color:#4f46e5"></div>Dark
      </div>
      <div class="tt-opt" data-t="light">
        <div class="tt-dot" style="background:#fff;border-color:#4f46e5"></div>White / Light
      </div>
      <div class="tt-opt" data-t="green">
        <div class="tt-dot" style="background:#14532d;border-color:#16a34a"></div>Forest Green
      </div>
      <div class="tt-opt" data-t="midnight">
        <div class="tt-dot" style="background:#0d0d1a;border-color:#6366f1"></div>Midnight Purple
      </div>`
    document.body.appendChild(panel)

    panel.querySelectorAll(".tt-opt").forEach(opt => {
      opt.addEventListener("click", () => {
        setTheme(opt.dataset.t)
        panel.classList.remove("open")
      })
    })

    // Close when clicking outside
    document.addEventListener("click", e => {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove("open")
      }
    })

    // Apply saved theme
    applyTheme(localStorage.getItem("traami_theme") || "dark")
  }

  function togglePanel() {
    document.getElementById("traamiThemePanel").classList.toggle("open")
  }

  function setTheme(t) {
    localStorage.setItem("traami_theme", t)
    applyTheme(t)
  }

  function applyTheme(t) {
    document.body.setAttribute("data-theme", t)
    const panel = document.getElementById("traamiThemePanel")
    if (!panel) return
    panel.querySelectorAll(".tt-opt").forEach(o => {
      o.classList.toggle("active", o.dataset.t === t)
    })
  }

  // Inject after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject)
  } else {
    inject()
  }

  // Apply theme immediately (before paint) to avoid flash
  const saved = localStorage.getItem("traami_theme") || "dark"
  document.documentElement.setAttribute("data-theme", saved)
})()
