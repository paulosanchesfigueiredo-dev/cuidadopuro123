// Garante que o código só vai rodar depois que todo o HTML estiver carregado
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. EFEITO DE SCROLL NA NAVBAR ---
    const navbar = document.querySelector(".navbar");

    window.addEventListener("scroll", () => {
        // Se o usuário rolar mais de 50 pixels para baixo
        if (window.scrollY > 50) {
            navbar.style.background = "rgba(46, 0, 139, 0.95)"; // Fundo mais sólido com a cor do seu gradiente
            navbar.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)"; // Sombra elegante
            navbar.style.height = "80px"; // Dá uma leve encolhida charmosa na barra
        } else {
            navbar.style.background = "rgba(255, 255, 255, 0.08)"; // Volta ao estado original do seu CSS
            navbar.style.boxShadow = "none";
            navbar.style.height = "90px";
        }
    });

    // --- 2. DIRECIONAMENTO DOS BOTÕES PRINCIPAIS ---
    const btnProfissional = document.getElementById("btn-profissional");
    const btnCliente = document.getElementById("btn-cliente");

    // Ação ao clicar em "Sou profissional"
    btnProfissional.addEventListener("click", (evento) => {
        evento.preventDefault(); // Impede o comportamento padrão do '#'
        
        console.log("Acessando área do Profissional...");
        
        // No futuro, quando criar a tela de login do profissional, substitua a linha abaixo por:
        // window.location.href = "login-profissional.html";
        alert("Direcionando para a área do Profissional de Saúde!");
    });

    // Ação ao clicar em "Sou cliente"
    btnCliente.addEventListener("click", (evento) => {
        evento.preventDefault(); 
        
        console.log("Acessando área do Cliente...");
        
        // No futuro, quando criar a tela de login do cliente, substitua a linha abaixo por:
        // window.location.href = "login-cliente.html";
        alert("Direcionando para a área do Cliente / Paciente!");
    });

    // --- 3. BOTÃO ENTRAR (NAVBAR) ---
    const btnLogin = document.querySelector(".btn-login");
    
    btnLogin.addEventListener("click", () => {
        alert("Abrindo portal de acesso Cuidado Puro.");
    });
});