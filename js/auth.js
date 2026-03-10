// ============================================================
//  PureForm — Auth Guard
// ============================================================

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/** Call on every admin page to redirect unauthenticated users */
export function requireAuth(callback) {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "/login.html";
    } else {
      if (callback) callback(user);
    }
  });
}

/** Bind logout to element with id="logoutBtn" */
export function bindLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", async () => {
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
