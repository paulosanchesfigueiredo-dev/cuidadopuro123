document.addEventListener("DOMContentLoaded", () => {
    const formPaciente = document.getElementById("formPaciente");
    const formProfissional = document.getElementById("formProfissional");

    // ================= ENVIO DE PACIENTE =================
    if (formPaciente) {
        formPaciente.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dados = {
                nome_cliente: document.getElementById("paciente_nome").value,
                rg_cliente: parseFloat(document.getElementById("paciente_rg").value),
                cpf_cliente: parseFloat(document.getElementById("paciente_cpf").value),
                endereco_cliente: document.getElementById("paciente_endereco").value,
                telefone_cliente: parseFloat(document.getElementById("paciente_telefone").value),
                idade_cliente: parseInt(document.getElementById("paciente_idade").value),
                email_cliente: document.getElementById("paciente_email").value,
                senha_cliente: document.getElementById("paciente_senha").value
            };

            try {
                const resposta = await fetch(API_BASE_URL + "/Clientes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    alert("Paciente cadastrado com sucesso!");
                    window.location.href = "telaLogin.html";
                } else {
                    alert("Erro no cadastro: " + (resultado.detail || "Verifique as informações."));
                }
            } catch (erro) {
                alert("Não foi possível conectar ao servidor.");
            }
        });
    }

    // ================= ENVIO DE PROFISSIONAL =================
    if (formProfissional) {
        formProfissional.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dados = {
                nome_profissional: document.getElementById("prof_nome").value,
                rg_profissional: parseFloat(document.getElementById("prof_rg").value),
                cpf_profissional: parseFloat(document.getElementById("prof_cpf").value),
                endereco_profissional: document.getElementById("prof_endereco").value,
                telefone_profissional: parseFloat(document.getElementById("prof_telefone").value),
                idade_profissional: parseInt(document.getElementById("prof_idade").value),
                email_profissional: document.getElementById("prof_email").value,
                senha_profissional: document.getElementById("prof_senha").value
            };

            try {
                const resposta = await fetch(API_BASE_URL + "/Profissionais", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    alert("Profissional cadastrado com sucesso!");
                    window.location.href = "telaLogin.html";
                } else {
                    alert("Erro no cadastro: " + (resultado.detail || "Verifique as informações."));
                }
            } catch (erro) {
                alert("Não foi possível conectar ao servidor.");
            }
        });
    }
});