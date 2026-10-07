-- ============================================================
-- CUIDADO PURO — BANCO DE DADOS COMPLETO (V2)
-- Banco robusto e profissional, desenhado para suportar tudo que
-- o front-end atual precisa E funcionalidades futuras (Modo Pós-Alta,
-- planos, assinaturas, chat, familiares corresponsáveis).
-- Baseado no schema MySQL já em produção (KINGREIABS.docx / main.py
-- FastAPI), estendido conforme definido com o responsável pelo banco.
-- ============================================================

-- ============================================================
-- LIMPEZA TOTAL (permite rodar quantas vezes precisar)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS cuidado_puro_v2;
SET FOREIGN_KEY_CHECKS = 1;

CREATE DATABASE IF NOT EXISTS cuidado_puro_v2
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cuidado_puro_v2;

-- ============================================================
-- 1. EQUIPE_INTERNA — os 8 papéis internos (ADM, suporte, SAC,
--    financeiro, marketing, comercial, frontend, backend)
-- ============================================================
CREATE TABLE equipe_interna (
    id_equipe           INT AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(100) NOT NULL,
    cpf                 VARCHAR(14)  NOT NULL,
    idade               INT          NOT NULL,
    cidade              VARCHAR(100) NOT NULL,
    cep                 VARCHAR(9)   NOT NULL,
    telefone            VARCHAR(20)  NOT NULL,
    email               VARCHAR(150) NOT NULL,
    senha               VARCHAR(255) NOT NULL,
    nivel_acesso        ENUM('ADM','suporte','SAC','financeiro','marketing','comercial','frontend','backend') NOT NULL,
    status              ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
    data_criacao        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_equipe_cpf   UNIQUE (cpf),
    CONSTRAINT uq_equipe_email UNIQUE (email),
    CONSTRAINT ck_equipe_idade CHECK (idade >= 18)
);

-- ============================================================
-- 2. CUIDADOR
-- ============================================================
CREATE TABLE cuidador (
    id_cuidador                INT AUTO_INCREMENT PRIMARY KEY,
    nome                        VARCHAR(100) NOT NULL,
    rg                          VARCHAR(20)  NOT NULL,
    cpf                         VARCHAR(14)  NOT NULL,
    idade                       INT          NOT NULL,
    cidade                      VARCHAR(100) NOT NULL,
    cep                         VARCHAR(9)   NOT NULL,
    telefone                    VARCHAR(20)  NOT NULL,
    categoria_profissional      ENUM('sem registro','auxiliar de enfermagem','técnico de enfermagem','enfermeiro') NOT NULL,
    numero_registro_coren       VARCHAR(50)  DEFAULT NULL,
    email                       VARCHAR(150) NOT NULL,
    senha                       VARCHAR(255) NOT NULL,
    status_cadastro             ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
    data_criacao                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cuidador_cpf   UNIQUE (cpf),
    CONSTRAINT uq_cuidador_email UNIQUE (email),
    CONSTRAINT ck_cuidador_idade CHECK (idade >= 18),
    -- só pode ter número de COREN se a categoria exigir registro
    CONSTRAINT ck_cuidador_coren CHECK (
        (categoria_profissional = 'sem registro' AND numero_registro_coren IS NULL)
        OR (categoria_profissional <> 'sem registro')
    )
);

-- ============================================================
-- 3. PACIENTE
-- ============================================================
CREATE TABLE paciente (
    id_paciente          INT AUTO_INCREMENT PRIMARY KEY,
    nome                  VARCHAR(100) NOT NULL,
    rg                    VARCHAR(20)  NOT NULL,
    cpf                   VARCHAR(14)  NOT NULL,
    data_nascimento       DATE         NOT NULL,
    telefone              VARCHAR(20)  NOT NULL,
    cidade                VARCHAR(100) NOT NULL,
    cep                   VARCHAR(9)   NOT NULL,
    email                 VARCHAR(150) NOT NULL,
    senha                 VARCHAR(255) NOT NULL,
    telefone_responsavel  VARCHAR(20)  DEFAULT NULL,
    status_cadastro       ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
    data_criacao          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_paciente_cpf   UNIQUE (cpf),
    CONSTRAINT uq_paciente_email UNIQUE (email)
);

