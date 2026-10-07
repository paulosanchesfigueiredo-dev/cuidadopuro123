/**
 * Chat cuidador ↔ paciente — Cuidado Puro
 * Sem número fantasma: a sessão vem do login real ("usuario_logado"), as
 * conversas são os agendamentos (cuidado) reais do usuário, e as mensagens
 * vêm de POST/GET /mensagens — chat só é liberado depois de um agendamento.
 */
let session = null; // { tipo_usuario, id_usuario, nome }
let conversas = []; // lista enriquecida (agenda do paciente ou do cuidador)
let activeConvId = null;
let pollTimer = null;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function dayKey(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

async function api(path, options) {
  const res = await fetch(API_BASE_URL + path, options);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || ("Erro " + res.status));
  }
  return res.status === 204 ? null : res.json();
}

/* ---------- Sessão ---------- */
function loadSession() {
  try {
    const raw = localStorage.getItem("usuario_logado");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.id_usuario || (parsed.tipo_usuario !== "paciente" && parsed.tipo_usuario !== "cuidador")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function enterChat() {
  document.getElementById("role-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("role-badge").textContent = session.tipo_usuario === "paciente" ? "Paciente" : "Cuidador";
  document.getElementById("user-label").textContent = session.nome || "";
  showThreadEmpty();
  carregarConversas();
  refreshIcons();
}

function logout() {
  localStorage.removeItem("usuario_logado");
  window.location.href = "telaLogin.html";
}

/* ---------- Conversas (agendamentos reais do usuário) ---------- */
async function carregarConversas() {
  const path = session.tipo_usuario === "paciente"
    ? "/paciente/" + session.id_usuario + "/agenda"
    : "/cuidador/" + session.id_usuario + "/agenda";
  try {
    const agenda = await api(path);
    conversas = agenda.filter((a) => a.status !== "cancelado").map((a) => ({
      id_cuidado: a.id_cuidado,
      outroNome: session.tipo_usuario === "paciente" ? a.nome_cuidador : a.nome_paciente,
      outroTipo: session.tipo_usuario === "paciente" ? "cuidador" : "paciente",
      status: a.status,
      ultimaMensagem: null,
      ultimaHora: null
    }));
    await Promise.all(conversas.map(async (c) => {
      const msgs = await api("/mensagens/" + c.id_cuidado).catch(() => []);
      if (msgs.length) {
        const ultima = msgs[msgs.length - 1];
        c.ultimaMensagem = ultima.texto;
        c.ultimaHora = ultima.enviado_em;
      }
    }));
    renderConvList();
  } catch (e) {
    document.getElementById("conv-list").innerHTML =
      '<p class="empty-conv">Não foi possível carregar suas conversas: ' + escapeHtml(e.message) + '</p>';
  }
}

function renderConvList() {
  const q = (document.getElementById("conv-search").value || "").toLowerCase();
  const box = document.getElementById("conv-list");

  const filtered = conversas
    .filter((c) => !q || (c.outroNome || "").toLowerCase().includes(q) || (c.ultimaMensagem || "").toLowerCase().includes(q))
    .sort((a, b) => (b.ultimaHora || "").localeCompare(a.ultimaHora || ""));

  if (!filtered.length) {
    box.innerHTML = '<p class="empty-conv">Nenhuma conversa ainda. O chat é liberado após um agendamento.</p>';
    return;
  }

  box.innerHTML = filtered.map((c) => {
    const active = c.id_cuidado === activeConvId ? "active" : "";
    const avClass = c.outroTipo === "cuidador" ? "cuidador" : "";
    return `<div class="conv-item ${active}" data-id="${c.id_cuidado}">
      <div class="avatar ${avClass}">${escapeHtml(initials(c.outroNome))}</div>
      <div class="conv-body">
        <div class="conv-top">
          <span class="conv-name">${escapeHtml(c.outroNome)}</span>
          <span class="conv-time">${escapeHtml(formatTime(c.ultimaHora))}</span>
        </div>
        <p class="conv-preview">${escapeHtml(c.ultimaMensagem || "Sem mensagens — agendamento: " + c.status)}</p>
      </div>
    </div>`;
  }).join("");

  box.querySelectorAll(".conv-item").forEach((el) => {
    el.addEventListener("click", () => openConversation(Number(el.dataset.id)));
  });
}

/* ---------- Thread ---------- */
function showThreadEmpty() {
  document.getElementById("thread-empty").classList.remove("hidden");
  document.getElementById("thread-active").classList.add("hidden");
  document.getElementById("thread-active").style.display = "none";
}

async function openConversation(id_cuidado) {
  activeConvId = id_cuidado;
  const conv = conversas.find((c) => c.id_cuidado === id_cuidado);
  if (!conv) return;

  document.getElementById("thread-empty").classList.add("hidden");
  const active = document.getElementById("thread-active");
  active.classList.remove("hidden");
  active.style.display = "flex";

  document.getElementById("thread-name").textContent = conv.outroNome;
  document.getElementById("thread-sub").textContent =
    (conv.outroTipo === "cuidador" ? "Cuidador" : "Paciente") + " · agendamento " + conv.status;
  const av = document.getElementById("thread-avatar");
  av.textContent = initials(conv.outroNome);
  av.className = "avatar" + (conv.outroTipo === "cuidador" ? " cuidador" : "");

  await renderMessages();
  renderConvList();
  refreshIcons();

  if (window.innerWidth <= 720) {
    document.getElementById("conv-panel").classList.remove("visible-mobile");
    document.getElementById("conv-panel").style.display = "none";
    const backBtn = document.getElementById("back-to-list");
    backBtn.classList.remove("hidden");
    backBtn.style.display = "inline-flex";
  }

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (activeConvId === id_cuidado) renderMessages(); }, 8000);
}

function voltarParaLista() {
  document.getElementById("conv-panel").style.display = "flex";
  document.getElementById("conv-panel").classList.add("visible-mobile");
  document.getElementById("thread-active").style.display = "none";
  document.getElementById("thread-active").classList.add("hidden-mobile");
}

async function renderMessages() {
  const box = document.getElementById("messages");
  if (!activeConvId) return;
  let msgs;
  try {
    msgs = await api("/mensagens/" + activeConvId);
  } catch (e) {
    box.innerHTML = '<p class="empty-conv">Não foi possível carregar as mensagens.</p>';
    return;
  }
  if (!msgs.length) {
    box.innerHTML = '<p class="empty-conv">Nenhuma mensagem ainda. Diga olá!</p>';
    return;
  }

  let html = "";
  let lastDay = "";
  msgs.forEach((m) => {
    const day = dayKey(m.enviado_em);
    if (day !== lastDay) {
      html += `<div class="day-sep">${escapeHtml(day)}</div>`;
      lastDay = day;
    }
    const mine = m.remetente_tipo === session.tipo_usuario && m.remetente_id === session.id_usuario;
    html += `<div class="bubble-row ${mine ? "mine" : "theirs"}">
      <div class="bubble">
        ${escapeHtml(m.texto)}
        <div class="bubble-meta">${escapeHtml(formatTime(m.enviado_em))}</div>
      </div>
    </div>`;
  });
  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("msg-input");
  const texto = input.value.trim();
  if (!texto || !activeConvId) return;

  input.value = "";
  input.style.height = "auto";

  try {
    await api("/mensagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_cuidado: activeConvId,
        remetente_tipo: session.tipo_usuario,
        remetente_id: session.id_usuario,
        texto
      })
    });
    await renderMessages();
    const conv = conversas.find((c) => c.id_cuidado === activeConvId);
    if (conv) { conv.ultimaMensagem = texto; conv.ultimaHora = new Date().toISOString(); }
    renderConvList();
  } catch (e) {
    alert("Não foi possível enviar: " + e.message);
    input.value = texto;
  }
}

/* ---------- Init ---------- */
function refreshIcons() {
  if (typeof lucide !== "undefined") lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("switch-role").addEventListener("click", logout);
  document.getElementById("back-site").addEventListener("click", () => {
    window.location.href = "../index.html";
  });

  document.getElementById("conv-search").addEventListener("input", renderConvList);

  const backBtn = document.getElementById("back-to-list");
  if (backBtn) backBtn.addEventListener("click", voltarParaLista);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) {
      document.getElementById("conv-panel").style.display = "";
      document.getElementById("conv-panel").classList.remove("visible-mobile");
      if (activeConvId) {
        document.getElementById("thread-active").style.display = "flex";
      }
    }
  });

  document.getElementById("send-btn").addEventListener("click", sendMessage);
  const input = document.getElementById("msg-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  session = loadSession();
  if (session) enterChat();
  refreshIcons();
});
