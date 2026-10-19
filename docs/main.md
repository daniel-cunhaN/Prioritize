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
  - **Função**: Lista os desejos cadastrados do usuário autenticado.
  - **Parâmetros de Query Opcionais**:
    - `prioridade=1|2|3`: Filtra por nível de importância (1: Baixa, 2: Média, 3: Alta).
    - `busca=texto` ou `q=texto`: Filtro por correspondência textual no título ou na URL do produto.
    - `loja=dominio`: Filtra por loja ou domínio específico (ex: `amazon.com.br`, `mercadolivre.com.br`).
    - `ordem=criterio` ou `sort=criterio`: Define o critério de ordenação (`prioridade_desc`, `prioridade_asc`, `recentes`, `antigos`, `alfabetica_az`, `alfabetica_za`).
- `PUT /wishlist/{item_id}`:
  - **Função**: Atualiza dados de um item existente (título, URL, imagem ou prioridade).
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
  - Gerenciamento seguro de token JWT em memória (closure do módulo), utilizando `SecureStore` em plataformas móveis nativas e `localStorage` (com sincronização e fallback para `sessionStorage`) na Web para assegurar que a sessão logada persista entre recarregamentos de página, novas abas e reinicializações do navegador.
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
  - **Deslogar**: Encerra a sessão com confirmação de segurança, remove o token JWT da memória volátil, do `SecureStore` (mobile) e dos armazenamentos web (`localStorage` e `sessionStorage`) através da função `encerrarSessao()`, redirecionando para a tela de Login com pilha de navegação limpa (`navigation.reset`).
  - **Criar Outra Conta**: Atalho direto para a tela de cadastro (`RegisterScreen.tsx`), mantendo a tela de Login na pilha de navegação (`routes: [{ name: 'Login' }, { name: 'Register' }]`). Na tela de cadastro, o botão "Faça Login" utiliza navegação resiliente (`handleIrParaLogin`), retornando pelo histórico se houver ou navegando explicitamente para `Login`.
  - **Identificação da Sessão**: Exibe o e-mail completo do usuário autenticado e indicador de "Sessão ativa".

### 6.5. Compartilhamento Nativo ("Compartilhar com: Prioritize")
- **Registro no Sistema Operacional (`app.json`)**:
  - Configurado esquema de URL `scheme: "prioritize"` e pacote `com.prioritize.app`.
  - Configurado plugin nativo `expo-share-intent` com `androidIntentFilters: ["text/*"]` para exibição no menu de compartilhamento do Android.
- **Tratamento e Higienização (`compartilhamento.ts`)**:
  - Parser regex que extrai URLs HTTP/HTTPS mesmo que estejam acompanhadas de textos ou mensagens de redes sociais.
  - Remove pontuações acidentais anexadas ao final da URL e suporta deep links diretos (`prioritize://share?url=...`).
  - **Proteção contra Abertura no Reload Web (F5)**: Rejeita a URL base do próprio aplicativo (`window.location.origin`) e endereços do servidor de desenvolvimento local (`localhost:8081`, `127.0.0.1:8081`), garantindo que apenas links externos de e-commerce sejam tratados como produtos. Desembala links embutidos em parâmetros de busca (`?url=...` ou `?text=...`).
- **Hook e Provedor (`useCompartilhamento.ts` e `App.tsx`)**:
  - Provedor `<ShareIntentProvider>` envolvendo a navegação raiz.
  - Hook unificado que escuta intents nativos (`expo-share-intent`), deep links (`expo-linking`) e parâmetros web (`?url=...`).
  - No ambiente Web (`Platform.OS === 'web'`), desativa a escuta de `Linking.getInitialURL()` (que retorna o endereço da própria janela `window.location.href`) e higieniza a barra de navegação com `window.history.replaceState` após o consumo de parâmetros, impedindo que o modal de adicionar desejo abra automaticamente ao recarregar a página.
- **Fluxo Automático no Menu Principal (`HomeScreen.tsx`)**:
  - Ao receber a URL compartilhada, abre automaticamente o `AdicionarDesejoModal.tsx` com a `urlInicial`.
  - O modal dispara de imediato a requisição `/wishlist/preview`, preenchendo imagem e título para o usuário classificar e salvar.
- **Persistência de Sessão (`LoginScreen.tsx`)**:
  - Verificação automática de token ativo na inicialização para redirecionamento direto à `HomeScreen`, garantindo que links compartilhados sejam importados sem exigir novo login toda vez.

