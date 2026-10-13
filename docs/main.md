# Documentação Técnica do Projeto Prioritize

O **Prioritize** é uma aplicação para centralização e classificação de listas de desejos (wishlist). O objetivo principal é permitir que o usuário colete links de produtos compartilhados de outros aplicativos ou inseridos manualmente, herde automaticamente os dados do produto (link, imagem e título), classifique o item por ordem de importância e organize visualmente seus desejos.

---

## 1. Arquitetura do Projeto

O projeto é estruturado como um monorepo dividido em duas camadas principais:

```
Prioritize/
├── backend/                       # API REST assíncrona desenvolvida com Node.js e Express (ES Modules)
│   ├── src/
│   │   ├── api/
│   │   │   ├── middlewares/
│   │   │   │   └── autenticacao.js# Middleware de autenticação Bearer JWT
│   │   │   └── routes/
│   │   │       ├── auth.js        # Rotas de cadastro e login de usuários
│   │   │       └── wishlist.js    # Rotas de gerenciamento de desejos e scraping
│   │   ├── config/
│   │   │   └── configuracao.js    # Variáveis e configurações da aplicação
│   │   ├── db/
│   │   │   ├── database.js        # Conexão com SQLite nativo (node:sqlite)
│   │   │   └── schema.js          # DDL e tabelas do banco de dados
│   │   ├── services/
│   │   │   └── scraper.js         # Serviço de extração de metadados com Cheerio
│   │   ├── utils/
│   │   │   └── seguranca.js       # Hash de senhas (bcryptjs) e tokens JWT
│   │   ├── app.js                 # Configuração do Express e CORS
│   │   └── index.js               # Ponto de entrada do servidor HTTP
│   ├── testes/                    # Suíte completa de testes automatizados (node:test)
│   │   ├── autenticacao.test.js
│   │   ├── database.test.js
│   │   ├── rotas.test.js
│   │   ├── scraper.test.js
│   │   └── seguranca.test.js
│   ├── package.json               # Dependências do ecossistema JavaScript
│   └── wishlist.db                # Banco de dados relacional SQLite local
│
├── frontend/                      # Aplicativo React Native (Expo) multi-plataforma
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Cliente HTTP Axios com interceptor de token JWT
│   │   ├── components/
│   │   │   └── AdicionarDesejoModal.tsx # Modal interativo para herança e criação de desejos
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx     # Tela principal com métricas e lista de desejos
│   │   │   ├── LoginScreen.tsx    # Tela de login
│   │   │   └── RegisterScreen.tsx # Tela de cadastro
│   │   └── theme.ts               # Design system baseado na paleta Claude Amber
│   └── App.tsx                    # Navegação em pilha (Stack Navigator)
│
├── docs/
│   ├── plans/
│   │   └── 2026-10-08-migracao-stack-javascript.md # Plano de migração executado via TDD
│   └── main.md                    # Esta documentação técnica
│
├── start.bat                      # Inicializador para Windows (Node.js + Expo)
├── start.js                       # Inicializador multiplataforma em JavaScript
└── package.json                   # Scripts unificados na raiz do projeto
```

---

## 2. Modelo de Dados (Banco de Dados)

### Tabela `users`
Armazena as contas de usuário do aplicativo.
- `id` (TEXT, Chave Primária): Identificador único do usuário (UUID v4).
- `email` (TEXT, Único, Indexado): E-mail de login.
- `hashed_password` (TEXT): Hash seguro da senha com `bcryptjs`.
- `created_at` (TEXT): Data e hora de cadastro em ISO 8601.
- `updated_at` (TEXT): Data e hora da última atualização em ISO 8601.

### Tabela `wishlist_items`
Armazena os itens da lista de desejos associados ao usuário.
- `id` (TEXT, Chave Primária): Identificador único do item (UUID v4).
- `user_id` (TEXT, Chave Estrangeira `users.id`): Vínculo com o usuário proprietário.
- `url` (TEXT, Obrigatório): Link do produto original.
- `title` (TEXT, Opcional/Editável): Título ou descrição do produto.
- `image_url` (TEXT, Opcional): Link da imagem representativa obtida do link.
- `priority` (INTEGER, Obrigatório): Escala de importância do item (1 a 3).
- `created_at` (TEXT): Data e hora de inclusão em ISO 8601.
- `updated_at` (TEXT): Data e hora da última alteração em ISO 8601.

---

## 3. Escala de Prioridade / Importância

