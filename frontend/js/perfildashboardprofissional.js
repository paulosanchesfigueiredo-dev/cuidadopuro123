document.addEventListener("DOMContentLoaded", () => {
    // 1. Pega os dados que o login.js guardou no navegador
    const dadosUsuarioRaw = localStorage.getItem("usuario_logado");

    // Se não tiver nenhum usuário logado, expulsa para a tela de login
    if (!dadosUsuarioRaw) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "telaLogin.html";
        return;
    }

    const usuario = JSON.parse(dadosUsuarioRaw);
    console.log("Dados do profissional logado:", usuario);

    // 2. Preenche os dados na tela mapeados com o backend do Profissional
    document.getElementById("perf-nome").textContent = usuario.nome_profissional || "Não informado";
    document.getElementById("perf-email").textContent = usuario.email_profissional || "Não informado";
    document.getElementById("perf-telefone").textContent = usuario.telefone_profissional || "Não informado";
    document.getElementById("perf-endereco").textContent = usuario.endereco_profissional || "Não informado";
    document.getElementById("perf-idade").textContent = usuario.idade_profissional || "--";

    // Dados técnicos/profissionais
    document.getElementById("perf-registro").textContent = usuario.registro_profissional || "Não informado";
    document.getElementById("perf-experiencia").textContent = usuario.tempo_experiencia || "Não informado";
    document.getElementById("perf-especialidade").textContent = usuario.especialidade_principal || "Não informado";
    document.getElementById("perf-dispositivos").textContent = usuario.procedimentos_dispositivos || "Não informado";
    document.getElementById("perf-detalhes").textContent = usuario.detalhes_capacitacao || "Nenhuma descrição informada.";
});