### 6.6. Sistema de Filtro e Ordenação (`FilterSortBar.tsx` e `ModalOrdenacao.tsx`)
- **Barra de Controles Responsiva (`FilterSortBar.tsx`)**:
  - **Botão Ordenar**: Exibe o critério de ordenação ativo com ícone e destaque visual quando modificado em relação ao padrão (`prioridade_desc`). Abre o modal dedicado de seleção de ordenação.
  - **Chips de Prioridade**: Filtros rápidos por nível de importância ("Todos", "🔥 Alta", "⭐ Média", "🌱 Baixa") exibindo o quantitativo de itens em cada categoria em tempo real.
  - **Chips Dinâmicos de Loja/Domínio**: Extrai automaticamente os domínios únicos presentes na lista de desejos do usuário (ex.: `amazon.com.br`, `mercadolivre.com.br`, `shopee.com.br`) com o total de produtos de cada fornecedor, permitindo filtrar por loja com um único clique.
  - **Botão Limpar Filtros**: Exibido dinamicamente com animação e contador de filtros ativos, permitindo restaurar a visão completa em um toque.
- **Modal de Ordenação (`ModalOrdenacao.tsx`)**:
  - Permite alternar instantaneamente entre 6 critérios:
    1. **Maior Prioridade**: Alta (🔥) → Baixa (🌱).
    2. **Menor Prioridade**: Baixa (🌱) → Alta (🔥).
    3. **Mais Recentes**: Data de criação decrescente.
    4. **Mais Antigos**: Data de criação crescente.
    5. **Alfabética (A - Z)**: Pelo título com `localeCompare` pt-BR.
    6. **Alfabética (Z - A)**: Inversa pelo título.
  - Indicador de seleção com checkmark, acessibilidade e tema integrado.
- **Tratamento de Estado Vazio de Filtros**:
  - Quando a busca ou filtros ativos não encontram itens, exibe mensagem amigável e botão "Limpar Filtros e Busca".

### 6.7. Alternância de Modos de Visualização (Grade, Lista e Kanban)
- **Seletor de Visualização Segmentado (`FilterSortBar.tsx`)**:
  - Integrado diretamente na barra de controles com ícones vetoriais Feather (`grid`, `list`, `columns`).
  - No Desktop, exibe rótulos textuais completos ("Grade", "Lista", "Kanban"); no Mobile, mantém formato compacto e ergonômico.
  - Persiste a preferência selecionada no `localStorage` do navegador sob a chave `prioritize_view_mode`, mantendo o modo escolhido mesmo após atualizar a página (F5) ou fechar a aba.
- **Modo Grade (`ProductCard.tsx`)**:
  - Exibição visual padrão em múltiplas colunas adaptativas com imagem em destaque, títulos truncados e carrossel de ofertas no layout estilo e-commerce.
- **Modo Lista (`ProductListItem.tsx`)**:
  - Visualização em linhas horizontais compactas, ideal para varredura rápida de muitos produtos.
  - Miniatura de produto com fallbacks inteligentes, pílula de loja/domínio, data formatada em pt-BR, badge colorido de prioridade, preço no estilo Amazon e botões diretos de link externo, edição e exclusão.
- **Modo Kanban (`KanbanBoard.tsx`)**:
  - Organização visual dos desejos em **3 colunas por classificação de importância** ("🔥 Alta", "⭐ Média" e "🌱 Baixa"), atendendo integralmente à especificação do projeto descrita em `.agents/AGENTS.md`.
  - **Desktop**: 3 colunas simultâneas lado a lado com cabeçalho colorido, contadores de itens em badges e cartões de itens individuais.
  - **Mobile**: Sistema de abas táteis com alternância fluida entre as colunas e contadores de itens.
  - Totalmente compatível com busca e filtros aplicados: as colunas refletem em tempo real os itens que atendem aos filtros.

---

## 7. Como Executar os Testes

O projeto conta com uma suíte completa de **67 testes automatizados** desenvolvida com a metodologia **TDD (Test-Driven Development)** e o runner nativo `node:test`:

### Execução Unificada (Backend + Frontend)
Na raiz do projeto:
```bash
npm test
```

### Testes do Backend (41 testes)
Testes unitários e de integração de autenticação, banco de dados, rotas de wishlist (filtros, busca e ordenação), scraping e segurança:
```bash
cd backend
npm test
```

### Testes do Frontend (26 testes)
Testes unitários de extração de compartilhamento, prevenção de reabertura no reload, algoritmos de ordenação, filtros combinados, agrupamento Kanban e persistência de modos de visualização:
```bash
cd frontend
npm test
```