Conforme estabelecido nas regras de negócio:
| Valor Numérico | Classificação | Ícone Representativo | Descrição de Uso |
| :--- | :--- | :--- | :--- |
| **1** | **Baixa** | 🌱 | Compras futuras, sem urgência ("Pode esperar"). |
| **2** | **Média** | ⭐ | Compras desejáveis a médio prazo ("Desejável"). |
| **3** | **Alta** | 🔥 | Itens prioritários, essenciais ou urgentes ("Prioritário"). |

---

## 4. Endpoints da API REST (Backend Express)

Base URL: `http://127.0.0.1:8000/api/v1`

### Autenticação (`/auth`)
- `POST /auth/register`: Cadastro de novo usuário. Retorna token Bearer JWT (`status 201`).
- `POST /auth/login`: Autenticação por e-mail e senha. Retorna token Bearer JWT (`status 200`).

### Lista de Desejos (`/wishlist`)
Todos os endpoints abaixo exigem cabeçalho `Authorization: Bearer <token>`.

- `POST /wishlist/preview`:
  - **Função**: Recebe uma URL e extrai automaticamente tags OpenGraph (`og:title`, `og:image`), Twitter Cards (`twitter:title`, `twitter:image`) ou a tag HTML `<title>`.
  - **Body**: `{ "url": "https://loja.com/produto" }`
  - **Retorno**: `{ "url": "...", "titulo": "...", "imagem_url": "..." }`
- `POST /wishlist/`:
  - **Função**: Persiste um novo desejo vinculado ao usuário logado.
  - **Body**: `{ "url": "...", "titulo": "...", "imagem_url": "...", "prioridade": 1|2|3 }`
  - **Retorno**: Item criado com `id`, `user_id`, `created_at`, etc. (`status 201`).
- `GET /wishlist/`:
  - **Função**: Lista todos os desejos do usuário autenticado, ordenados por data decrescente.
  - **Parâmetro opcional de Query**: `?prioridade=1|2|3` para filtrar por importância.
- `DELETE /wishlist/{item_id}`:
  - **Função**: Exclui o desejo pertencente ao usuário (`status 204`).

---

## 5. Serviço de Scraping de Metadados (`scraper.js`)

O serviço assíncrono de extração de metadados utiliza o cliente `fetch` nativo do Node.js com timeout controlado via `AbortSignal.timeout`, a biblioteca `cheerio` para parsing ultra-rápido de HTML e um conjunto de estratégias para contornar proteções anti-bot comuns em e-commerces:

1. **Perfis de Requisição Sucessivos (Anti-bot Bypass)**:
   - Muitas lojas (ex.: Mercado Livre) bloqueiam requisições com User-Agents de navegadores que não executam JavaScript, retornando telas de verificação ou erro sem metadados.
   - O scraper executa tentativas ordenadas com perfis de crawlers de prévia de links (`Twitterbot/1.0`, `facebookexternalhit/1.1`), amplamente permitidos pelas lojas para viabilizar o compartilhamento em redes sociais. Caso uma tentativa inicial não traga imagem, a próxima é acionada automaticamente.
2. **Fontes Múltiplas e Precedência de Imagem**:
   - Meta tags OpenGraph e Twitter Cards: `og:image`, `og:image:secure_url`, `og:image:url`, `twitter:image`, `twitter:image:src`.
   - Dados Estruturados Schema.org: leitura de blocos `<script type="application/ld+json">` extraindo a propriedade `image` de nós do tipo `Product` (suporta strings diretas, arrays e objetos `ImageObject` com `url`/`contentUrl`).
   - Microformatos e links canônicos: `itemprop="image"` e `link rel="image_src"`.
   - Resolução automática de URLs de imagens relativas via `new URL(imagemUrl, urlBase).href`.
3. **Fallback Resiliente da Amazon por ASIN**:
   - Para links da Amazon que bloqueiam o HTML com páginas de captcha, o scraper extrai o código ASIN (10 caracteres) da rota da URL (`/dp/ASIN`, `/gp/product/ASIN`) e requisita a imagem diretamente da CDN oficial (`m.media-amazon.com/images/P/{ASIN}.01._SCLZZZZZZZ_.jpg`).
   - Descarta automaticamente o pixel GIF transparente de 43 bytes retornado para produtos inativos/inválidos.
4. **Fallback Tolerante a Falhas**:
   - Caso nenhuma imagem seja encontrada ou o site apresente erro de DNS/rede, um título amigável é derivado do domínio (`Produto em loja.com`) sem quebrar a requisição do usuário nem salvar telas de captcha como URL do produto.

