// ============================================================
//  PureForm — Shared Utilities
// ============================================================

/** Generate a random token string */
export function generateToken(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** Format a Firestore Timestamp or JS Date to readable string */
export function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-MX", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

/** Show a floating toast notification */
export function showToast(message, type = "info") {
  const existing = document.getElementById("pf-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "pf-toast";
  toast.className = `pf-toast pf-toast--${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("pf-toast--visible"));

  setTimeout(() => {
    toast.classList.remove("pf-toast--visible");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/** Copy text to clipboard + toast */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Enlace copiado al portapapeles", "success");
  } catch {
    showToast("Error al copiar", "error");
  }
}

/** Export array of objects to CSV download */
export function exportCSV(data, filename = "pureform-export.csv") {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Debounce helper */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}
