/**
 * Dashboard Cuidador — Cuidado Puro
 * Sem número fantasma: a sessão vem do login real (telaLogin.html → POST
 * /Login → localStorage "usuario_logado"), e todo dado exibido vem da API.
 */
const LOCAL_PREFS_KEY = "cp_cuidador_prefs_local"; // só apelido de exibição, não é dado de negócio

let session = null; // { tipo_usuario, id_usuario, nome }
let cache = { agenda: [], assinaturas: [] };

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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

/* ---------- Sessão (login real, não é senha local) ---------- */
function loadSession() {
  try {
    const raw = localStorage.getItem("usuario_logado");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.tipo_usuario !== "cuidador" || !parsed.id_usuario) return null;
    return parsed;
  } catch {
    return null;
  }
}

function showApp(show) {
  document.getElementById("login-screen").classList.toggle("hidden", show);
  document.getElementById("app").classList.toggle("hidden", !show);
  if (show) refreshAll();
}

function logout() {
  localStorage.removeItem("usuario_logado");
  window.location.href = "telaLogin.html";
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

/* ---------- Agenda (GET /cuidador/{id}/agenda) ---------- */
async function loadAgenda() {
  cache.agenda = await api("/cuidador/" + session.id_usuario + "/agenda");
}

function agendaItemHtml(a, withActions) {
  const statusCls = { "agendado": "pending", "em andamento": "", "concluído": "paid", "cancelado": "late" }[a.status] || "";
  let actions = "";
  if (withActions) {
    if (a.status === "agendado") {
      actions = `<button type="button" class="btn-primary" data-action="aceitar">Aceitar</button>
        <button type="button" class="btn-secondary" data-action="cancelar">Recusar</button>`;
    } else if (a.status === "em andamento") {
      actions = `<button type="button" class="btn-primary" data-action="concluir">Concluir</button>
        <button type="button" class="btn-secondary" data-action="cancelar">Cancelar</button>`;
    }
  }
  return `<div class="msg-item ${statusCls}" data-id="${a.id_cuidado}">
    <div class="msg-meta">
      <span>${formatDate(a.data_agendamento)}</span>
      <span>${escapeHtml(a.status)}</span>
    </div>
    <h4>${escapeHtml(a.nome_paciente)}</h4>
    <p>${escapeHtml(a.cidade_paciente || "")}${a.telefone_paciente ? " · " + escapeHtml(a.telefone_paciente) : ""}</p>
    ${actions ? `<div class="msg-actions">${actions}</div>` : ""}
  </div>`;
}

function wireAgendaActions(container) {
  container.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id_cuidado = Number(btn.closest(".msg-item").dataset.id);
      const novoStatus = { aceitar: "em andamento", concluir: "concluído", cancelar: "cancelado" }[btn.dataset.action];
      btn.disabled = true;
      try {
        await api("/cuidado/" + id_cuidado + "/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: novoStatus })
        });
        await loadAgenda();
        renderAgenda();
        renderRequests();
        renderPatients();
        renderOverview();
      } catch (e) {
        alert("Não foi possível atualizar: " + e.message);
        btn.disabled = false;
      }
    });
  });
}

/* ---------- Overview ---------- */
function renderOverview() {
  const agenda = cache.agenda;
  document.getElementById("stat-agenda").textContent = agenda.length;
  document.getElementById("stat-requests").textContent = agenda.filter((a) => a.status === "agendado").length;
  const pacientesUnicos = new Set(agenda.map((a) => a.id_paciente));
  document.getElementById("stat-patients").textContent = pacientesUnicos.size;

  const boxA = document.getElementById("overview-agenda");
  const proximos = agenda.filter((a) => a.status !== "cancelado").slice(0, 5);
  boxA.innerHTML = proximos.length
    ? proximos.map((a) => agendaItemHtml(a, false)).join("")
    : '<p class="empty">Nada na agenda ainda.</p>';

  const boxR = document.getElementById("overview-requests");
  const pendentes = agenda.filter((a) => a.status === "agendado").slice(0, 5);
  boxR.innerHTML = pendentes.length
    ? pendentes.map((a) => agendaItemHtml(a, false)).join("")
    : '<p class="empty">Nenhuma solicitação pendente.</p>';

  renderOverviewMessages();
}

async function renderOverviewMessages() {
  const box = document.getElementById("overview-messages");
  const idsRecentes = cache.agenda.slice(0, 3).map((a) => a.id_cuidado);
  if (!idsRecentes.length) {
    box.innerHTML = '<p class="empty">Nenhuma mensagem ainda.</p>';
    return;
  }
  try {
    const listas = await Promise.all(idsRecentes.map((id) => api("/mensagens/" + id)));
    const todas = listas.flat().sort((a, b) => new Date(b.enviado_em) - new Date(a.enviado_em)).slice(0, 5);
    box.innerHTML = todas.length
      ? todas.map((m) => `<div class="msg-item">
          <div class="msg-meta"><span>${escapeHtml(m.remetente_tipo)}</span><span>${formatDate(m.enviado_em)}</span></div>
          <p>${escapeHtml(m.texto)}</p>
        </div>`).join("")
      : '<p class="empty">Nenhuma mensagem ainda.</p>';
  } catch {
    box.innerHTML = '<p class="empty">Não foi possível carregar mensagens.</p>';
  }
}