---

## 6. Frontend: Interfaces, Telas e Componentes

### 6.1. Telas de Autenticação (`LoginScreen.tsx` e `RegisterScreen.tsx`)
- **UI/UX e Identidade Visual**:
  - Cabeçalho limpo com logotipo oficial (`logo.png`) e tipografia Claude Amber.
  - Card centralizado e responsivo (`maxWidth: 420`) com suporte a desktop, web e mobile.
  - Botão de login/cadastro social com Google e divisor visual padronizado.
  - Alternador de visibilidade de senha com ícones discretos e profissionais (`👁` e `⊘`).
  - Indicador de força de senha em tempo real na tela de cadastro, com barra colorida progressiva e checagem de critérios (comprimento, maiúscula, minúscula, número e caractere especial).
- **Segurança e Sanitização**:
  - Validação estrita do lado do cliente via módulo `validacao.ts` (e-mail RFC 5322 e força de senha).
  - Sanitização anti-XSS em todos os inputs de texto.
  - Gerenciamento seguro de token JWT em memória (closure do módulo), utilizando `SecureStore` em plataformas nativas e `sessionStorage` na Web.
  - **Confirmação de Credenciais Incorretas**: Tratamento específico no `LoginScreen.tsx` para falhas de autenticação (status 401), exibindo diálogo explícito de confirmação (`Alert.alert` no Mobile e `window.alert` na Web), mensagem em destaque no `AlertBox` e indicação de erro no campo de senha. No backend (`POST /api/v1/auth/login`), resposta padronizada com mensagem `"Credenciais de login incorretas."`.

### 6.2. Componente de Feedback (`AlertBox.tsx`)
- Fornece notificações inline contextuais e acessíveis (`erro`, `sucesso`, `aviso`, `info`).
- Cores e bordas calculadas a partir dos tokens dinâmicos do tema ativo.
- Suporte a botão de fechamento manual e ícone indicativo.

### 6.3. Modal de Adicionar Desejo (`AdicionarDesejoModal.tsx`)
- **Herança de Dados**:
  - Campo de URL do produto com suporte a busca manual ou automática no blur.
  - Indicador visual de progresso durante o scraping.
  - Card de pré-visualização do produto com imagem e título herdados.
  - Título editável pelo usuário caso queira ajustar o nome do produto.
- **Classificação de Importância**:
  - Três seletores táteis com retorno visual de estado ativo para "Baixa", "Média" e "Alta".
- **Integração na Tela Principal**:
  - Conectado ao botão flutuante (FAB) e ao botão do estado vazio na `HomeScreen.tsx`.
  - Atualiza a lista e os cards de estatísticas (Total, Alta Prioridade, Média Prioridade) após salvar.

### 6.4. Gerenciamento de Conta e Sessão (`GerenciarContaModal.tsx` e `HomeScreen.tsx`)
- **Acesso Rápido no Menu Inicial**:
  - O avatar estático do cabeçalho da `HomeScreen.tsx` foi transformado em um botão interativo e acessível (`accessibilityRole="button"`).
  - Exibe dinamicamente a letra inicial do e-mail do usuário logado obtida via endpoint `GET /api/v1/auth/me`.
- **Ações de Conta Disponíveis**:
  - **Deslogar**: Encerra a sessão com confirmação de segurança, remove o token JWT da memória volátil, do `SecureStore` (mobile) e do `sessionStorage` (web) através da função `encerrarSessao()`, redirecionando para a tela de Login com pilha de navegação limpa (`navigation.reset`).
  - **Mudar de Conta**: Permite desconectar a conta atual com confirmação para que outro usuário realize autenticação.
  - **Criar Outra Conta**: Atalho direto para a tela de cadastro (`RegisterScreen.tsx`), mantendo a tela de Login na pilha de navegação (`routes: [{ name: 'Login' }, { name: 'Register' }]`). Na tela de cadastro, o botão "Faça Login" utiliza navegação resiliente (`handleIrParaLogin`), retornando pelo histórico se houver ou navegando explicitamente para `Login`.
  - **Identificação da Sessão**: Exibe o e-mail completo do usuário autenticado e indicador de "Sessão ativa".

---

## 7. Como Executar os Testes

O backend conta com uma suíte de 38 testes automatizados (unitários e de integração) desenvolvida com o runner nativo `node:test` e a metodologia **TDD**:

```bash
cd backend
npm test
```

Para rodar em modo watch (reexecução ao salvar alterações):
```bash
npm run dev
```

