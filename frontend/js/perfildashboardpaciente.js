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
    console.log("Dados do paciente logado:", usuario);

    // 2. Preenche os dados comuns na tela (Ajustado para bater com o cadastro de Clientes)
    document.getElementById("perf-nome").textContent = usuario.nome_cliente || "Não informado";
    document.getElementById("perf-email").textContent = usuario.email_cliente || "Não informado";
    document.getElementById("perf-telefone").textContent = usuario.telefone_cliente || "Não informado";
    document.getElementById("perf-endereco").textContent = usuario.endereco_cliente || "Não informado";
    document.getElementById("perf-idade").textContent = usuario.idade_cliente || "--";

    // 3. Preenche as informações exclusivas de Saúde do Paciente
    document.getElementById("perf-suporte").textContent = usuario.nivel_suporte || "Não informado";
    document.getElementById("perf-observacoes").textContent = usuario.observacoes || "Nenhuma restrição ou observação cadastrada.";
});