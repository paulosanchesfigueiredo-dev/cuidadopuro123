-- ============================================================
-- CUIDADO PURO — CONSULTAS SQL DOS DASHBOARDS (SELECT + JOIN)
-- Cada bloco é comentado com o que retorna e em qual tela é usado.
-- Todas rodam direto em cima do banco cuidado_puro_v2.sql
-- ============================================================

USE cuidado_puro_v2;


-- ================================================================
-- DASHBOARD DO ADM
-- ================================================================

-- 1) Total de usuários cadastrados, separado por tipo (paciente / cuidador)
SELECT 'paciente' AS tipo_usuario, COUNT(*) AS total FROM paciente
UNION ALL
SELECT 'cuidador' AS tipo_usuario, COUNT(*) AS total FROM cuidador;

-- 2) Cadastros por status (pendente / aprovado / recusado) — pra tela
--    de "aprovar/recusar cadastro" do ADM
SELECT 'paciente' AS tipo_usuario, status_cadastro, COUNT(*) AS total
FROM paciente
GROUP BY status_cadastro
UNION ALL
SELECT 'cuidador' AS tipo_usuario, status_cadastro, COUNT(*) AS total
FROM cuidador
GROUP BY status_cadastro;

-- 3) Lista de cadastros pendentes de aprovação (card "Cadastros recentes"
--    do dashboard ADM, com botão aprovar/recusar)
SELECT 'paciente' AS tipo_usuario, id_paciente AS id, nome, email, data_criacao
FROM paciente
WHERE status_cadastro = 'pendente'
UNION ALL
SELECT 'cuidador' AS tipo_usuario, id_cuidador AS id, nome, email, data_criacao
FROM cuidador
WHERE status_cadastro = 'pendente'
ORDER BY data_criacao DESC
LIMIT 10;

-- 4) Assinaturas por status de pagamento (pago / pendente / atrasado) —
--    card financeiro do dashboard ADM
SELECT status_pagamento, COUNT(*) AS total, SUM(p.valor) AS valor_total
FROM assinatura a
JOIN plano p ON p.id_plano = a.id_plano
GROUP BY status_pagamento;

-- 5) Mensalidades recentes com nome do usuário (pra listar igual ao
--    card "Mensalidades recentes" do mock: "Mariana Silva · Premium —
--    R$149,90 — venc. 07/10 — pendente")
SELECT
    a.id_assinatura,
    a.tipo_usuario,
    CASE
        WHEN a.tipo_usuario = 'paciente' THEN (SELECT nome FROM paciente WHERE id_paciente = a.id_usuario)
        WHEN a.tipo_usuario = 'cuidador' THEN (SELECT nome FROM cuidador WHERE id_cuidador = a.id_usuario)
    END AS nome_usuario,
    p.nome AS nome_plano,
    p.valor,
    a.data_vencimento,
    a.status_pagamento
FROM assinatura a
JOIN plano p ON p.id_plano = a.id_plano
ORDER BY a.data_vencimento DESC
LIMIT 10;

-- 6) Movimentação de cadastros por mês (gráfico de linha "Tráfego/Cadastros")
SELECT
    DATE_FORMAT(data_criacao, '%Y-%m') AS mes,
    'paciente' AS tipo_usuario,
    COUNT(*) AS total
FROM paciente
GROUP BY mes
UNION ALL
SELECT
    DATE_FORMAT(data_criacao, '%Y-%m') AS mes,
    'cuidador' AS tipo_usuario,
    COUNT(*) AS total
FROM cuidador
GROUP BY mes
ORDER BY mes;

-- 7) Cuidadores por categoria profissional (gráfico "Usuários por tipo")
SELECT categoria_profissional, COUNT(*) AS total
FROM cuidador
GROUP BY categoria_profissional;

-- 8) Assinaturas por plano (quantos cuidadores em cada plano básico/padrão/premium)
SELECT p.nome AS plano, COUNT(*) AS total_assinantes
FROM assinatura a
JOIN plano p ON p.id_plano = a.id_plano
WHERE a.tipo_usuario = 'cuidador'
GROUP BY p.nome;

-- 9) Atendimentos (cuidados) por status — visão geral de operação
SELECT status, COUNT(*) AS total
FROM cuidado
GROUP BY status;


-- ================================================================
-- DASHBOARD DO CUIDADOR  (filtrar sempre por :id_cuidador)
-- ================================================================

-- 10) Agenda do cuidador — próximos atendimentos com nome e cidade do paciente
SELECT
    c.id_cuidado,
    p.nome AS nome_paciente,
    p.cidade,
    c.data_agendamento,
    c.status