-- ============================================================
-- 4. FAMILIAR — corresponsável pelo paciente, login próprio
-- ============================================================
CREATE TABLE familiar (
    id_familiar    INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    cpf             VARCHAR(14)  NOT NULL,
    email           VARCHAR(150) NOT NULL,
    senha           VARCHAR(255) NOT NULL,
    telefone        VARCHAR(20)  NOT NULL,
    data_criacao    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_familiar_cpf   UNIQUE (cpf),
    CONSTRAINT uq_familiar_email UNIQUE (email)
);

-- ============================================================
-- 5. PACIENTE_FAMILIAR — N:M (um paciente pode ter vários
--    familiares responsáveis; um familiar pode acompanhar vários
--    pacientes, ex. filho cuidando de pai e mãe)
-- ============================================================
CREATE TABLE paciente_familiar (
    id_paciente_familiar  INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente            INT NOT NULL,
    id_familiar            INT NOT NULL,
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_familiar) REFERENCES familiar(id_familiar) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_pac_fam UNIQUE (id_paciente, id_familiar)
);

-- ============================================================
-- 6. NECESSIDADE (catálogo)
-- ============================================================
CREATE TABLE necessidade (
    id_necessidade    INT AUTO_INCREMENT PRIMARY KEY,
    nome_necessidade   VARCHAR(100) NOT NULL,
    grau_dependencia   ENUM('leve','moderado','alto') NOT NULL
);

-- ============================================================
-- 7. HABILIDADE (catálogo)
-- ============================================================
CREATE TABLE habilidade (
    id_habilidade     INT AUTO_INCREMENT PRIMARY KEY,
    nome_habilidade    VARCHAR(100) NOT NULL,
    restrita_tecnico   ENUM('sim','não') NOT NULL
);

-- ============================================================
-- 8. PACIENTE_NECESSIDADE — N:M
-- ============================================================
CREATE TABLE paciente_necessidade (
    id_paciente_necessidade  INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente               INT NOT NULL,
    id_necessidade             INT NOT NULL,
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_necessidade) REFERENCES necessidade(id_necessidade) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_pac_nec UNIQUE (id_paciente, id_necessidade)
);

