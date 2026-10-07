/**
 * Dashboard Paciente — Cuidado Puro
 * Sem número fantasma: a sessão vem do login real (telaLogin.html → POST
 * /Login → localStorage "usuario_logado"), e todo dado exibido vem da API.
 */
const LOCAL_PREFS_KEY = "cp_paciente_prefs_local"; // só apelido de exibição, não é dado de negócio

let session = null; // { tipo_usuario, id_usuario, nome }
let cache = { agenda: [], assinaturas: [], medicacoes: [], consultas: [] };

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

async function api(path, options) {
  const res = await fetch(API_BASE_URL + path, options);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || ("Erro " + res.status));
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- Sessão (login real) ---------- */
function loadSession() {
  try {
    const raw = localStorage.getItem("usuario_logado");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.tipo_usuario !== "paciente" || !parsed.id_usuario) return null;
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

/* ---------- Agenda (GET /paciente/{id}/agenda) ---------- */
async function loadAgenda() {
  cache.agenda = await api("/paciente/" + session.id_usuario + "/agenda");
}

function agendaItemHtml(a) {
  const statusCls = { "agendado": "pending", "em andamento": "", "concluído": "paid", "cancelado": "late" }[a.status] || "";
  return `<div class="msg-item ${statusCls}" data-id="${a.id_cuidado}">
    <div class="msg-meta">
      <span>${formatDate(a.data_agendamento)}</span>
      <span>${escapeHtml(a.status)}</span>
    </div>
    <h4>${escapeHtml(a.nome_cuidador)}</h4>
    <p>${escapeHtml(a.categoria_cuidador || "")}</p>
  </div>`;
}

/* ---------- Overview ---------- */
function renderOverview() {
  const agenda = cache.agenda;
  document.getElementById("stat-agenda").textContent = agenda.filter((a) => a.status !== "cancelado" && a.status !== "concluído").length;
  document.getElementById("stat-history").textContent = agenda.filter((a) => a.status === "concluído").length;

  const boxA = document.getElementById("overview-agenda");
  const proximos = agenda.filter((a) => a.status === "agendado" || a.status === "em andamento").slice(0, 5);
  boxA.innerHTML = proximos.length
    ? proximos.map(agendaItemHtml).join("")
    : '<p class="empty">Nenhum agendamento ainda. Use "Buscar cuidador" na Agenda.</p>';
}

/* ---------- Agenda panel + match/booking flow ---------- */
function renderAgenda() {
  const box = document.getElementById("agenda-list");
  const sorted = cache.agenda.slice().sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento));
  box.innerHTML = sorted.length
    ? sorted.map(agendaItemHtml).join("")
    : '<p class="empty">Nenhum agendamento ainda.</p>';
}

let cuidadorEscolhido = null;

async function abrirBuscaCuidador() {
  document.getElementById("match-form-wrap").classList.remove("hidden");
  document.getElementById("agenda-confirm-wrap").classList.add("hidden");
  const box = document.getElementById("match-list");
  box.innerHTML = '<p class="empty">Buscando cuidadores compatíveis...</p>';
  try {
    const resultados = await api("/match/" + session.id_usuario);
    if (!resultados.length) {
      box.innerHTML = '<p class="empty">Nenhum cuidador disponível na sua cidade para o momento. Cadastre suas necessidades para refinar a busca.</p>';
      return;
    }
    box.innerHTML = resultados.map((r) => `
      <div class="msg-item" data-id="${r.id_cuidador}">
        <div class="msg-meta"><span>${escapeHtml(r.categoria_profissional)}</span><span>${escapeHtml(r.cidade)}</span></div>
        <h4>${escapeHtml(r.nome)}</h4>
        <p>${escapeHtml(r.motivo)}</p>
        <div class="msg-actions"><button type="button" class="btn-primary" data-action="escolher">Agendar com este cuidador</button></div>
      </div>`).join("");
    box.querySelectorAll("[data-action=escolher]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".msg-item");
        cuidadorEscolhido = { id: Number(item.dataset.id), nome: item.querySelector("h4").textContent };
        document.getElementById("match-form-wrap").classList.add("hidden");
        document.getElementById("agenda-confirm-wrap").classList.remove("hidden");
        document.getElementById("agenda-confirm-cuidador").textContent = "Cuidador: " + cuidadorEscolhido.nome;
      });
    });
  } catch (e) {
    box.innerHTML = '<p class="empty">Não foi possível buscar cuidadores: ' + escapeHtml(e.message) + '</p>';
  }
}

