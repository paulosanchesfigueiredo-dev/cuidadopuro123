# Guia — Rodar a API localmente (Windows e Linux/Mac)

Este guia é pra quem vai abrir o projeto no VS Code e rodar sem saber
nada de Python — só copiar e colar os comandos na ordem.

## O que você precisa ter instalado antes

1. **Python 3.11 ou mais novo** — baixe em python.org se não tiver.
2. **MySQL** (ou MariaDB) rodando na sua máquina, com um usuário que
   consiga criar bancos.
3. **VS Code** com a pasta `cuidado_puro_v2` aberta.

---

## 1. Criar o banco de dados

No MySQL Workbench (ou terminal `mysql -u root -p`), rode o arquivo:

```
sql/cuidado_puro_v2.sql
```

Isso cria o banco `cuidado_puro_v2` já com as 15 tabelas e os dados de
teste.

---

## 2. Preparar o ambiente Python

Abra o terminal do VS Code (menu **Terminal → New Terminal**) e entre na
pasta `api`:

```bash
cd api
```

### Windows (PowerShell)

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Se der erro de "execução de scripts desabilitada", rode uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e tente de novo.

### Linux / Mac

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 3. Configurar a conexão com o banco

Defina a variável de ambiente com a sua senha do MySQL, no mesmo
terminal onde você vai rodar a API (passo 4) — precisa fazer isso toda
vez que abrir um terminal novo:

### Windows (PowerShell)

```powershell
$env:DATABASE_URL = "mysql+pymysql://root:SUA_SENHA@localhost:3306/cuidado_puro_v2"
```

### Linux / Mac

```bash
export DATABASE_URL="mysql+pymysql://root:SUA_SENHA@localhost:3306/cuidado_puro_v2"
```

(troque `root` e `SUA_SENHA` pelo usuário/senha reais do seu MySQL)

---

## 4. Rodar a API

Ainda dentro da pasta `api`, com o ambiente virtual ativado:

```bash
uvicorn main:app --reload
```

Se aparecer algo como:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

está funcionando. Abra `http://localhost:8000/docs` no navegador — essa
página mostra todos os endpoints da API prontos pra testar, sem precisar
escrever código nenhum (é gerada automaticamente pelo FastAPI).

---

## 5. Conectar com o front-end (telas do Samuel)

No arquivo onde o front-end define `API_BASE_URL` (ex: `js/config.js` ou
topo de cada `.js` de tela), aponte para:

```js
const API_BASE_URL = "http://localhost:8000";
```

Se for testar pelo celular, troque `localhost` pelo IP da sua máquina na
rede Wi-Fi (ex: `http://192.168.0.15:8000`) — o celular precisa estar na
mesma rede Wi-Fi do computador rodando a API.

---

## Resolução de problemas comuns

- **"ModuleNotFoundError"**: o ambiente virtual não foi ativado antes do
  `pip install`. Repita o passo 2.
- **"Can't connect to MySQL server"**: confira se o MySQL está rodando e
  se a senha em `DATABASE_URL` está certa.
- **CORS bloqueando no navegador**: a API já libera todas as origens
  (`allow_origins=["*"]`), então isso só acontece se a API não estiver
  rodando — confira o terminal.