-- ============================================================
-- 9. CUIDADO — agendamentos (SEM pagamento: a plataforma só
--    intermedia, não cobra pelo serviço entre as partes)
-- ============================================================
CREATE TABLE cuidado (
    id_cuidado         INT AUTO_INCREMENT PRIMARY KEY,
    id_cuidador         INT NOT NULL,
    id_paciente         INT NOT NULL,
    data_agendamento    DATETIME NOT NULL,
    status              ENUM('agendado','em andamento','concluído','cancelado') NOT NULL DEFAULT 'agendado',
    FOREIGN KEY (id_cuidador) REFERENCES cuidador(id_cuidador) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- 10. CUIDADO_TAREFA — checklist de tarefas/habilidades executadas
-- ============================================================
CREATE TABLE cuidado_tarefa (
    id_cuidado_tarefa  INT AUTO_INCREMENT PRIMARY KEY,
    id_cuidado          INT NOT NULL,
    id_habilidade       INT NOT NULL,
    realizado           ENUM('sim','não') NOT NULL DEFAULT 'não',
    FOREIGN KEY (id_cuidado) REFERENCES cuidado(id_cuidado) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_habilidade) REFERENCES habilidade(id_habilidade) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- 11. PLANO — básico/padrão/premium (cuidador) e único (paciente)
-- ============================================================
CREATE TABLE plano (
    id_plano         INT AUTO_INCREMENT PRIMARY KEY,
    nome              ENUM('básico','padrão','premium','único') NOT NULL,
    valor             DECIMAL(10,2) NOT NULL,
    inclui_destaque   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_plano_nome UNIQUE (nome)
);

-- ============================================================
-- 12. ASSINATURA — mensalidade via Pix (cuidador ou paciente),
--     controlada pelo financeiro: pago / pendente / atrasado
-- ============================================================
CREATE TABLE assinatura (
    id_assinatura     INT AUTO_INCREMENT PRIMARY KEY,
    tipo_usuario       ENUM('cuidador','paciente') NOT NULL,
    id_usuario         INT NOT NULL, -- referencia id_cuidador OU id_paciente conforme tipo_usuario
    id_plano           INT NOT NULL,
    status_pagamento   ENUM('pago','pendente','atrasado') NOT NULL DEFAULT 'pendente',
    data_vencimento    DATE NOT NULL,
    data_pagamento     DATETIME DEFAULT NULL,
    FOREIGN KEY (id_plano) REFERENCES plano(id_plano) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- 13. MEDICACAO — Modo Pós-Alta
-- ============================================================
CREATE TABLE medicacao (
    id_medicacao       INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente         INT NOT NULL,
    nome_medicamento    VARCHAR(150) NOT NULL,
    dosagem             VARCHAR(100) NOT NULL,
    horario             VARCHAR(100) NOT NULL,
    data_inicio         DATE NOT NULL,
    data_fim            DATE DEFAULT NULL,
    observacoes         TEXT DEFAULT NULL,
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 14. CONSULTA_MEDICA — Modo Pós-Alta
-- ============================================================
CREATE TABLE consulta_medica (
    id_consulta     INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente      INT NOT NULL,
    data_consulta    DATETIME NOT NULL,
    nome_medico      VARCHAR(150) NOT NULL,
    especialidade    VARCHAR(100) NOT NULL,
    eh_retorno       BOOLEAN NOT NULL DEFAULT FALSE,
    observacoes      TEXT DEFAULT NULL,
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 15. MENSAGEM — chat básico entre cuidador e paciente (liberado
--     após o match / dentro de um agendamento)
-- ============================================================
CREATE TABLE mensagem (
    id_mensagem         INT AUTO_INCREMENT PRIMARY KEY,
    id_cuidado           INT NOT NULL,
    remetente_tipo       ENUM('cuidador','paciente') NOT NULL,
    remetente_id         INT NOT NULL, -- id_cuidador OU id_paciente conforme remetente_tipo
    texto                TEXT NOT NULL,
    enviado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cuidado) REFERENCES cuidado(id_cuidado) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- 16. VISITA — contador real de tráfego do site (sem número
--     fantasma: cada acesso a uma página grava uma linha aqui)
-- ============================================================
CREATE TABLE visita (
    id_visita    INT AUTO_INCREMENT PRIMARY KEY,
    pagina        VARCHAR(150) NOT NULL,
    criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ÍNDICES DE APOIO
-- ============================================================
CREATE INDEX idx_cuidado_cuidador ON cuidado(id_cuidador);
CREATE INDEX idx_cuidado_paciente ON cuidado(id_paciente);
CREATE INDEX idx_mensagem_cuidado ON mensagem(id_cuidado);
CREATE INDEX idx_medicacao_paciente ON medicacao(id_paciente);
CREATE INDEX idx_consulta_paciente ON consulta_medica(id_paciente);
CREATE INDEX idx_assinatura_usuario ON assinatura(tipo_usuario, id_usuario);
CREATE INDEX idx_visita_criado_em ON visita(criado_em);

-- ============================================================
-- CARGA DE DADOS DE TESTE
-- ============================================================

-- Equipe interna (um de cada papel, pra já testar o ADM aprovando cadastros)
INSERT INTO equipe_interna (nome, cpf, idade, cidade, cep, telefone, email, senha, nivel_acesso, status) VALUES
('Paulo Henrique', '111.111.111-11', 24, 'Maringá', '87000-000', '(44) 99911-0001', 'paulo.adm@cuidadopuro.com', 'hash_senha_adm', 'ADM', 'ativo'),
('Equipe Suporte', '222.222.222-22', 30, 'Maringá', '87000-001', '(44) 99911-0002', 'suporte@cuidadopuro.com', 'hash_senha_suporte', 'suporte', 'ativo'),
('Equipe SAC', '333.333.333-33', 28, 'Maringá', '87000-002', '(44) 99911-0003', 'sac@cuidadopuro.com', 'hash_senha_sac', 'SAC', 'ativo'),
('Equipe Financeiro', '444.444.444-44', 35, 'Maringá', '87000-003', '(44) 99911-0004', 'financeiro@cuidadopuro.com', 'hash_senha_financeiro', 'financeiro', 'ativo'),
('Equipe Marketing', '555.555.555-55', 26, 'Maringá', '87000-004', '(44) 99911-0005', 'marketing@cuidadopuro.com', 'hash_senha_marketing', 'marketing', 'ativo'),
('Equipe Comercial', '666.666.666-66', 29, 'Maringá', '87000-005', '(44) 99911-0006', 'comercial@cuidadopuro.com', 'hash_senha_comercial', 'comercial', 'ativo'),
('Equipe Frontend', '777.777.777-77', 22, 'Maringá', '87000-006', '(44) 99911-0007', 'frontend@cuidadopuro.com', 'hash_senha_frontend', 'frontend', 'ativo'),
('Equipe Backend', '888.888.888-88', 23, 'Maringá', '87000-007', '(44) 99911-0008', 'backend@cuidadopuro.com', 'hash_senha_backend', 'backend', 'ativo');

-- Cuidadores (reaproveitando nomes do KINGREIABS.docx)
INSERT INTO cuidador (nome, rg, cpf, idade, cidade, cep, telefone, categoria_profissional, numero_registro_coren, email, senha, status_cadastro) VALUES
('Carlos Souza', '44.123.456-X', '111.222.333-44', 36, 'Maringá', '87013-000', '(44) 99911-1111', 'técnico de enfermagem', 'COREN-PR 8855-TE', 'carlos.souza@email.com', 'hash_carlos', 'aprovado'),
('Ana Silva', '44.987.654-2', '222.333.444-55', 29, 'Maringá', '87020-000', '(44) 99911-2222', 'sem registro', NULL, 'ana.silva@email.com', 'hash_ana', 'aprovado'),
('Marcos Oliveira', '33.456.789-1', '555.666.777-88', 40, 'Maringá', '87030-000', '(44) 99888-7744', 'enfermeiro', 'COREN-PR 4122', 'marcos.oliveira@email.com', 'hash_marcos', 'pendente'),
('Beatriz Santos', '55.111.222-3', '999.888.777-66', 32, 'Maringá', '87040-000', '(44) 99777-1122', 'auxiliar de enfermagem', 'COREN-PR 9911-AE', 'beatriz.santos@email.com', 'hash_beatriz', 'recusado');

-- Pacientes multifaixa etária (reaproveitando nomes do KINGREIABS.docx)
INSERT INTO paciente (nome, rg, cpf, data_nascimento, telefone, cidade, cep, email, senha, telefone_responsavel, status_cadastro) VALUES
('Dona Tereza Lawson', '11.222.333-4', '333.444.555-66', '1945-06-20', '(44) 98811-3333', 'Maringá', '87013-100', 'tereza@lawson.com', 'hash_tereza', '(44) 98811-3334', 'aprovado'),
('Enzo Gabriel Santos', '66.777.888-9', '444.555.666-77', '2025-01-10', '(44) 99122-3344', 'Maringá', '87020-100', 'enzo.responsavel@email.com', 'hash_enzo', '(44) 99122-3345', 'aprovado'),
('Roberto Alencar', '22.555.666-7', '777.888.999-00', '1982-11-05', '(44) 99844-5566', 'Maringá', '87030-100', 'roberto.alencar@email.com', 'hash_roberto', NULL, 'pendente');

-- Familiares corresponsáveis
INSERT INTO familiar (nome, cpf, email, senha, telefone) VALUES
('Mariana Lawson', '123.456.789-00', 'mariana.lawson@email.com', 'hash_mariana', '(44) 98811-3334'),
('Patrícia Santos', '987.654.321-00', 'patricia.santos@email.com', 'hash_patricia', '(44) 99122-3345');

INSERT INTO paciente_familiar (id_paciente, id_familiar) VALUES
(1, 1), -- Mariana acompanha a Dona Tereza
(2, 2); -- Patrícia acompanha o Enzo (filho)

-- Necessidades (catálogo clínico)
INSERT INTO necessidade (nome_necessidade, grau_dependencia) VALUES
('Alzheimer estágio avançado', 'alto'),
('Monitoramento contínuo de sinais vitais', 'leve'),
('Manejo de sonda nasoenteral (SNE)', 'alto'),
('Recuperação de cirurgia ortopédica', 'moderado'),
('Acompanhamento pediátrico de rotina', 'leve');

INSERT INTO paciente_necessidade (id_paciente, id_necessidade) VALUES
(1, 1), (1, 2),  -- Dona Tereza: Alzheimer + monitoramento
(2, 5),          -- Enzo: acompanhamento pediátrico
(3, 4);          -- Roberto: pós-operatório ortopédico

-- Habilidades (catálogo de procedimentos)
INSERT INTO habilidade (nome_habilidade, restrita_tecnico) VALUES
('Medicação intramuscular e subcutânea', 'sim'),
('Manipulação e higienização de sonda', 'sim'),
('Banho de leito completo', 'sim'),
('Auxílio na alimentação e hidratação', 'não'),
('Acompanhamento em caminhadas', 'não'),
('Aferição de glicemia e pressão arterial', 'não');

-- Agendamentos
INSERT INTO cuidado (id_cuidador, id_paciente, data_agendamento, status) VALUES
(1, 1, '2026-10-08 08:00:00', 'agendado'),
(3, 2, '2026-10-08 14:00:00', 'em andamento'),
(4, 3, '2026-10-06 13:00:00', 'concluído');

-- Checklist de tarefas
INSERT INTO cuidado_tarefa (id_cuidado, id_habilidade, realizado) VALUES
(1, 1, 'não'), (1, 2, 'não'),
(2, 3, 'sim'), (2, 5, 'não'),
(3, 4, 'sim'), (3, 6, 'sim');

-- Planos
INSERT INTO plano (nome, valor, inclui_destaque) VALUES
('básico', 29.90, FALSE),
('padrão', 59.90, FALSE),
('premium', 99.90, TRUE),
('único', 29.90, FALSE);

-- Assinaturas (financeiro: pago / pendente / atrasado — igual dashboard ADM)
INSERT INTO assinatura (tipo_usuario, id_usuario, id_plano, status_pagamento, data_vencimento, data_pagamento) VALUES
('cuidador', 1, 3, 'pago', '2026-10-05', '2026-10-04 10:00:00'),
('cuidador', 2, 1, 'pendente', '2026-10-10', NULL),
('cuidador', 3, 2, 'pago', '2026-10-03', '2026-10-02 09:30:00'),
('cuidador', 4, 1, 'atrasado', '2026-09-27', NULL),
('paciente', 1, 4, 'pago', '2026-10-07', '2026-10-06 18:00:00'),
('paciente', 2, 4, 'pendente', '2026-10-12', NULL),
('paciente', 3, 4, 'pago', '2026-10-05', '2026-10-05 08:15:00');

-- Medicação (Modo Pós-Alta)
INSERT INTO medicacao (id_paciente, nome_medicamento, dosagem, horario, data_inicio, data_fim, observacoes) VALUES
(1, 'Rivastigmina', '4,6 mg (adesivo)', '08:00', '2026-09-01', NULL, 'Trocar o adesivo diariamente, sempre em novo local da pele'),
(1, 'Losartana', '50 mg', '08:00 e 20:00', '2026-08-15', NULL, NULL),
(3, 'Dipirona', '1 comprimido', 'a cada 6h se dor', '2026-10-01', '2026-10-20', 'Uso pós-operatório, suspender se sem dor por 48h');

-- Consultas médicas (Modo Pós-Alta)
INSERT INTO consulta_medica (id_paciente, data_consulta, nome_medico, especialidade, eh_retorno, observacoes) VALUES
(1, '2026-10-15 09:00:00', 'Dr. Ricardo Nunes', 'Geriatria', TRUE, 'Retorno de rotina, trazer exames de sangue'),
(2, '2026-10-20 10:30:00', 'Dra. Helena Prado', 'Pediatria', FALSE, 'Primeira consulta de acompanhamento domiciliar'),
(3, '2026-10-09 15:00:00', 'Dr. André Lima', 'Ortopedia', TRUE, 'Avaliação pós-cirúrgica, 3ª semana');

-- Visitas de teste (poucas linhas reais — o contador cresce sozinho
-- conforme o site de verdade é usado; não é gerado em massa aqui)
INSERT INTO visita (pagina, criado_em) VALUES
('/index.html', NOW() - INTERVAL 2 DAY),
('/telas/telaLogin.html', NOW() - INTERVAL 2 DAY),
('/telas/formularioPaciente.html', NOW() - INTERVAL 1 DAY),
('/index.html', NOW() - INTERVAL 1 DAY),
('/telas/dashboardPacientes.html', NOW()),
('/index.html', NOW());

-- Mensagens (chat básico)
INSERT INTO mensagem (id_cuidado, remetente_tipo, remetente_id, texto) VALUES
(1, 'paciente', 1, 'Oi Carlos, pode chegar 8h amanhã certinho?'),
(1, 'cuidador', 1, 'Pode sim, dona Tereza! Chego no horário combinado.'),
(2, 'cuidador', 3, 'Enzo está bem hoje, já deu a mamadeira das 14h.');