async function confirmarAgendamento() {
  const dataHora = document.getElementById("ag-datahora").value;
  if (!cuidadorEscolhido || !dataHora) {
    alert("Escolha um cuidador e uma data/horário.");
    return;
  }
  try {
    await api("/cuidado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_cuidador: cuidadorEscolhido.id,
        id_paciente: session.id_usuario,
        data_agendamento: new Date(dataHora).toISOString()
      })
    });
    document.getElementById("agenda-confirm-wrap").classList.add("hidden");
    document.getElementById("ag-datahora").value = "";
    cuidadorEscolhido = null;
    await loadAgenda();
    renderAgenda();
    renderOverview();
    renderHistory();
    alert("Agendamento criado! Agora você já pode conversar com o cuidador no chat.");
  } catch (e) {
    alert("Não foi possível agendar: " + e.message);
  }
}

/* ---------- Histórico (agendamentos concluídos, real) ---------- */
function renderHistory() {
  const box = document.getElementById("history-list");
  const concluidos = cache.agenda.filter((a) => a.status === "concluído");
  box.innerHTML = concluidos.length
    ? concluidos.map(agendaItemHtml).join("")
    : '<p class="empty">Nenhum atendimento concluído ainda.</p>';
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
        <div class="msg-meta"><span>${escapeHtml(a.nome_cuidador)}</span><span>${formatDate(ultima.enviado_em)}</span></div>
        <p>${escapeHtml(ultima.texto)}</p>
      </div>`;
    }).join("");
  } catch {
    box.innerHTML = '<p class="empty">Não foi possível carregar as mensagens.</p>';
  }
}

/* ---------- Modo Pós-Alta: Medicações (GET/POST /medicacao) ---------- */
async function loadMedicacoes() {
  cache.medicacoes = await api("/medicacao/" + session.id_usuario);
}

function renderMedicacoes() {
  const box = document.getElementById("medicacao-list");
  const hoje = new Date().toISOString().slice(0, 10);
  box.innerHTML = cache.medicacoes.length
    ? cache.medicacoes.map((m) => {
        const ativa = !m.data_fim || m.data_fim >= hoje;
        return `<div class="msg-item ${ativa ? "" : "late"}">
          <div class="msg-meta">
            <span>${escapeHtml(m.horario)}</span>
            <span>${ativa ? "em uso" : "encerrada"}</span>
          </div>
          <h4>${escapeHtml(m.nome_medicamento)} — ${escapeHtml(m.dosagem)}</h4>
          <p>Início: ${formatDate(m.data_inicio)}${m.data_fim ? " · Fim: " + formatDate(m.data_fim) : ""}</p>
          ${m.observacoes ? `<p>${escapeHtml(m.observacoes)}</p>` : ""}
        </div>`;
      }).join("")
    : '<p class="empty">Nenhuma medicação cadastrada.</p>';
}

function openMedicacaoForm() {
  ["med-nome", "med-dosagem", "med-horario", "med-inicio", "med-fim", "med-obs"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("medicacao-form-wrap").classList.remove("hidden");
}

async function saveMedicacao() {
  const dados = {
    id_paciente: session.id_usuario,
    nome_medicamento: document.getElementById("med-nome").value.trim(),
    dosagem: document.getElementById("med-dosagem").value.trim(),
    horario: document.getElementById("med-horario").value.trim(),
    data_inicio: document.getElementById("med-inicio").value,
    data_fim: document.getElementById("med-fim").value || null,
    observacoes: document.getElementById("med-obs").value.trim() || null
  };
  if (!dados.nome_medicamento || !dados.dosagem || !dados.horario || !dados.data_inicio) {
    alert("Preencha medicamento, dosagem, horário e data de início.");
    return;
  }
  try {
    await api("/medicacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    document.getElementById("medicacao-form-wrap").classList.add("hidden");
    await loadMedicacoes();
    renderMedicacoes();
  } catch (e) {
    alert("Não foi possível salvar: " + e.message);
  }
}

/* ---------- Modo Pós-Alta: Consultas (GET/POST /consulta-medica) ---------- */
async function loadConsultas() {
  cache.consultas = await api("/consulta-medica/" + session.id_usuario);
}

function renderConsultas() {
  const box = document.getElementById("consulta-list");
  const agora = new Date();
  const ordenadas = cache.consultas.slice().sort((a, b) => new Date(a.data_consulta) - new Date(b.data_consulta));
  box.innerHTML = ordenadas.length
    ? ordenadas.map((c) => {
        const passada = new Date(c.data_consulta) < agora;
        return `<div class="msg-item ${passada ? "" : "pending"}">
          <div class="msg-meta">
            <span>${formatDate(c.data_consulta)}</span>
            <span>${c.eh_retorno ? "retorno" : "primeira consulta"}</span>
          </div>
          <h4>${escapeHtml(c.nome_medico)} — ${escapeHtml(c.especialidade)}</h4>
          ${c.observacoes ? `<p>${escapeHtml(c.observacoes)}</p>` : ""}
        </div>`;
      }).join("")
    : '<p class="empty">Nenhuma consulta cadastrada.</p>';
}

function openConsultaForm() {
  ["con-medico", "con-especialidade", "con-data", "con-obs"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("con-retorno").value = "nao";
  document.getElementById("consulta-form-wrap").classList.remove("hidden");
}

async function saveConsulta() {
  const dataHora = document.getElementById("con-data").value;
  const dados = {
    id_paciente: session.id_usuario,
    nome_medico: document.getElementById("con-medico").value.trim(),
    especialidade: document.getElementById("con-especialidade").value.trim(),
    data_consulta: dataHora ? new Date(dataHora).toISOString() : "",
    eh_retorno: document.getElementById("con-retorno").value === "sim",
    observacoes: document.getElementById("con-obs").value.trim() || null
  };
  if (!dados.nome_medico || !dados.especialidade || !dataHora) {
    alert("Preencha médico, especialidade e data/horário.");
    return;
  }
  try {
    await api("/consulta-medica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    document.getElementById("consulta-form-wrap").classList.add("hidden");
    await loadConsultas();
    renderConsultas();
  } catch (e) {
    alert("Não foi possível salvar: " + e.message);
  }
}

/* ---------- Payments panel (mensalidade do próprio paciente) ---------- */
async function loadPayments() {
  cache.assinaturas = await api("/assinaturas/paciente/" + session.id_usuario);
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

/* ---------- Settings (apelido local) ---------- */
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
    await loadMedicacoes();
    await loadConsultas();
    renderOverview();
    renderAgenda();
    renderHistory();
    renderMessages();
    renderPayments();
    renderMedicacoes();
    renderConsultas();
    loadSettings();
  } catch (e) {
    console.error("Erro ao carregar painel do paciente:", e);
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

  document.getElementById("add-agenda").addEventListener("click", abrirBuscaCuidador);
  document.getElementById("cancel-match").addEventListener("click", () => {
    document.getElementById("match-form-wrap").classList.add("hidden");
  });
  document.getElementById("save-agenda").addEventListener("click", confirmarAgendamento);
  document.getElementById("cancel-agenda").addEventListener("click", () => {
    document.getElementById("agenda-confirm-wrap").classList.add("hidden");
    cuidadorEscolhido = null;
  });

  document.getElementById("save-settings").addEventListener("click", saveSettings);

  document.getElementById("add-medicacao").addEventListener("click", openMedicacaoForm);
  document.getElementById("save-medicacao").addEventListener("click", saveMedicacao);
  document.getElementById("cancel-medicacao").addEventListener("click", () => {
    document.getElementById("medicacao-form-wrap").classList.add("hidden");
  });

  document.getElementById("add-consulta").addEventListener("click", openConsultaForm);
  document.getElementById("save-consulta").addEventListener("click", saveConsulta);
  document.getElementById("cancel-consulta").addEventListener("click", () => {
    document.getElementById("consulta-form-wrap").classList.add("hidden");
  });

  session = loadSession();
  if (session) showApp(true);
  else showApp(false);
  refreshIcons();
});
