// Configuração dinâmica da URL base do API.
// Em localhost, usa a API local. Em produção (Render), front-end e API
// são serviços separados (domínios diferentes), então aponta direto para
// a URL pública da API no Render — troque abaixo se o nome do serviço
// mudar (ver render.yaml / deploy/RENDER_DEPLOY.md).
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://cuidadopuro-api.onrender.com';

console.log('API_BASE_URL:', API_BASE_URL);

// Registra uma visita real nesta página (sem número fantasma: o
// dashboard do ADM lê essa contagem direto do banco).
(function registrarVisita() {
  try {
    const pagina = window.location.pathname;
    fetch(API_BASE_URL + "/tracking/visita?pagina=" + encodeURIComponent(pagina), {
      method: "POST"
    }).catch(() => {});
  } catch (e) {}
})();

// Menu mobile: qualquer página com a navbar padrão (.navbar/.nav-links)
// ganha um botão de hambúrguer funcional, sem precisar editar cada HTML.
document.addEventListener("DOMContentLoaded", function () {
  try {
    const navbar = document.querySelector(".navbar");
    const navLinks = document.querySelector(".nav-links");
    if (!navbar || !navLinks) return;

    let btnMenu = navbar.querySelector(".btn-menu");
    if (!btnMenu) {
      btnMenu = document.createElement("button");
      btnMenu.className = "btn-menu";
      btnMenu.setAttribute("aria-label", "Abrir menu");
      btnMenu.textContent = "☰";
      navbar.appendChild(btnMenu);
    }

    btnMenu.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });

    // Fecha o menu ao navegar para outra âncora/página
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
      });
    });
  } catch (e) {}
});
