document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");

    if (!formLogin) return;

    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();

        const emailVal = document.getElementById("login_email").value;
        const senhaVal = document.getElementById("login_senha").value;

        try {
            const resposta = await fetch(API_BASE_URL + "/Login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailVal, senha: senhaVal })
            });

            const resultado = await resposta.json();

            if (resposta.ok) {
                // Armazena as informações da sessão para usar nas telas internas
                localStorage.setItem("usuario_logado", JSON.stringify(resultado));

                // REGRA DE REDIRECIONAMENTO POR PERFIL SOLICITADA
                if (resultado.tipo_usuario === "paciente") {
                    window.location.href = "dashboardPacienteApp.html"; 
                } else if (resultado.tipo_usuario === "cuidador") {
                    window.location.href = "dashboardCuidador.html"; 
                }
            } else {                
                alert(resultado.detail || "E-mail ou senha inválidos.");
            }
        } catch (erro) {
            alert("Erro crítico: Não foi possível estabelecer conexão com o backend.");
        }
    });
});
// Código para realizar a saida dos dados do sistema apos sair do dashboard

document.addEventListener("DOMContentLoaded", () => {
    const btnSair = document.getElementById("btnSair");

    if (btnSair) {
        btnSair.addEventListener("click", () => {
            // Limpa os dados do usuário salvos no navegador durante o login
            localStorage.removeItem("usuario_logado");
            localStorage.removeItem("usuario_sessao");
            
            // Opcional: Se quiser limpar absolutamente tudo do histórico local
            // localStorage.clear();
        });
    }
});
