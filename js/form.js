// ============================================================
//  PureForm — Client Form Portal Logic
// ============================================================

import { db } from "./firebase-config.js";
import { showToast } from "./utils.js";
import {
  collection, getDocs, addDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loadingEl = document.getElementById("loadingState");
const errorEl   = document.getElementById("errorState");
const formCard  = document.getElementById("formCard");
const successCd = document.getElementById("successCard");

const token = new URLSearchParams(window.location.search).get("token");

let formData = null;

async function init() {
  if (!token) { showError(); return; }

  try {
    const q    = query(collection(db, "forms"), where("token", "==", token));
    const snap = await getDocs(q);

    if (snap.empty) { showError(); return; }

    const doc  = snap.docs[0];
    formData   = { id: doc.id, ...doc.data() };

    if (formData.status === "archived") { showError(); return; }

    renderForm();
  } catch (err) {
    console.error(err);
    showError();
  }
}

function showError() {
  loadingEl.style.display = "none";
  errorEl.style.display   = "block";
}

function renderForm() {
  document.title = `${formData.title} — PureForm`;
  document.getElementById("formTitle").textContent = formData.title;

  const formEl = document.getElementById("dynamicForm");
  const fields  = formData.fields || [];

  formEl.innerHTML = fields.map((f, i) => renderField(f, i)).join("");

  loadingEl.style.display = "none";
  formCard.style.display  = "block";

  document.getElementById("submitBtn").addEventListener("click", handleSubmit);
}

function renderField(f, i) {
  const id       = `pf_field_${i}`;
  const required = f.required ? "required" : "";
  const req      = f.required ? '<span style="color:var(--danger);margin-left:3px;">*</span>' : "";

  if (f.type === "textarea") {
    return `<div class="form-group">
      <label class="form-label" for="${id}">${f.label}${req}</label>
      <textarea class="form-control" id="${id}" name="${f.label}" placeholder="${f.placeholder || ""}" ${required}></textarea>
    </div>`;
  }

  if (f.type === "select") {
    const opts = (f.options || []).map(o => `<option value="${o}">${o}</option>`).join("");
    return `<div class="form-group">
      <label class="form-label" for="${id}">${f.label}${req}</label>
      <select class="form-control" id="${id}" name="${f.label}" ${required}>
        <option value="">Selecciona una opción...</option>
        ${opts}
      </select>
    </div>`;
  }

  if (f.type === "checkbox") {
    return `<div class="form-group">
      <label class="form-checkbox" for="${id}">
        <input type="checkbox" id="${id}" name="${f.label}" ${required}/>
        <span>${f.label}${req}</span>
      </label>
    </div>`;
  }

  return `<div class="form-group">
    <label class="form-label" for="${id}">${f.label}${req}</label>
    <input class="form-control" type="${f.type}" id="${id}" name="${f.label}" placeholder="${f.placeholder || ""}" ${required}/>
  </div>`;
}

async function handleSubmit() {
  const fields = formData.fields || [];
  const data   = {};
  let   valid  = true;

  fields.forEach((f, i) => {
    const el = document.getElementById(`pf_field_${i}`);
    if (!el) return;

    let value;
    if (f.type === "checkbox") {
      value = el.checked ? "Sí" : "No";
      if (f.required && !el.checked) {
        valid = false;
        el.style.outline = "2px solid var(--danger)";
      } else {
        el.style.outline = "";
      }
    } else {
      value = el.value.trim();
      if (f.required && !value) {
        valid = false;
        el.style.borderColor = "var(--danger)";
      } else {
        el.style.borderColor = "";
      }
    }
    data[f.label] = value;
  });

  if (!valid) {
    showToast("Por favor completa todos los campos requeridos", "error");
    return;
  }

  const btn      = document.getElementById("submitBtn");
  btn.disabled   = true;
  btn.innerHTML  = '<span class="spinner"></span> Enviando...';

  try {
    await addDoc(collection(db, "submissions"), {
      formId:      formData.id,
      formTitle:   formData.title,
      data,
      submittedAt: serverTimestamp()
    });

    formCard.style.display   = "none";
    successCd.style.display  = "block";
    successCd.classList.add("animate-in");
  } catch (err) {
    console.error(err);
    showToast("Error al enviar. Intenta de nuevo.", "error");
    btn.disabled  = false;
    btn.innerHTML = "Enviar Formulario";
  }
}

init();
