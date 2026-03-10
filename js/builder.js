// ============================================================
//  PureForm — Form Builder Logic
// ============================================================

import { db } from "./firebase-config.js";
import { requireAuth, bindLogout, setActiveSidebarLink } from "./auth.js";
import { generateToken, showToast, copyToClipboard } from "./utils.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

requireAuth(() => {
  bindLogout();
  setActiveSidebarLink();
  initBuilder();
});

// ── Field Types Definition ─────────────────────────────────
const FIELD_TYPES = [
  { type: "text",     label: "Texto corto",  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>` },
  { type: "email",    label: "Email",        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
  { type: "tel",      label: "Teléfono",     icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>` },
  { type: "number",   label: "Número",       icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>` },
  { type: "date",     label: "Fecha",        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
  { type: "textarea", label: "Texto largo",  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>` },
  { type: "select",   label: "Desplegable",  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>` },
  { type: "checkbox", label: "Casilla",      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>` },
];

let fields          = [];
let selectedFieldId = null;
let dragType        = null;
let dragCanvasIdx   = null;

function initBuilder() {
  renderFieldTypes();
  renderCanvas();
  bindCanvasDrop();
  bindButtons();
}

// ── Render Left Panel ──────────────────────────────────────
function renderFieldTypes() {
  const container = document.getElementById("fieldTypes");
  container.innerHTML = FIELD_TYPES.map(ft => `
    <div class="field-type-item" draggable="true" data-type="${ft.type}">
      ${ft.icon} ${ft.label}
    </div>
  `).join("");

  container.querySelectorAll(".field-type-item").forEach(el => {
    el.addEventListener("dragstart", e => {
      dragType = e.currentTarget.dataset.type;
      dragCanvasIdx = null;
    });
  });
}

// ── Canvas ─────────────────────────────────────────────────
function renderCanvas() {
  const zone  = document.getElementById("dropZone");
  const empty = document.getElementById("canvasEmpty");
  const count = document.getElementById("fieldCount");

  // Remove existing field elements
  zone.querySelectorAll(".canvas-field").forEach(el => el.remove());

  if (fields.length === 0) {
    empty.style.display = "flex";
    count.textContent   = "0 campos";
    return;
  }

  empty.style.display = "none";
  count.textContent   = `${fields.length} campo${fields.length !== 1 ? "s" : ""}`;

  fields.forEach((field, idx) => {
    const el  = document.createElement("div");
    el.className  = "canvas-field" + (field.id === selectedFieldId ? " canvas-field--selected" : "");
    el.dataset.id = field.id;
    el.draggable  = true;

    el.innerHTML = `
      <div class="canvas-field__drag-handle">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <div class="canvas-field__info">
        <div class="canvas-field__label">${field.label || "Sin etiqueta"}</div>
        <div class="canvas-field__type">${getTypeLabel(field.type)}</div>
      </div>
      ${field.required ? '<span class="canvas-field__required-badge">Requerido</span>' : ''}
      <button class="canvas-field__delete" data-id="${field.id}">✕ Eliminar</button>
    `;

    el.addEventListener("click", e => {
      if (e.target.classList.contains("canvas-field__delete") || e.target.closest(".canvas-field__delete")) return;
      selectField(field.id);
    });

    el.querySelector(".canvas-field__delete").addEventListener("click", () => {
      fields = fields.filter(f => f.id !== field.id);
      if (selectedFieldId === field.id) {
        selectedFieldId = null;
        renderConfig();
      }
      renderCanvas();
    });

    // canvas reorder drag
    el.addEventListener("dragstart", e => {
      dragCanvasIdx = idx;
      dragType = null;
      e.stopPropagation();
    });

    zone.appendChild(el);
  });
}

function getTypeLabel(type) {
  const ft = FIELD_TYPES.find(f => f.type === type);
  return ft ? ft.label : type;
}

// ── Drop Handling ──────────────────────────────────────────
function bindCanvasDrop() {
  const zone = document.getElementById("dropZone");

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("drag-over");

    if (dragType) {
      // New field from left panel
      const newField = {
        id:          "field_" + Date.now(),
        type:        dragType,
        label:       getTypeLabel(dragType),
        placeholder: "",
        required:    false,
        options:     dragType === "select" ? ["Opción 1", "Opción 2"] : []
      };
      fields.push(newField);
      selectField(newField.id);
    } else if (dragCanvasIdx !== null) {
      // Reorder via touch on canvas (basic)
      // We'll just append it for now — full reorder is complex without a library
    }

    renderCanvas();
  });
}

// ── Select & Config ────────────────────────────────────────
function selectField(id) {
  selectedFieldId = id;
  renderCanvas();
  renderConfig();
}

