# Deploy no Render — Cuidado Puro

Este guia monta os 3 serviços (banco, API, site) a partir dos dois pacotes
já entregues (`cuidado_puro_v2.zip` e `cuidado_puro_frontend.zip`) e os
publica no Render como um único projeto, com um link público para testar
em qualquer celular.

> Importante: eu não tenho acesso à sua conta do Render nem ao GitHub
> daqui do ambiente de trabalho — os passos abaixo são para você (ou quem
> estiver com a tela) executar. Preparei todos os arquivos de configuração
> para que seja só "clicar e esperar".

## 1. Organize um repositório com esta estrutura exata

O `render.yaml` espera os arquivos nesse layout, na raiz do repositório:

```
cuidado-puro/
├── render.yaml
├── deploy/
│   └── Dockerfile.mysql
├── sql/
│   └── cuidado_puro_v2.sql
├── api/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── pagamento.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── css/
    ├── js/
    └── telas/
```

Para montar isso a partir dos dois zips que você já recebeu:

```bash
mkdir cuidado-puro && cd cuidado-puro

# 1. Extraia o backend (banco + API + render.yaml) na raiz
unzip caminho/para/cuidado_puro_v2.zip -d _tmp_backend
mv _tmp_backend/cuidado_puro_v2/render.yaml .
mv _tmp_backend/cuidado_puro_v2/deploy .
mv _tmp_backend/cuidado_puro_v2/sql .
mv _tmp_backend/cuidado_puro_v2/api .
rm -rf _tmp_backend

# 2. Extraia o front-end rewirado como "frontend/"
unzip caminho/para/cuidado_puro_frontend.zip -d _tmp_front
mv _tmp_front/static_copia frontend
rm -rf _tmp_front

git init
git add .
git commit -m "Cuidado Puro: banco + API + front-end prontos para deploy"
```

Crie um repositório vazio no GitHub e suba com `git remote add origin ...`
e `git push -u origin main`.

## 2. Crie o Blueprint no Render

1. Entre em [render.com](https://render.com) (crie uma conta grátis se
   ainda não tiver).
2. **New** → **Blueprint**.
3. Conecte sua conta do GitHub e escolha o repositório que você acabou de
   criar.
4. O Render vai ler o `render.yaml` da raiz e mostrar os 3 serviços:
   - `cuidadopuro-mysql` (banco, roda como container Docker)
   - `cuidadopuro-api` (API FastAPI)
   - `cuidadopuro-frontend` (site estático)
5. Clique em **Apply** para criar os 3 de uma vez.

O banco (`cuidadopuro-mysql`) carrega o schema completo (16 tabelas + dados
de teste) automaticamente na primeira vez que o container sobe — é o mesmo
arquivo `sql/cuidado_puro_v2.sql` que você já tem, só que executado dentro
do MySQL do Render.

## 3. Ligue a API no banco (único passo manual)

O Render não monta sozinho a string de conexão de um banco rodando como
"Private Service" Docker (isso é automático só para o Postgres gerenciado
dele — aqui estamos usando MySQL via Docker, que é "Private Service"
genérico). Por isso, depois que os dois serviços estiverem no ar:

1. Abra o serviço **cuidadopuro-mysql** no painel do Render.
2. Em **Environment**, copie o valor gerado para `MYSQL_ROOT_PASSWORD`.
3. Ainda na página do `cuidadopuro-mysql`, veja o **hostname interno** do
   serviço (geralmente aparece como `cuidadopuro-mysql` mesmo, ou nas
   informações de "Internal Connection" — o Render documenta isso na aba
   do serviço).
4. Abra o serviço **cuidadopuro-api** → **Environment** → adicione:
   ```
   DATABASE_URL = mysql+pymysql://root:<senha_copiada>@cuidadopuro-mysql:3306/cuidado_puro_v2
   ```
   (troque `<senha_copiada>` pelo valor do passo 2; o host interno costuma
   ser exatamente o nome do serviço, `cuidadopuro-mysql`).
5. Salve — o Render reinicia a API automaticamente com a variável nova.

## 4. Confirme a URL pública da API

O `js/config.js` do front-end já está configurado para apontar para:

```
https://cuidadopuro-api.onrender.com
```

Isso bate com o nome `cuidadopuro-api` definido no `render.yaml`. Se por
algum motivo o Render te der um nome diferente (ele avisa na tela de
criação se o nome já estiver em uso por outra conta), ajuste a constante
`API_BASE_URL` em `frontend/js/config.js` para a URL real antes do deploy,
ou publique de novo depois de corrigir.

## 5. Teste em dois celulares

Depois que os 3 serviços aparecerem como **Live** no painel do Render:

1. Abra `https://cuidadopuro-frontend.onrender.com` em um celular.
2. Cadastre um paciente e um cuidador (telas de cadastro).
3. No ADM (`/telas/dashboardAdmin.html`, senha `admin123`), aprove os dois
   cadastros.
4. Faça login com o paciente em um celular e com o cuidador em outro.
5. No painel do paciente, use "Buscar cuidador" para agendar.
6. Abra o chat nos dois celulares e troque mensagens — é tudo real,
   salvo no banco.

## Observações importantes

- **Plano gratuito do Render "dorme" serviços inativos.** No plano free,
  tanto a API quanto o banco hibernam depois de um tempo sem uso e levam
  uns 30-60s para "acordar" na primeira requisição depois disso — normal,
  não é bug. Para a apresentação da banca, é bom abrir o site uns 2 minutos
  antes para os serviços já estarem "quentes".
- **O disco do banco é persistente** (1GB no `render.yaml`): os dados
  sobrevivem a reinícios do serviço, mas se você apagar o serviço
  `cuidadopuro-mysql` no painel, o disco e os dados vão junto.
- Se preferir não lidar com Docker/MySQL no Render, a alternativa mais
  simples é usar um MySQL gerenciado gratuito externo (ex.: Aiven, Railway,
  Clever Cloud) e colocar a connection string dele direto em
  `DATABASE_URL` do serviço `cuidadopuro-api` — nesse caso você pode até
  remover o serviço `cuidadopuro-mysql` do `render.yaml`.
