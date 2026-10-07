# Guia — Teste de Pagamento via Pix (demonstração de hoje)

Este guia explica como testar o pagamento Pix de verdade, sem precisar de
conta em gateway pago (Mercado Pago, Stripe, etc). A API gera o **QR Code
Pix estático**, no padrão oficial do Banco Central (EMV/BR Code) — qualquer
banco lê e paga esse QR Code normalmente.

**Importante sobre segurança**: você vai usar sua própria **chave Pix**
(CPF, celular, e-mail ou chave aleatória), que é um dado público — é a
mesma informação que você passaria pra alguém te fazer uma transferência.
**Nunca** compartilhe senha do banco, senha do app, ou token de acesso
com ninguém, inclusive comigo. A API não pede e não guarda nada disso.

---

## Por que não tem confirmação automática do banco

Pra um sistema confirmar sozinho, em tempo real, que o Pix caiu, é
necessário um contrato com uma instituição financeira que ofereça
"webhook de Pix recebido" — isso é pago e demora dias pra ativar (exige
CNPJ homologado, em geral). Pra demonstração de hoje, a confirmação é
**manual**: depois que o Pix cair de verdade na sua conta, você (ou a
pessoa testando) clica num botão / chama um endpoint pra marcar "pago" —
e a tela atualiza na hora, exatamente como aconteceria com um webhook de
verdade. Pra banca, o efeito visual é o mesmo.

---

## Passo a passo para testar hoje

### 1. Suba a API localmente

Veja `SETUP_LOCAL.md` — depois de rodar `uvicorn main:app --reload`, a
API fica disponível em `http://localhost:8000`.

### 2. Gere o QR Code (já como imagem pronta)

Abra no navegador (ou chame via Postman/Insomnia):

```
GET http://localhost:8000/pagamento/gerar-qrcode-imagem
    ?id_assinatura=1
    &chave_pix=SEU_CPF_OU_CELULAR_OU_EMAIL
    &nome_recebedor=SEU NOME
    &cidade_recebedor=MARINGA
```

Isso devolve direto uma imagem PNG do QR Code na tela do navegador.
Se preferir só o texto (pra colar num site gerador de QR Code tipo
qrcode-monkey.com), use o mesmo endpoint sem `-imagem`:

```
POST http://localhost:8000/pagamento/gerar-qrcode
```

(mesmos parâmetros, só que no corpo da requisição)

### 3. Pague de verdade

Abra o app do seu banco no celular, escaneie o QR Code que apareceu na
tela, e confirme o pagamento — usando sua conta real (ex: Itaú), pagando
pra sua própria chave Pix (ex: cadastrada no Banco do Brasil). Isso prova
que o QR Code é válido e reconhecido por qualquer banco.

### 4. Confirme o pagamento no sistema

Depois que o Pix cair (confira no seu extrato), chame:

```
POST http://localhost:8000/pagamento/confirmar
Content-Type: application/json

{
  "id_assinatura": 1
}
```

Isso marca a assinatura como `pago` com a data/hora exata, e esse dado já
aparece puxado pelo dashboard financeiro (consulta nas tabelas
`assinatura` + `equipe_interna`), igual ao mock que você já tinha no
painel ADM.

---

## Dica para a apresentação

Pra ficar mais impressionante ao vivo: deixe o navegador numa aba com o
dashboard do ADM aberto mostrando a mensalidade "pendente", pague o Pix no
celular, chame o `/pagamento/confirmar`, e atualize a página — a banca vê
o status mudar de "pendente" pra "pago" na hora, com data e hora reais.

## Se quiser ir além depois (não precisa hoje)

Quando o projeto crescer de verdade, dá pra trocar essa confirmação
manual por integração real com Efí (antiga Gerencianet) ou Mercado Pago,
que têm webhook automático de Pix recebido — aí some o passo manual.
