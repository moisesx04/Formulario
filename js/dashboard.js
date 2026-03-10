// ============================================================
//  PureForm — Dashboard Logic
// ============================================================

import { db } from "./firebase-config.js";
import { requireAuth, bindLogout, setActiveSidebarLink } from "./auth.js";
import { formatDate } from "./utils.js";
import {
  collection, getDocs, query, orderBy, limit, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

requireAuth(async user => {
  bindLogout();
  setActiveSidebarLink();

  const emailEl = document.getElementById("adminEmail");
  if (emailEl) emailEl.textContent = user.email;

  await Promise.all([loadStats(), loadRecentSubmissions()]);
  initCharts();
});

let allSubmissions = [];
let allForms       = [];

async function loadStats() {
  const [formsSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, "forms")),
    getDocs(collection(db, "submissions"))
  ]);

  allForms       = formsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  allSubmissions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const now         = new Date();
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSubs   = allSubmissions.filter(s => {
    const d = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt);
    return d >= monthStart;
  });
  const activeForms = allForms.filter(f => f.status === "active");

  document.getElementById("statForms").textContent       = allForms.length;
  document.getElementById("statSubmissions").textContent = allSubmissions.length;
  document.getElementById("statMonth").textContent       = monthSubs.length;
  document.getElementById("statActive").textContent      = activeForms.length;
}

async function loadRecentSubmissions() {
  const q    = query(collection(db, "submissions"), orderBy("submittedAt", "desc"), limit(10));
  const snap = await getDocs(q);
  const tbody = document.getElementById("recentBody");

  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--gray-mid);padding:32px;">Sin respuestas aún</td></tr>`;
    return;
  }

  tbody.innerHTML = snap.docs.map(doc => {
    const s         = doc.data();
    const fieldCount = s.data ? Object.keys(s.data).length : 0;
    return `
      <tr>
        <td><span style="font-weight:600;">${s.formTitle || "Sin título"}</span></td>
        <td style="color:var(--gray-light);">${formatDate(s.submittedAt)}</td>
        <td><span class="badge badge--active">${fieldCount} campos</span></td>
        <td><a href="submissions.html" class="btn btn--ghost btn--sm">Ver →</a></td>
      </tr>
    `;
  }).join("");
}

function initCharts() {
  Chart.defaults.color = "#888";
  Chart.defaults.font.family = "Inter";

  // ── Line Chart: Last 30 days ──
  const days    = 30;
  const labels  = [];
  const counts  = [];
  const today   = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString("es-MX", { month: "short", day: "numeric" }));

    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end   = new Date(start); end.setDate(end.getDate() + 1);

    const count = allSubmissions.filter(s => {
      const sd = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt);
      return sd >= start && sd < end;
    }).length;
    counts.push(count);
  }

  new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: counts,
        borderColor: "#fff",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#fff",
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { maxTicksLimit: 10, font: { size: 11 } }
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } }
        }
      }
    }
  });

  // ── Doughnut Chart: Per form ──
  const formCounts = {};
  const formLabels = {};

  allSubmissions.forEach(s => {
    const id = s.formId || "unknown";
    formCounts[id] = (formCounts[id] || 0) + 1;
    formLabels[id] = s.formTitle || id;
  });

  const dLabels = Object.keys(formCounts).map(k => formLabels[k]);
  const dData   = Object.values(formCounts);
  const grays   = ["#fff","#ccc","#999","#666","#444","#2a2a2a"];

  new Chart(document.getElementById("doughnutChart"), {
    type: "doughnut",
    data: {
      labels: dLabels.length ? dLabels : ["Sin datos"],
      datasets: [{
        data:            dData.length ? dData : [1],
        backgroundColor: dLabels.length ? grays.slice(0, dData.length) : ["#2a2a2a"],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      cutout: "72%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 16, font: { size: 11 }, boxWidth: 10, usePointStyle: true }
        }
      }
    }
  });
}
