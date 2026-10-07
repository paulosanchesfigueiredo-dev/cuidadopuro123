/**
 * Cadastro de cuidador — conecta direto na API real.
 * ROTA: POST /cadastro/cuidador
 * Schema esperado (ver api/schemas.py — CuidadorCreate):
 *   nome, rg, cpf, idade, cidade, cep, telefone, categoria_profissional,
 *   numero_registro_coren (opcional, proibido quando categoria = "sem registro"),
 *   email, senha
 *
 * Os campos de questionário (tempo de experiência, especialidade,
 * procedimentos/dispositivos, detalhes) ainda não têm uma rota própria
 * no backend — não são enviados ao banco nesta etapa (recurso futuro,
 * não número fantasma).
 */
document.addEventListener("DOMContentLoaded", () => {
    const formProfissional = document.getElementById("formProfissional");
    if (!formProfissional) return;

    const categoriaSelect = document.getElementById("prof-categoria");
    const registroInput = document.getElementById("prof-registro");

    // Quando "sem registro" é selecionado, o campo de COREN é esvaziado e
    // desabilitado — a API rejeita COREN preenchido para essa categoria.
    if (categoriaSelect && registroInput) {
        categoriaSelect.addEventListener("change", () => {
            if (categoriaSelect.value === "sem registro") {
                registroInput.value = "";
                registroInput.disabled = true;
            } else {
                registroInput.disabled = false;
            }
        });
    }

    formProfissional.addEventListener("submit", async (e) => {
        e.preventDefault();

        const categoria = categoriaSelect.value;
        const registro = registroInput.value.trim();

        if (categoria !== "sem registro" && !registro) {
            alert("Informe o número do COREN para a categoria profissional selecionada.");
            return;
        }

        const dados = {
            nome: document.getElementById("prof-nome-cadastro").value.trim(),
            rg: document.getElementById("prof-rg").value.trim(),
            cpf: document.getElementById("prof-cpf").value.trim(),
            idade: parseInt(document.getElementById("prof-idade-cadastro").value, 10),
            cidade: document.getElementById("prof-cidade").value.trim(),
            cep: document.getElementById("prof-cep").value.trim(),
            telefone: document.getElementById("prof-telefone").value.trim(),
            categoria_profissional: categoria,
            numero_registro_coren: categoria === "sem registro" ? null : registro,
            email: document.getElementById("prof-email").value.trim(),
            senha: document.getElementById("prof-senha").value
        };

        try {
            const resposta = await fetch(API_BASE_URL + "/cadastro/cuidador", {
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
                alert("Erro no cadastro: " + (resultado.detail || "Verifique as informações preenchidas."));
            }
        } catch (erro) {
            alert("Não foi possível conectar ao servidor. A API está rodando em " + API_BASE_URL + "?");
            console.error("Erro na requisição:", erro);
        }
    });
});
