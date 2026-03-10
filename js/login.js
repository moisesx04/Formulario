// ============================================================
//  PureForm — Login Logic
// ============================================================

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const emailEl    = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn   = document.getElementById("loginBtn");
const errorEl    = document.getElementById("loginError");

// If already logged in, go to dashboard
onAuthStateChanged(auth, user => {
  if (user) window.location.href = "dashboard.html";
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add("show");
}

function hideError() {
  errorEl.classList.remove("show");
}

function setLoading(on) {
  loginBtn.disabled = on;
  loginBtn.innerHTML = on
    ? '<span class="spinner"></span> Verificando...'
    : "Entrar al Panel";
}

loginBtn.addEventListener("click", async () => {
  hideError();
  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    showError("Por favor completa todos los campos.");
    return;
  }

  setLoading(true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "dashboard.html";
  } catch (err) {
    const msgs = {
      "auth/invalid-credential":   "Correo o contraseña incorrectos.",
      "auth/user-not-found":       "No existe una cuenta con ese correo.",
      "auth/wrong-password":       "Contraseña incorrecta.",
      "auth/too-many-requests":    "Demasiados intentos. Intenta más tarde.",
      "auth/network-request-failed": "Error de red. Verifica tu conexión."
    };
    showError(msgs[err.code] || "Error al iniciar sesión. Inténtalo de nuevo.");
  } finally {
    setLoading(false);
  }
});

// Allow Enter key
[emailEl, passwordEl].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") loginBtn.click();
  });
});