FROM cuidado c
JOIN paciente p ON p.id_paciente = c.id_paciente
WHERE c.id_cuidador = :id_cuidador
  AND c.data_agendamento >= NOW()
ORDER BY c.data_agendamento ASC;

-- 11) Atendimentos já concluídos (histórico) com checklist de tarefas realizadas
SELECT
    c.id_cuidado,
    p.nome AS nome_paciente,
    c.data_agendamento,
    h.nome_habilidade,
    ct.realizado
FROM cuidado c
JOIN paciente p ON p.id_paciente = c.id_paciente
JOIN cuidado_tarefa ct ON ct.id_cuidado = c.id_cuidado
JOIN habilidade h ON h.id_habilidade = ct.id_habilidade
WHERE c.id_cuidador = :id_cuidador
  AND c.status = 'concluído'
ORDER BY c.data_agendamento DESC;

-- 12) Pacientes atualmente vinculados ao cuidador, com as necessidades deles
--     (pra mostrar "perfil do paciente" no card do cuidador)
SELECT DISTINCT
    p.id_paciente,
    p.nome,
    p.cidade,
    n.nome_necessidade,
    n.grau_dependencia
FROM cuidado c
JOIN paciente p ON p.id_paciente = c.id_paciente
LEFT JOIN paciente_necessidade pn ON pn.id_paciente = p.id_paciente
LEFT JOIN necessidade n ON n.id_necessidade = pn.id_necessidade
WHERE c.id_cuidador = :id_cuidador;

-- 13) Status da assinatura do próprio cuidador (card "Pagamentos")
SELECT a.status_pagamento, a.data_vencimento, p.nome AS plano, p.valor, p.inclui_destaque
FROM assinatura a
JOIN plano p ON p.id_plano = a.id_plano
WHERE a.tipo_usuario = 'cuidador' AND a.id_usuario = :id_cuidador
ORDER BY a.data_vencimento DESC
LIMIT 1;


-- ================================================================
-- DASHBOARD DO PACIENTE  (filtrar sempre por :id_paciente)
-- ================================================================

-- 14) Necessidades cadastradas do paciente
SELECT n.nome_necessidade, n.grau_dependencia
FROM paciente_necessidade pn
JOIN necessidade n ON n.id_necessidade = pn.id_necessidade
WHERE pn.id_paciente = :id_paciente;

-- 15) Cuidadores vinculados (atuais e passados) ao paciente
SELECT
    c.id_cuidado,
    cu.nome AS nome_cuidador,
    cu.categoria_profissional,
    c.data_agendamento,
    c.status
FROM cuidado c
JOIN cuidador cu ON cu.id_cuidador = c.id_cuidador
WHERE c.id_paciente = :id_paciente
ORDER BY c.data_agendamento DESC;

-- 16) Medicações ativas do paciente (Modo Pós-Alta)
SELECT nome_medicamento, dosagem, horario, data_inicio, data_fim, observacoes
FROM medicacao
WHERE id_paciente = :id_paciente
  AND (data_fim IS NULL OR data_fim >= CURDATE())
ORDER BY data_inicio DESC;

-- 17) Próximas consultas médicas do paciente (Modo Pós-Alta)
SELECT data_consulta, nome_medico, especialidade, eh_retorno, observacoes
FROM consulta_medica
WHERE id_paciente = :id_paciente
  AND data_consulta >= NOW()
ORDER BY data_consulta ASC;

-- 18) Histórico completo de atendimentos concluídos, com tarefas realizadas
--     (pra "Linha do Tempo" / evolução do paciente, citada no pitch)
SELECT
    c.data_agendamento,
    cu.nome AS nome_cuidador,
    h.nome_habilidade,
    ct.realizado
FROM cuidado c
JOIN cuidador cu ON cu.id_cuidador = c.id_cuidador
JOIN cuidado_tarefa ct ON ct.id_cuidado = c.id_cuidado
JOIN habilidade h ON h.id_habilidade = ct.id_habilidade
WHERE c.id_paciente = :id_paciente
  AND c.status = 'concluído'
ORDER BY c.data_agendamento DESC;

-- 19) Familiares corresponsáveis vinculados ao paciente (pra "central de
--     comando para a família")
SELECT f.nome, f.telefone, f.email
FROM paciente_familiar pf
JOIN familiar f ON f.id_familiar = pf.id_familiar
WHERE pf.id_paciente = :id_paciente;