function renderConfig() {
  const panel = document.getElementById("configPanel");
  const field = fields.find(f => f.id === selectedFieldId);

  if (!field) {
    panel.innerHTML = `
      <div class="config-empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        <p>Selecciona un campo para configurarlo</p>
      </div>
    `;
    return;
  }

  const optionsSection = field.type === "select" ? `
    <div class="form-group">
      <label class="form-label">Opciones (una por línea)</label>
      <textarea class="form-control" id="cfgOptions" rows="4">${(field.options || []).join("\n")}</textarea>
    </div>
  ` : "";

  panel.innerHTML = `
    <div class="config-form">
      <div class="form-group">
        <label class="form-label">Etiqueta del campo</label>
        <input class="form-control" id="cfgLabel" type="text" value="${field.label}" placeholder="Ej: Nombre completo"/>
      </div>
      <div class="form-group">
        <label class="form-label">Placeholder</label>
        <input class="form-control" id="cfgPlaceholder" type="text" value="${field.placeholder}" placeholder="Texto de ayuda..."/>
      </div>
      ${optionsSection}
      <label class="form-checkbox">
        <input type="checkbox" id="cfgRequired" ${field.required ? "checked" : ""}/>
        <span>Campo requerido</span>
      </label>
    </div>
  `;

  document.getElementById("cfgLabel").addEventListener("input", e => {
    field.label = e.target.value;
    renderCanvas();
  });
  document.getElementById("cfgPlaceholder").addEventListener("input", e => {
    field.placeholder = e.target.value;
  });
  document.getElementById("cfgRequired").addEventListener("change", e => {
    field.required = e.target.checked;
    renderCanvas();
  });
  if (field.type === "select") {
    document.getElementById("cfgOptions").addEventListener("input", e => {
      field.options = e.target.value.split("\n").filter(l => l.trim());
    });
  }
}

// ── Save ───────────────────────────────────────────────────
function bindButtons() {
  document.getElementById("saveBtn").addEventListener("click", saveForm);
  document.getElementById("previewBtn").addEventListener("click", previewForm);
  document.getElementById("closeLinkModal").addEventListener("click", () => {
    document.getElementById("linkModal").classList.remove("show");
  });
  document.getElementById("copyLinkBtn").addEventListener("click", () => {
    const link = document.getElementById("generatedLink").value;
    copyToClipboard(link);
  });
}

async function saveForm() {
  const title = document.getElementById("formTitle").value.trim();

  if (!title) { showToast("Escribe un nombre para el formulario", "error"); return; }
  if (fields.length === 0) { showToast("Agrega al menos un campo", "error"); return; }

  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Guardando...';

  try {
    const token = generateToken();
    await addDoc(collection(db, "forms"), {
      title,
      fields,
      token,
      status: "active",
      createdAt: serverTimestamp()
    });

    const link = `${window.location.origin}/form.html?token=${token}`;
    document.getElementById("generatedLink").value = link;
    document.getElementById("openLinkBtn").href     = link;
    document.getElementById("linkModal").classList.add("show");

    showToast("Formulario guardado exitosamente", "success");
    fields = []; selectedFieldId = null;
    document.getElementById("formTitle").value = "";
    renderCanvas();
    renderConfig();
  } catch (err) {
    console.error(err);
    showToast("Error al guardar. Verifica la configuración de Firebase.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar y Generar Enlace`;
  }
}

function previewForm() {
  const title = document.getElementById("formTitle").value.trim() || "Vista Previa";
  if (fields.length === 0) { showToast("Agrega campos para ver la vista previa", "error"); return; }

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>${title} — Vista Previa</title>
  <link rel="stylesheet" href="${window.location.origin}/css/styles.css"/></head>
  <body class="portal-bg" style="padding:40px 20px;">
  <div class="portal-card" style="max-width:640px;margin:0 auto;">
    <h2 class="portal-card__title">${title}</h2>
    <p class="portal-card__desc">Vista previa del formulario</p>
    <div class="portal-form">
      ${fields.map(f => renderFieldPreview(f)).join("")}
    </div>
    <div style="margin-top:24px;"><button class="btn btn--primary w-full" style="justify-content:center;padding:14px;" disabled>Enviar</button></div>
  </div>
  </body></html>`);
  win.document.close();
}

function renderFieldPreview(f) {
  const req = f.required ? '<span style="color:#ff4545;margin-left:4px;">*</span>' : "";
  if (f.type === "textarea") return `<div class="form-group"><label class="form-label">${f.label}${req}</label><textarea class="form-control" placeholder="${f.placeholder}"></textarea></div>`;
  if (f.type === "select")   return `<div class="form-group"><label class="form-label">${f.label}${req}</label><select class="form-control"><option value="">Selecciona...</option>${(f.options||[]).map(o=>`<option>${o}</option>`).join("")}</select></div>`;
  if (f.type === "checkbox") return `<div class="form-group"><label class="form-checkbox"><input type="checkbox"/> <span>${f.label}${req}</span></label></div>`;
  return `<div class="form-group"><label class="form-label">${f.label}${req}</label><input class="form-control" type="${f.type}" placeholder="${f.placeholder}"/></div>`;
}
