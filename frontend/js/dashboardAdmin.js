/**
 * Dashboard Admin — Cuidado Puro
 * Sem número fantasma: todo dado vem da API real (ver API_BASE_URL em config.js).
 * O login por senha local é só um portão de acesso ao painel — não é um
 * usuário cadastrado no banco, então continua local mesmo depois da
 * limpeza dos dados mockados.
 */
const AUTH_KEY = "cp_admin_auth";
const DEFAULT_PASSWORD = "admin123";
const SETTINGS_KEY = "cp_admin_settings_local"; // só nome/e-mail exibidos no painel, não afeta o banco

let cache = {
  resumo: null,
  trafego: null,
  usuarios: [],
  assinaturas: []
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(n) {
  return "R$ " + Number(n || 0).toFixed(2).replace(".", ",");
}

async function api(path, options) {
  const res = await fetch(API_BASE_URL + path, options);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || ("Erro " + res.status));
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- Auth (portão local do painel, não é dado de negócio) ---------- */
function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === "1";
}

function showApp(show) {
  document.getElementById("login-screen").classList.toggle("hidden", show);
  document.getElementById("app").classList.toggle("hidden", !show);
  if (show) refreshAll();
}

function login() {
  const pass = document.getElementById("login-pass").value;
  const err = document.getElementById("login-error");
  if (pass === DEFAULT_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "1");
    err.textContent = "";
    showApp(true);
  } else {
    err.textContent = "Senha incorreta.";
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  showApp(false);
}

/* ---------- Navigation ---------- */
function switchPanel(panel) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.panel === panel);
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === "panel-" + panel);
  });
  const active = document.querySelector('.nav-item[data-panel="' + panel + '"]');
  if (active) {
    document.getElementById("panel-title").textContent = active.dataset.label || panel;
  }
  refreshIcons();
}

/* ---------- Chart helpers ---------- */
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

const chartDefaults = {
  color: "#9cb1d9",
  borderColor: "rgba(237,241,245,0.14)",
  teal: "#68beb5",
  tealFill: "rgba(104,190,181,0.25)",
  amber: "#e7a82e",
  danger: "#e57373",
  ok: "#81c784",
  navy: "#0a2040"
};

function lineChart(canvasId, labels, data, label) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: label || "Visitas",
        data,
        borderColor: chartDefaults.teal,
        backgroundColor: chartDefaults.tealFill,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: chartDefaults.color, maxTicksLimit: 8, font: { size: 10 } },
          grid: { color: chartDefaults.borderColor }
        },
        y: {
          ticks: { color: chartDefaults.color, font: { size: 10 } },
          grid: { color: chartDefaults.borderColor },
          beginAtZero: true
        }
      }
    }
  });
}

function doughnutChart(canvasId, labels, data, colors) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || [chartDefaults.teal, chartDefaults.amber, chartDefaults.danger, chartDefaults.ok],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: chartDefaults.color, boxWidth: 12, font: { size: 11 } }
        }
      }
    }
  });
}

function barChart(canvasId, labels, data, label) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === "undefined") return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: label || "Valor",
        data,
        backgroundColor: chartDefaults.teal,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: chartDefaults.color, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: chartDefaults.color, font: { size: 10 } },
          grid: { color: chartDefaults.borderColor },
          beginAtZero: true
        }
      }
    }
  });
}

/* ---------- Overview (GET /adm/resumo + /adm/trafego) ---------- */
async function loadOverview() {
  const [resumo, trafego] = await Promise.all([
    api("/adm/resumo"),
    api("/adm/trafego")
  ]);
  cache.resumo = resumo;
  cache.trafego = trafego;

  const aprovados = (resumo.usuarios.status_pacientes.aprovado || 0) + (resumo.usuarios.status_cuidadores.aprovado || 0);
  const naoAprovados = resumo.usuarios.total - aprovados;

  document.getElementById("stat-users").textContent = resumo.usuarios.total;
  document.getElementById("stat-active").textContent = aprovados;
  document.getElementById("stat-inactive").textContent = naoAprovados;
  document.getElementById("stat-visits").textContent = trafego.ultimos_30_dias.toLocaleString("pt-BR");
  document.getElementById("stat-revenue").textContent = formatMoney(resumo.assinaturas.receita_paga);

  // Tráfego — últimos 14 dias (real, tabela visita)
  const porDia = trafego.por_dia_ultimos_14 || {};
  const dias = Object.keys(porDia).sort();
  lineChart(
    "chart-traffic-mini",
    dias.map((d) => formatDate(d).split(" de ")[0]),
    dias.map((d) => porDia[d]),
    "Visitas"
  );

  // Usuários por tipo (real)
  doughnutChart(
    "chart-users-type",
    ["Pacientes", "Cuidadores"],
    [resumo.usuarios.pacientes, resumo.usuarios.cuidadores],
    [chartDefaults.teal, chartDefaults.amber]
  );

  // Mensalidades recentes (real, /adm/assinaturas já carregado em loadPayments)
  const boxP = document.getElementById("overview-payments");
  const recentPay = cache.assinaturas.slice(0, 5);
  if (!recentPay.length) {
    boxP.innerHTML = '<p class="empty">Nenhuma mensalidade.</p>';
  } else {
    boxP.innerHTML = recentPay.map((p) => {
      const cls = p.status_pagamento === "pago" ? "paid" : p.status_pagamento === "atrasado" ? "late" : "pending";
      return `<div class="msg-item ${cls}">
        <div class="msg-meta">
          <span>${escapeHtml(p.nome_usuario)} · ${escapeHtml(p.plano)}</span>
          <span>${escapeHtml(p.status_pagamento)}</span>
        </div>
        <h4>${formatMoney(p.valor)} — venc. ${formatDate(p.data_vencimento)}</h4>
      </div>`;
    }).join("");
  }

  // Cadastros pendentes recentes (real)
  const boxR = document.getElementById("overview-regs");
  const recentReg = resumo.cadastros_pendentes.slice(0, 5);
  if (!recentReg.length) {
    boxR.innerHTML = '<p class="empty">Nenhum cadastro pendente.</p>';
  } else {
    boxR.innerHTML = recentReg.map((r) => `
      <div class="msg-item">
        <div class="msg-meta">
          <span>${escapeHtml(r.tipo_usuario)} · ${formatDate(r.data_criacao)}</span>
          <span>pendente</span>
        </div>
        <h4>${escapeHtml(r.nome)}</h4>
        <p>${escapeHtml(r.email || "")}</p>
      </div>`).join("");
  }
}