/* ---------- Agenda panel ---------- */
function renderAgenda() {
  const box = document.getElementById("agenda-list");
  const sorted = cache.agenda.slice().sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento));
  box.innerHTML = sorted.length
    ? sorted.map((a) => agendaItemHtml(a, true)).join("")
    : '<p class="empty">Nenhum agendamento ainda. Pacientes agendam através do match.</p>';
  wireAgendaActions(box);
}

/* ---------- Requests panel (agendado = aguardando aceite) ---------- */
function renderRequests() {
  const box = document.getElementById("requests-list");
  const pendentes = cache.agenda.filter((a) => a.status === "agendado");
  box.innerHTML = pendentes.length
    ? pendentes.map((a) => agendaItemHtml(a, true)).join("")
    : '<p class="empty">Nenhuma solicitação pendente.</p>';
  wireAgendaActions(box);
}

/* ---------- Patients panel (derivado da agenda real) ---------- */
function renderPatients() {
  const box = document.getElementById("patients-list");
  const porPaciente = new Map();
  cache.agenda.forEach((a) => {
    if (!porPaciente.has(a.id_paciente)) {
      porPaciente.set(a.id_paciente, { nome: a.nome_paciente, telefone: a.telefone_paciente, cidade: a.cidade_paciente, qtd: 0 });
    }
    porPaciente.get(a.id_paciente).qtd++;
  });
  const lista = Array.from(porPaciente.values());
  box.innerHTML = lista.length
    ? lista.map((p) => `<div class="msg-item">
        <div class="msg-meta"><span>${escapeHtml(p.cidade || "")}</span><span>${escapeHtml(p.telefone || "")}</span></div>
        <h4>${escapeHtml(p.nome)}</h4>
        <p>${p.qtd} agendamento(s)</p>
      </div>`).join("")
    : '<p class="empty">Nenhum paciente ainda.</p>';
}

/* ---------- Messages panel ---------- */
async function renderMessages() {
  const box = document.getElementById("messages-list");
  if (!cache.agenda.length) {
    box.innerHTML = '<p class="empty">Nenhuma conversa ainda — mensagens só são liberadas após um agendamento.</p>';
    return;
  }
  try {
    const listas = await Promise.all(cache.agenda.map((a) => api("/mensagens/" + a.id_cuidado).then((ms) => ({ a, ms }))));
    const comMensagens = listas.filter((x) => x.ms.length);
    if (!comMensagens.length) {
      box.innerHTML = '<p class="empty">Nenhuma mensagem recebida ainda.</p>';
      return;
    }
    box.innerHTML = comMensagens.map(({ a, ms }) => {
      const ultima = ms[ms.length - 1];
      return `<div class="msg-item">
        <div class="msg-meta"><span>${escapeHtml(a.nome_paciente)}</span><span>${formatDate(ultima.enviado_em)}</span></div>
        <p>${escapeHtml(ultima.texto)}</p>
      </div>`;
    }).join("");
  } catch {
    box.innerHTML = '<p class="empty">Não foi possível carregar as mensagens.</p>';
  }
}

/* ---------- Payments panel (mensalidade do próprio cuidador) ---------- */
async function loadPayments() {
  cache.assinaturas = await api("/assinaturas/cuidador/" + session.id_usuario);
}

function renderPayments() {
  const box = document.getElementById("payments-list");
  box.innerHTML = cache.assinaturas.length
    ? cache.assinaturas.map((a) => {
        const cls = a.status_pagamento === "pago" ? "paid" : a.status_pagamento === "atrasado" ? "late" : "pending";
        return `<div class="msg-item ${cls}">
          <div class="msg-meta"><span>Mensalidade</span><span>${escapeHtml(a.status_pagamento)}</span></div>
          <h4>Vencimento: ${formatDate(a.data_vencimento)}</h4>
          ${a.data_pagamento ? `<p>Pago em ${formatDate(a.data_pagamento)}</p>` : ""}
        </div>`;
      }).join("")
    : '<p class="empty">Nenhuma assinatura encontrada.</p>';
}

/* ---------- Settings (apelido local, não é dado de negócio) ---------- */
function loadSettings() {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(LOCAL_PREFS_KEY) || "{}"); } catch { prefs = {}; }
  document.getElementById("s-name").value = prefs.nome || session.nome || "";
}

function saveSettings() {
  localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify({ nome: document.getElementById("s-name").value.trim() }));
  const msg = document.getElementById("settings-saved");
  msg.textContent = "Salvo!";
  setTimeout(() => { msg.textContent = ""; }, 2500);
}

/* ---------- Helpers ---------- */
function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
}

async function refreshAll() {
  try {
    await loadAgenda();
    await loadPayments();
    renderOverview();
    renderAgenda();
    renderRequests();
    renderPatients();
    renderMessages();
    renderPayments();
    loadSettings();
  } catch (e) {
    console.error("Erro ao carregar painel do cuidador:", e);
    alert("Não foi possível carregar os dados do servidor. Verifique se a API está rodando (" + API_BASE_URL + ").");
  }
  refreshIcons();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logout-btn").addEventListener("click", logout);

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
  });

  document.getElementById("save-settings").addEventListener("click", saveSettings);

  session = loadSession();
  if (session) showApp(true);
  else showApp(false);
  refreshIcons();
});
