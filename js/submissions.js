// ============================================================
//  PureForm — Submissions Logic
// ============================================================

import { db } from "./firebase-config.js";
import { isDemoMode, requireAuth, bindLogout, setActiveSidebarLink } from "./auth.js";
import { formatDate, exportCSV, showToast, debounce, MOCK_FORMS, MOCK_SUBMISSIONS } from "./utils.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

requireAuth(async () => {
  bindLogout();
  setActiveSidebarLink();
  await loadData();
  bindUI();
});

const PAGE_SIZE = 15;
let allData     = [];
let filtered    = [];
let currentPage = 1;

async function loadData() {
  let subs = [];
  let forms = [];

  if (isDemoMode()) {
    subs = MOCK_SUBMISSIONS;
    forms = MOCK_FORMS;
  } else {
    const [subsSnap, formsSnap] = await Promise.all([
      getDocs(query(collection(db, "submissions"), orderBy("submittedAt", "desc"))),
      getDocs(collection(db, "forms"))
    ]);
    subs = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    forms = formsSnap.docs;
  }

  allData = subs;

  // Populate form filter
  const formMap = {};
  if (isDemoMode()) {
    forms.forEach(f => { formMap[f.id] = f.title; });
  } else {
    forms.forEach(d => { formMap[d.id] = d.data().title || d.id; });
  }
  const sel = document.getElementById("formFilter");
  Object.entries(formMap).forEach(([id, title]) => {
    const opt = document.createElement("option");
    opt.value = id; opt.textContent = title;
    sel.appendChild(opt);
  });

  filtered = [...allData];
  render();
}

function render() {
  const tbody      = document.getElementById("tableBody");
  const start      = (currentPage - 1) * PAGE_SIZE;
  const pageItems  = filtered.slice(start, start + PAGE_SIZE);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          <h3>Sin respuestas</h3>
          <p>Aún no hay respuestas para los filtros seleccionados</p>
        </div>
      </td></tr>`;
    renderPagination(0);
    return;
  }

  tbody.innerHTML = pageItems.map(s => {
    const fields = s.data ? Object.keys(s.data).length : 0;
    return `
      <tr>
        <td><span style="font-weight:600;">${s.formTitle || "—"}</span></td>
        <td style="color:var(--gray-light);font-size:0.8rem;">${formatDate(s.submittedAt)}</td>
        <td><span class="badge badge--active">${fields} campos</span></td>
        <td>
          <button class="btn btn--ghost btn--sm" data-id="${s.id}">Ver →</button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-id]").forEach(btn => {
    btn.addEventListener("click", () => viewSubmission(btn.dataset.id));
  });

  renderPagination(filtered.length);
}

function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const pg    = document.getElementById("pagination");
  if (pages <= 1) { pg.innerHTML = ""; return; }

  pg.innerHTML = Array.from({ length: pages }, (_, i) => `
    <button class="page-btn ${i + 1 === currentPage ? "page-btn--active" : ""}" data-page="${i + 1}">${i + 1}</button>
  `).join("");

  pg.querySelectorAll(".page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page);
      render();
    });
  });
}

function viewSubmission(id) {
  const s = allData.find(x => x.id === id);
  if (!s) return;

  document.getElementById("modalTitle").textContent = s.formTitle || "Respuesta";
  const body = document.getElementById("modalBody");

  if (!s.data || Object.keys(s.data).length === 0) {
    body.innerHTML = `<p style="color:var(--gray-light);">Sin datos registrados.</p>`;
  } else {
    body.innerHTML = `
      <p style="font-size:0.78rem;color:var(--gray-light);margin-bottom:16px;">${formatDate(s.submittedAt)}</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${Object.entries(s.data).map(([k, v]) => `
          <div>
            <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-light);margin-bottom:4px;">${k}</div>
            <div style="font-size:0.9rem;font-weight:500;background:var(--black-mid);padding:10px 12px;border-radius:8px;border:1px solid var(--gray-border);">${v || "—"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  document.getElementById("viewModal").classList.add("show");
}

function bindUI() {
  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("viewModal").classList.remove("show");
  });

  document.getElementById("searchInput").addEventListener("input", debounce(applyFilters, 250));
  document.getElementById("formFilter").addEventListener("change", applyFilters);

  document.getElementById("exportBtn").addEventListener("click", () => {
    if (filtered.length === 0) { showToast("Sin datos para exportar", "error"); return; }
    const rows = filtered.map(s => ({
      Formulario: s.formTitle || "",
      Fecha:      formatDate(s.submittedAt),
      ...s.data
    }));
    exportCSV(rows, "pureform-respuestas.csv");
    showToast("CSV exportado correctamente", "success");
  });

  document.getElementById("viewModal").addEventListener("click", e => {
    if (e.target === document.getElementById("viewModal"))
      document.getElementById("viewModal").classList.remove("show");
  });
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const formId = document.getElementById("formFilter").value;

  filtered = allData.filter(s => {
    const matchForm   = !formId || s.formId === formId;
    const matchSearch = !search
      || (s.formTitle || "").toLowerCase().includes(search)
      || JSON.stringify(s.data || {}).toLowerCase().includes(search);
    return matchForm && matchSearch;
  });

  currentPage = 1;
  render();
}
