// ============================================================
//  PureForm — Auth Guard
// ============================================================

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/** Export demo status */
export function isDemoMode() {
  return sessionStorage.getItem("demo_mode") === "true";
}

/** Call on every admin page to redirect unauthenticated users */
export function requireAuth(callback) {
  const isDemo = isDemoMode();
  if (isDemo) showDemoBanner();
  
  onAuthStateChanged(auth, user => {
    if (!user && !isDemo) {
      window.location.href = "login.html";
    } else {
      // Create a mock user if in demo mode
      const finalUser = user || { email: "demo@pureform.com", displayName: "Demo User", isDemo: true };
      if (callback) callback(finalUser);
    }
  });
}

/** Bind logout to element with id="logoutBtn" */
export function bindLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", async () => {
      sessionStorage.removeItem("demo_mode");
      await signOut(auth);
      window.location.href = "login.html";
    });
  }
}

/** Highlight active sidebar link */
export function setActiveSidebarLink() {
  const page = window.location.pathname.split("/").pop();
  document.querySelectorAll(".sidebar__link").forEach(link => {
    const href = link.getAttribute("href");
    if (href === page) link.classList.add("sidebar__link--active");
  });
}

/** Show a visual indicator for Demo Mode */
function showDemoBanner() {
  const existing = document.getElementById("demo-banner");
  if (existing) return;

  const banner = document.createElement("div");
  banner.id = "demo-banner";
  banner.style.cssText = `
    position: sticky;
    top: 0;
    width: 100%;
    background: #002868;
    color: white;
    text-align: center;
    padding: 10px;
    font-size: 12px;
    font-weight: bold;
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  banner.innerHTML = `
    <span style="display:flex; align-items:center; gap:8px;">
      <span style="display:inline-block; width:8px; height:8px; background:#4CAF50; border-radius:50%; animation: pulse 2s infinite;"></span>
      Modo Demo Activa: Los cambios no se guardarán permanentemente
    </span>
    <button id="exitDemoBtn" style="background:white; color:#002868; border:none; padding:4px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:10px;">SALIR DEL DEMO</button>
    <style>
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      .sidebar { top: 40px !important; height: calc(100vh - 40px) !important; }
      .header { top: 40px !important; }
      .main-content { margin-top: 10px; }
    </style>
  `;
  document.body.prepend(banner);

  document.getElementById("exitDemoBtn").addEventListener("click", () => {
    sessionStorage.removeItem("demo_mode");
    window.location.href = "login.html";
  });
}