/* ---------- Traffic (GET /adm/trafego) ---------- */
function renderTraffic() {
  const t = cache.trafego;
  if (!t) return;
  const porDia = t.por_dia_ultimos_14 || {};
  const dias = Object.keys(porDia).sort();
  const peak = dias.length ? Math.max(...dias.map((d) => porDia[d])) : 0;

  document.getElementById("traf-today").textContent = t.hoje;
  document.getElementById("traf-week").textContent = t.ultimos_7_dias.toLocaleString("pt-BR");
  document.getElementById("traf-month").textContent = t.ultimos_30_dias.toLocaleString("pt-BR");
  document.getElementById("traf-peak").textContent = peak;

  lineChart(
    "chart-traffic-full",
    dias.map((d) => formatDate(d).split(" de ")[0]),
    dias.map((d) => porDia[d]),
    "Visitas"
  );

  const porPagina = t.por_pagina || {};
  const paginas = Object.keys(porPagina);
  barChart(
    "chart-pages",
    paginas.map((p) => p.replace(/^\/telas\//, "").replace(/\.html$/, "") || "/"),
    paginas.map((p) => porPagina[p]),
    "Visitas"
  );
}

/* ---------- Users (GET /adm/usuarios — somente leitura) ---------- */
async function loadUsers() {
  cache.usuarios = await api("/adm/usuarios");
  renderUsers();
}

function renderUsers() {
  const list = cache.usuarios;
  const q = (document.getElementById("user-search")?.value || "").toLowerCase();
  const st = document.getElementById("user-filter-status")?.value || "all";
  const tp = document.getElementById("user-filter-type")?.value || "all";

  const filtered = list.filter((u) => {
    const matchQ = !q || (u.nome || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    const matchS = st === "all" || u.status_cadastro === st;
    const matchT = tp === "all" || u.tipo_usuario === tp;
    return matchQ && matchS && matchT;
  });

  const tbody = document.getElementById("users-tbody");
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5"><p class="empty">Nenhum usuário encontrado.</p></td></tr>';
    return;
  }

  const badgeClass = { aprovado: "badge-ok", pendente: "badge-pending", recusado: "badge-off" };
  tbody.innerHTML = filtered.map((u) => `
    <tr>
      <td>${escapeHtml(u.nome)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge badge-info">${escapeHtml(u.tipo_usuario)}</span></td>
      <td><span class="badge ${badgeClass[u.status_cadastro] || "badge-info"}">${escapeHtml(u.status_cadastro)}</span></td>
      <td>${formatDate(u.data_criacao)}</td>
    </tr>`).join("");
}

/* ---------- Registrations (cadastros pendentes — aprovar/recusar real) ---------- */
function renderRegs() {
  const list = cache.usuarios;
  const q = (document.getElementById("reg-search")?.value || "").toLowerCase();
  const st = document.getElementById("reg-filter-status")?.value || "all";

  const filtered = list.filter((r) => {
    const matchQ = !q || (r.nome || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
    const matchS = st === "all" || r.status_cadastro === st;
    return matchQ && matchS;
  });

  const tbody = document.getElementById("regs-tbody");
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6"><p class="empty">Nenhum cadastro encontrado.</p></td></tr>';
    return;
  }

  const badgeClass = { aprovado: "badge-ok", pendente: "badge-pending", recusado: "badge-off" };
  tbody.innerHTML = filtered.map((r) => `
    <tr data-tipo="${r.tipo_usuario}" data-id="${r.id_usuario}">
      <td>${escapeHtml(r.nome)}</td>
      <td><span class="badge badge-info">${escapeHtml(r.tipo_usuario)}</span></td>
      <td>${escapeHtml(r.email)}</td>
      <td>${formatDate(r.data_criacao)}</td>
      <td><span class="badge ${badgeClass[r.status_cadastro] || "badge-info"}">${escapeHtml(r.status_cadastro)}</span></td>
      <td>
        ${r.status_cadastro === "pendente" ? `
          <button type="button" class="btn-secondary" data-action="approve">Aprovar</button>
          <button type="button" class="btn-danger" data-action="reject">Recusar</button>
        ` : "—"}
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tr = btn.closest("tr");
      const tipo_usuario = tr.dataset.tipo;
      const id_usuario = Number(tr.dataset.id);
      const novo_status = btn.dataset.action === "approve" ? "aprovado" : "recusado";
      btn.disabled = true;
      try {
        await api("/adm/aprovar-recusar-cadastro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo_usuario, id_usuario, novo_status })
        });
        await loadUsers();
        await loadOverview();
        renderRegs();
      } catch (e) {
        alert("Não foi possível atualizar o cadastro: " + e.message);
        btn.disabled = false;
      }
    });
  });
}

/* ---------- Payments (GET /adm/assinaturas) ---------- */
async function loadPayments() {
  cache.assinaturas = await api("/adm/assinaturas");
  renderPayments();
}

function renderPayments() {
  const list = cache.assinaturas;
  const paid = list.filter((p) => p.status_pagamento === "pago");
  const pending = list.filter((p) => p.status_pagamento === "pendente");
  const late = list.filter((p) => p.status_pagamento === "atrasado");
  const total = paid.reduce((s, p) => s + Number(p.valor || 0), 0);

  document.getElementById("pay-paid-count").textContent = paid.length;
  document.getElementById("pay-pending-count").textContent = pending.length;
  document.getElementById("pay-late-count").textContent = late.length;
  document.getElementById("pay-total").textContent = formatMoney(total);

  barChart(
    "chart-revenue",
    ["Pago", "Pendente", "Atrasado"],
    [paid.length, pending.length, late.length],
    "Mensalidades"
  );

  const q = (document.getElementById("pay-search")?.value || "").toLowerCase();
  const st = document.getElementById("pay-filter-status")?.value || "all";
  const filtered = list.filter((p) => {
    const matchQ = !q || (p.nome_usuario || "").toLowerCase().includes(q);
    const matchS = st === "all" || p.status_pagamento === st;
    return matchQ && matchS;
  });

  const tbody = document.getElementById("payments-tbody");
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5"><p class="empty">Nenhuma mensalidade encontrada.</p></td></tr>';
    return;
  }

  const badgeClass = { pago: "badge-ok", atrasado: "badge-off", pendente: "badge-pending" };
  tbody.innerHTML = filtered.map((p) => `
    <tr>
      <td>${escapeHtml(p.nome_usuario)}</td>
      <td>${escapeHtml(p.plano)}</td>
      <td>${formatMoney(p.valor)}</td>
      <td>${formatDate(p.data_vencimento)}</td>
      <td><span class="badge ${badgeClass[p.status_pagamento] || "badge-info"}">${escapeHtml(p.status_pagamento)}</span></td>
    </tr>`).join("");
}

/* ---------- Settings (só preferências locais do painel, não é dado de negócio) ---------- */
function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { s = {}; }
  document.getElementById("s-name").value = s.name || "";
  document.getElementById("s-email").value = s.email || "";
}

function saveSettings() {
  const s = {
    name: document.getElementById("s-name").value.trim(),
    email: document.getElementById("s-email").value.trim()
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  const msg = document.getElementById("settings-saved");
  msg.textContent = "Configurações salvas!";
  setTimeout(() => { msg.textContent = ""; }, 2500);
}

/* ---------- Helpers ---------- */
function refreshIcons() {
  if (typeof lucide !== "undefined") lucide.createIcons();
}

async function refreshAll() {
  try {
    await loadUsers();
    await loadPayments();
    await loadOverview();
    renderTraffic();
    renderRegs();
    loadSettings();
  } catch (e) {
    console.error("Erro ao carregar dados do painel admin:", e);
    alert("Não foi possível carregar os dados do servidor. Verifique se a API está rodando (" + API_BASE_URL + ").");
  }
  refreshIcons();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-btn").addEventListener("click", login);
  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  document.getElementById("logout-btn").addEventListener("click", logout);

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
  });

  document.getElementById("user-search").addEventListener("input", renderUsers);
  document.getElementById("user-filter-status").addEventListener("change", renderUsers);
  document.getElementById("user-filter-type").addEventListener("change", renderUsers);

  document.getElementById("reg-search").addEventListener("input", renderRegs);
  document.getElementById("reg-filter-status").addEventListener("change", renderRegs);

  document.getElementById("pay-search").addEventListener("input", renderPayments);
  document.getElementById("pay-filter-status").addEventListener("change", renderPayments);

  document.getElementById("save-settings").addEventListener("click", saveSettings);

  if (isLoggedIn()) showApp(true);
  else showApp(false);
  refreshIcons();
});
