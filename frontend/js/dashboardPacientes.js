/**
 * 📢 INTEGRAÇÃO DINÂMICA DA DASHBOARD (CUIDADO PURO):
 * - Consome: GET /Profissionais (ou a rota equivalente do seu monolito)
 * - Renderiza os cards de cuidadores em tempo real a partir do banco de dados.
 */

// Variável global para armazenar os dados brutos vindos da tabela do Banco de Dados
let listaProfissionais = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarCuidadores();
    configurarEventosDeBusca();
});

// 1. Busca os dados iniciais na API FastAPI
async function carregarCuidadores() {
    const cardsGrid = document.getElementById("cardsGridCuidadores");
    if (!cardsGrid) return;

    try {
        const resposta = await fetch(API_BASE_URL + "/Profissionais", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!resposta.ok) {
            throw new Error("Erro ao coletar dados de profissionais do servidor.");
        }

        // Alimenta a variável global com o array do banco
        listaProfissionais = await resposta.json();

        // Renderiza todos os profissionais de início
        renderizarCards(listaProfissionais);

    } catch (erro) {
        console.error("Erro na busca de cuidadores:", erro);
        cardsGrid.innerHTML = `<p class="erro-dados">Não foi possível carregar a lista de cuidadores. Tente novamente mais tarde.</p>`;
    }
}

// 2. Função responsável exclusivamente por desenhar os cards na tela
function renderizarCards(profissionais) {
    const cardsGrid = document.getElementById("cardsGridCuidadores");
    if (!cardsGrid) return;

    cardsGrid.innerHTML = "";

    if (profissionais.length === 0) {
        cardsGrid.innerHTML = `<p class="sem-dados">Nenhum cuidador corresponde aos filtros selecionados.</p>`;
        return;
    }

    profissionais.forEach(profissional => {
        const card = document.createElement("article");
        card.classList.add("card");

        // === CORREÇÃO: Alinhando com os campos exatos do seu Model do SQLAlchemy ===
        const id = profissional.id_profissional; // Mudou de .id para .id_profissional
        const nome = profissional.nome_profissional || "Profissional";
        const idade = profissional.idade_profissional || "Não informada";
        const experiencia = profissional.tempo_experiencia || "0";
        const fotoPerfil = profissional.foto_url || "../cuidadopuro_teste/img/Design sem nome (2).png";
        const avaliacao = profissional.avaliacao || "5.0";
        
        // Como o seu model tem 'endereco_profissional' em vez de cidade, usamos ele ou quebramos a string se necessário
        const localizacao = profissional.endereco_profissional || "Não informado";

        card.innerHTML = `
            <img src="${fotoPerfil}" alt="Perfil de ${nome}">
            <div class="info">
                <h3>${nome}</h3>
                <p class="meta">${idade} anos · ${experiencia} anos de exp.</p>
                <p class="meta-sub">${localizacao}</p>
                <p class="rating">⭐ ${avaliacao}</p>
                <a href="#" class="btn" onclick="verPerfil(${id})">Ver perfil</a>
            </div>
        `;
        cardsGrid.appendChild(card);
    });
}

// 4. Regra de filtragem lógica combinada (Alinhada com o Banco de Dados)
function filtrarProfissionais() {
    const inputBusca = document.getElementById("inputBusca");
    const selectEspecialidade = document.getElementById("selectEspecialidade");
    const selectCidade = document.getElementById("selectCidade");

    if (!inputBusca) return;

    const termoBusca = inputBusca.value.toLowerCase().trim();
    const especialidadeSelecionada = selectEspecialidade ? selectEspecialidade.value : "todos";
    const cidadeSelecionada = selectCidade ? selectCidade.value : "todos";

    const profissionaisFiltrados = listaProfissionais.filter(profissional => {
        
        // === CORREÇÃO: Mapeando as variáveis internas do filtro para as colunas reais do Model ===
        const nome = (profissional.nome_profissional || "").toLowerCase();
        const endereco = (profissional.endereco_profissional || "").toLowerCase();
        const especialidade = (profissional.especialidade_principal || "").toLowerCase(); // Mudou para especialidade_principal

        // Regra 1: Input de Texto (Busca por Nome, Endereço/Cidade ou Especialidade)
        const bateTexto = termoBusca === "" || 
                          nome.includes(termoBusca) || 
                          endereco.includes(termoBusca) || 
                          especialidade.includes(termoBusca);

        // Regra 2: Select de Especialidade
        const bateEspecialidade = especialidadeSelecionada === "todos" || 
                                  especialidadeSelecionada === "Qualquer especialidade" ||
                                  profissional.especialidade_principal === especialidadeSelecionada;

        // Regra 3: Select de Cidade (Como no banco é o endereço completo, verificamos se o texto do endereço contém a cidade selecionada)
        const bateCidade = cidadeSelecionada === "todos" || 
                           cidadeSelecionada === "Todas as cidades" ||
                           endereco.includes(cidadeSelecionada.toLowerCase());

        return bateTexto && bateEspecialidade && bateCidade;
    });

    renderizarCards(profissionaisFiltrados);
}

function verPerfil(id) {
    console.log("Abrindo perfil do cuidador de ID:", id);
}