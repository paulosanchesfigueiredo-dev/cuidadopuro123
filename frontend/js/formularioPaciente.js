/**
 * Cadastro de paciente — conecta direto na API real.
 * ROTA: POST /cadastro/paciente
 * Schema esperado (ver api/schemas.py — PacienteCreate):
 *   nome, rg, cpf, data_nascimento (YYYY-MM-DD), telefone, cidade, cep,
 *   email, senha, telefone_responsavel (opcional)
 *
 * Os campos clínicos do formulário (condição principal, nível de suporte,
 * observações) ainda não têm uma rota própria no backend — ficam salvos
 * apenas no questionário visualmente, mas não são enviados ao banco nesta
 * etapa (não é número fantasma: é um recurso futuro, não implementado).
 */
document.addEventListener("DOMContentLoaded", () => {
    const formPaciente = document.getElementById("formPaciente");
    if (!formPaciente) return;

    formPaciente.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dados = {
            nome: document.getElementById("paciente-nome").value.trim() || document.getElementById("paciente-nome-cadastro").value.trim(),
            rg: document.getElementById("paciente-rg").value.trim(),
            cpf: document.getElementById("paciente-cpf").value.trim(),
            data_nascimento: document.getElementById("paciente-data-nascimento").value,
            telefone: document.getElementById("paciente-telefone").value.trim(),
            cidade: document.getElementById("paciente-cidade").value.trim(),
            cep: document.getElementById("paciente-cep").value.trim(),
            email: document.getElementById("paciente-email").value.trim(),
            senha: document.getElementById("paciente-senha").value,
            telefone_responsavel: null
        };

        try {
            const resposta = await fetch(API_BASE_URL + "/cadastro/paciente", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            const resultado = await resposta.json();

            if (resposta.ok) {
                alert("Cadastro enviado com sucesso! Seu acesso será liberado após a aprovação do administrador.");
                window.location.href = "telaLogin.html";
            } else if (Array.isArray(resultado.detail)) {
                const mensagensErro = resultado.detail.map((err) => {
                    const campo = err.loc[err.loc.length - 1];
                    return `Campo [${campo}]: ${err.msg}`;
                }).join("\n");
                alert("Erro de validação no formulário:\n\n" + mensagensErro);
            } else {
                alert("Erro no cadastro: " + (resultado.detail || "Verifique as informações."));
            }
        } catch (erro) {
            alert("Não foi possível conectar ao servidor. A API está rodando em " + API_BASE_URL + "?");
            console.error("Erro na requisição:", erro);
        }
    });
});
