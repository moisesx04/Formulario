// ============================================================
//  PureForm — Clients (Forms Manager) Logic
// ============================================================

import { db } from "./firebase-config.js";
import { isDemoMode, requireAuth, bindLogout, setActiveSidebarLink } from "./auth.js";
import { formatDate, copyToClipboard, showToast, debounce, MOCK_FORMS } from "./utils.js";
import {
  collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

requireAuth(async () => {
  bindLogout();
  setActiveSidebarLink();
  await loadForms();
  bindUI();
});

let allForms   = [];
let filtered   = [];
let deleteTarget = null;

async function loadForms() {
  if (isDemoMode()) {
    allForms = MOCK_FORMS;
  } else {
    const snap = await getDocs(query(collection(db, "forms"), orderBy("createdAt", "desc")));
    allForms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  filtered = [...allForms];
  render();
}

function render() {
  const tbody = document.getElementById("tableBody");

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <h3>Sin formularios</h3>
          <p>Crea tu primer formulario con el Constructor</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(f => {
    const link   = `${window.location.origin}/form.html?token=${f.token}`;
    const status = f.status || "active";
    return `
      <tr>
        <td><span style="font-weight:600;">${f.title || "Sin título"}</span></td>
        <td style="color:var(--gray-light);">${(f.fields || []).length} campos</td>
        <td><span class="badge badge--${status}">${status === "active" ? "Activo" : "Archivado"}</span></td>
        <td style="color:var(--gray-light);font-size:0.8rem;">${formatDate(f.createdAt)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn--secondary btn--sm copy-btn" data-link="${link}" title="Copiar enlace">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Enlace
            </button>
            <a href="${link}" target="_blank" class="btn btn--ghost btn--sm" title="Abrir formulario">↗</a>
            <button class="btn btn--ghost btn--sm archive-btn" data-id="${f.id}" data-status="${status}">
              ${status === "active" ? "Archivar" : "Activar"}
            </button>
            <button class="btn btn--danger btn--sm delete-btn" data-id="${f.id}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Bind copy buttons
  tbody.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => copyToClipboard(btn.dataset.link));
  });

  // Bind archive
  tbody.querySelectorAll(".archive-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleArchive(btn.dataset.id, btn.dataset.status));
  });

  // Bind delete
  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteTarget = btn.dataset.id;
      document.getElementById("deleteModal").classList.add("show");
    });
  });
}

async function toggleArchive(id, currentStatus) {
  const newStatus = currentStatus === "active" ? "archived" : "active";
  try {
    if (!isDemoMode()) {
      await updateDoc(doc(db, "forms", id), { status: newStatus });
    }
    const form = allForms.find(f => f.id === id);
    if (form) form.status = newStatus;
    applyFilters();
    showToast(`Formulario ${newStatus === "active" ? "activado" : "archivado"}${isDemoMode() ? " (Simulado)" : ""}`, "success");
  } catch (err) {
    showToast("Error al actualizar el formulario", "error");
  }
}

function bindUI() {
  document.getElementById("searchInput").addEventListener("input", debounce(applyFilters, 250));
  document.getElementById("statusFilter").addEventListener("change", applyFilters);

  const closeDeleteModal = () => {
    document.getElementById("deleteModal").classList.remove("show");
    deleteTarget = null;
  };

  document.getElementById("cancelDelete").addEventListener("click",  closeDeleteModal);
  document.getElementById("cancelDelete2").addEventListener("click", closeDeleteModal);

  document.getElementById("confirmDelete").addEventListener("click", async () => {
    if (!deleteTarget) return;
    try {
      if (!isDemoMode()) {
        await deleteDoc(doc(db, "forms", deleteTarget));
      }
      allForms = allForms.filter(f => f.id !== deleteTarget);
      closeDeleteModal();
      applyFilters();
      showToast("Formulario eliminado" + (isDemoMode() ? " (Simulado)" : ""), "success");
    } catch {
      showToast("Error al eliminar", "error");
    }
  });
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;

  filtered = allForms.filter(f => {
    const matchStatus = !status || (f.status || "active") === status;
    const matchSearch = !search || (f.title || "").toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  render();
}
