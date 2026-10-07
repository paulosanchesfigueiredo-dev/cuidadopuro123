// Variável global para armazenar os dados dos clientes/pacientes vindos do Banco de Dados
let listaClientes = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarPacientes();
    configurarEventosFiltro();
});

// 1. Busca os dados iniciais da tabela Clientes na API FastAPI
async function carregarPacientes() {
    const cardsGrid = document.getElementById("cardsGridPacientes");
    
    if (!cardsGrid) return;

    try {
        const resposta = await fetch(API_BASE_URL + "/Clientes", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível obter a lista de clientes do servidor.");
        }

        // Armazena o JSON na variável global
        listaClientes = await resposta.json();

        // Renderiza todos os registros encontrados inicialmente
        renderizarCardsPacientes(listaClientes);

    } catch (erro) {
        console.error("Erro ao processar o carregamento da lista de pacientes:", erro);
        cardsGrid.innerHTML = `<p class="erro-dados">Houve um problema ao carregar os painéis de pacientes. Tente recarregar a página.</p>`;
    }
}

// 2. Função responsável por renderizar os cards dinamicamente na tela
function renderizarCardsPacientes(clientes) {
    const cardsGrid = document.getElementById("cardsGridPacientes");
    if (!cardsGrid) return;

    // Limpa a grade para evitar duplicações
    cardsGrid.innerHTML = "";

    if (clientes.length === 0) {
        cardsGrid.innerHTML = `<p class="sem-dados">Nenhum paciente corresponde aos filtros selecionados no momento.</p>`;
        return;
    }

    clientes.forEach(cliente => {
        const card = document.createElement("article");
        card.classList.add("card");

        // Definição de propriedades baseadas nas colunas do banco de dados
        const nome = cliente.nome_paciente || cliente.nome_cliente || "Paciente Oculto";
        const idade = cliente.idade_paciente ? `${cliente.idade_paciente} anos` : "Idade não informada";
        const nivelSuporte = cliente.nivel_suporte || "A combinar";
        const fotoPerfil = cliente.foto_url || "../cuidadopuro_teste/img/Design sem nome (2).png";
        const avaliacao = cliente.avaliacao_cadastro || "5.0";
        const cidade = cliente.cidade || "Não informada";
        const idDoCliente = cliente.id_cliente || cliente.id;

        card.innerHTML = `
            <img src="${fotoPerfil}" alt="Perfil de ${nome}">
            <div class="info">
                <h3>${nome}</h3>
                <p class="meta">${idade} · ${nivelSuporte}</p>
                <p class="meta-sub">${cidade}</p>
                <p class="rating">⭐ ${avaliacao}</p>
                <a href="#" class="btn" onclick="verPerfilPaciente(${idDoCliente})">Ver perfil</a>
            </div>
        `;

        cardsGrid.appendChild(card);
    });
}

// 3. Adiciona os escutadores (Listeners) para monitorar ações do usuário
function configurarEventosFiltro() {
    const inputBusca = document.getElementById("inputBuscaPaciente");
    const selectNecessidade = document.getElementById("selectNecessidade");
    const selectPeriodo = document.getElementById("selectPeriodo");
    const selectCidade = document.getElementById("selectCidade");
    const btnBuscar = document.getElementById("btnBuscarPaciente");

    // Filtra dinamicamente a cada tecla digitada
    if (inputBusca) inputBusca.addEventListener("input", filtrarPacientes);

    // Filtra instantaneamente ao mudar qualquer uma das opções
    if (selectNecessidade) selectNecessidade.addEventListener("change", filtrarPacientes);
    if (selectPeriodo) selectPeriodo.addEventListener("change", filtrarPacientes);
    if (selectCidade) selectCidade.addEventListener("change", filtrarPacientes);

    // Previne recarregamento se clicarem no botão estático Buscar
    if (btnBuscar) {
        btnBuscar.addEventListener("click", (e) => {
            e.preventDefault();
            filtrarPacientes();
        });
    }
}

// 4. Regra lógica que processa e cruza os dados dos 4 filtros na memória
function filtrarPacientes() {
    const termoBusca = document.getElementById("inputBuscaPaciente").value.toLowerCase().trim();
    const necessidadeSelecionada = document.getElementById("selectNecessidade").value;
    const periodoSelecionado = document.getElementById("selectPeriodo").value;
    const cidadeSelecionada = document.getElementById("selectCidade").value;

    const pacientesFiltrados = listaClientes.filter(cliente => {
        // Normalização das strings do banco para evitar conflito de caixa alta/baixa
        const nomePaciente = (cliente.nome_paciente || "").toLowerCase();
        const nomeResponsavel = (cliente.nome_cliente || "").toLowerCase();
        const cidadeCliente = (cliente.cidade || "").toLowerCase();
        const suporte = (cliente.nivel_suporte || "").toLowerCase();

        // Condição 1: Input de texto livre (Valida por nome, cidade ou nível de suporte)
        const bateTexto = termoBusca === "" || 
                          nomePaciente.includes(termoBusca) || 
                          nomeResponsavel.includes(termoBusca) ||
                          cidadeCliente.includes(termoBusca) || 
                          suporte.includes(termoBusca);

        // Condição 2: Filtro por Nível de Suporte / Necessidade
        const bateNecessidade = necessidadeSelecionada === "todos" || 
                                cliente.nivel_suporte === necessidadeSelecionada;

        // Condição 3: Filtro por Período de Trabalho (caso essa propriedade exista na tabela Clientes)
        const batePeriodo = periodoSelecionado === "todos" || 
                            cliente.periodo_necessario === periodoSelecionado;

        // Condição 4: Filtro por Cidade
        const bateCidade = cidadeSelecionada === "todos" || 
                           cliente.cidade === cidadeSelecionada;

        // Só mantém o card se ele satisfizer todas as 4 regras de busca juntas
        return bateTexto && bateNecessidade && batePeriodo && bateCidade;
    });

    // Redesenha a tela em tempo real com o array refinado
    renderizarCardsPacientes(pacientesFiltrados);
}

function verPerfilPaciente(id) {
    console.log("Exibindo perfil detalhado do paciente com ID:", id);
}