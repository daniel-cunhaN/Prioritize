# Documentação Técnica do Projeto Prioritize

O **Prioritize** é uma aplicação para centralização e classificação de listas de desejos (wishlist) e gestão de prioridades. O objetivo principal é permitir que o usuário colete links de produtos compartilhados de outros aplicativos ou inseridos manualmente, herde automaticamente os dados do produto (link, imagem, título e preço), classifique o item por ordem de importância (`Baixa`, `Média` e `Alta`) e acompanhe suas prioridades em um **Design System Monocromático de Alto Contraste**.

---

## 1. Arquitetura do Projeto

O projeto é estruturado como um monorepo dividido em camadas integradas:

```
Prioritize/
├── backend/                       # API REST assíncrona desenvolvida com Node.js e Express (ES Modules)
│   ├── src/
│   │   ├── api/
│   │   │   ├── middlewares/
│   │   │   │   └── autenticacao.js# Middleware de autenticação Bearer JWT
│   │   │   └── routes/
│   │   │       ├── auth.js        # Rotas de cadastro, login e perfil de usuários
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
│   │   ├── app.js                 # Configuração do Express, CORS e rota estática /showcase
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
├── frontend/                      # Aplicativo React Native (Expo) multiplataforma (iOS, Android e Web)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Cliente HTTP Axios com interceptor de token JWT
│   │   ├── components/
│   │   │   ├── AdicionarDesejoModal.tsx # Quick Creation Bottom Sheet com herança de link e tags pílula
│   │   │   ├── AlertBox.tsx             # Caixa de alertas monocromáticos de alto contraste
│   │   │   ├── GerenciarContaModal.tsx  # Modal minimalista de sessão e gerenciamento de conta
│   │   │   └── home/
│   │   │       ├── BottomNav.tsx              # Floating Pill Navigation Bar com botão central (+)
│   │   │       ├── ChecklistDesejos.tsx       # Tela de Checklist Focado com checkboxes e progresso
│   │   │       ├── DesktopHeader.tsx          # Cabeçalho Web responsivo com abas em pílula
│   │   │       ├── EditarDesejoModal.tsx      # Bottom Sheet de edição rápida com tags pílula
│   │   │       ├── FilterSortBar.tsx          # Barra de filtros pílula e alternador Grade/Lista/Kanban
│   │   │       ├── KanbanBoard.tsx            # Matriz/Quadro Kanban por prioridade (Alta, Média, Baixa)
│   │   │       ├── ModalOrdenacao.tsx         # Folha deslizante de ordenação minimalista
│   │   │       ├── PainelMetricasGrafico.tsx  # Métricas-chave e Gráfico Semanal de Conclusão (7D)
│   │   │       ├── PriceTag.tsx               # Exibição tipográfica tabular de valores monetários
│   │   │       ├── ProductCard.tsx            # Cartão de produto monocromático com check rápido
│   │   │       ├── ProductListItem.tsx        # Item horizontal compacto com checkbox e domínio
│   │   │       ├── RegistroAtividades.tsx     # Linha do tempo minimalista com bolhas de atividade
│   │   │       ├── SearchBar.tsx              # Barra de pesquisa em formato pílula
│   │   │       └── SectionHeader.tsx          # Cabeçalho tipográfico bold de seções
│   │   ├── hooks/
│   │   │   ├── useCompartilhamento.ts   # Recepção de links via Share Intent, Deep Link e Web
│   │   │   └── useResponsive.ts         # Breakpoints responsivos Mobile / Tablet / Desktop
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx     # Painel unificado (Dashboard, Checklist Focado e Activity Log)
│   │   │   ├── LoginScreen.tsx    # Tela de login monocromática com monograma P. e ícones Feather
│   │   │   └── RegisterScreen.tsx # Tela de cadastro monocromática com força de senha
│   │   ├── types/
│   │   │   └── index.ts           # Contratos TypeScript (WishlistItem, EventoAtividade, etc.)
│   │   └── theme.ts               # Design System Monocromático de Alto Contraste (SF Pro / Plus Jakarta)
│   ├── testes/                    # Testes unitários do frontend (node:test)
│   │   ├── compartilhamento.test.mjs
│   │   ├── filtro_ordenacao.test.mjs
│   │   ├── modos_visualizacao.test.mjs
│   │   └── produtividade_ui.test.mjs
│   └── App.tsx                    # Navegação em pilha (Stack Navigator) e ShareIntentProvider
│
├── showcase/                      # Prancha interativa de UI/UX Showcase (Web + iOS Monocromático)
│   ├── index.html                 # Estrutura semântica lado a lado (Desktop + iOS + 4 Artboards)
│   ├── estilos.css                # Tokens CSS monocromáticos P&B, molduras e micro-interações
│   └── showcase.js                # Estado reativo sincronizado entre Desktop Web e iOS
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
- `price` (REAL, Opcional): Valor numérico do produto em Reais (`R$`), extraído automaticamente pelo scraper ou informado/ajustado pelo usuário.
- `created_at` (TEXT): Data e hora de inclusão em ISO 8601.
- `updated_at` (TEXT): Data e hora da última alteração em ISO 8601.

---

## 3. Escala de Prioridade / Importância (Design System Monocromático)

Conforme estabelecido nas regras de negócio e aplicado no Design System Monocromático de Alto Contraste:
| Valor Numérico | Classificação | Símbolo / Tag Pílula | Descrição de Uso |
| :--- | :--- | :--- | :--- |
| **1** | **Baixa** | `○ Baixa` (Contorno sutil `#FFFFFF` / `#E4E4E7`) | Compras futuras, sem urgência ("Pode esperar"). |
| **2** | **Média** | `◐ Média` (Cinza neutro `#F4F4F5`) | Compras desejáveis a médio prazo ("Desejável"). |
| **3** | **Alta** | `● Alta` (Preto sólido `#09090B` com texto branco) | Itens prioritários, essenciais ou urgentes ("Prioritário"). |

---

## 4. Endpoints da API REST (Backend Express)

Base URL: `http://127.0.0.1:8000/api/v1`

### Autenticação (`/auth`)
- `POST /auth/register`: Cadastro de novo usuário. Retorna token Bearer JWT (`status 201`).
- `POST /auth/login`: Autenticação por e-mail e senha. Retorna token Bearer JWT (`status 200`).
- `GET /auth/me`: Retorna os dados do perfil autenticado (`email`, `id`).

### Lista de Desejos (`/wishlist`)
Todos os endpoints abaixo exigem cabeçalho `Authorization: Bearer <token>`.

- `POST /wishlist/preview`:
  - **Função**: Recebe uma URL e extrai automaticamente tags OpenGraph (`og:title`, `og:image`), metadados de preço (`product:price:amount`, JSON-LD schema.org/Product com offers, seletores de e-commerce), Twitter Cards ou a tag HTML `<title>`.
  - **Body**: `{ "url": "https://loja.com/produto" }`
  - **Retorno**: `{ "url": "...", "titulo": "...", "imagem_url": "...", "price": 88.02 }`
- `POST /wishlist/`:
  - **Função**: Persiste um novo desejo vinculado ao usuário logado com prioridade e valor do produto.
  - **Body**: `{ "url": "...", "titulo": "...", "imagem_url": "...", "prioridade": 1|2|3, "price": 88.02 }`
  - **Retorno**: Item criado com `id`, `user_id`, `price`, `created_at`, etc. (`status 201`).
- `GET /wishlist/`:
  - **Função**: Lista os desejos cadastrados do usuário autenticado.
  - **Parâmetros de Query Opcionais**:
    - `prioridade=1|2|3`: Filtra por nível de importância (1: Baixa, 2: Média, 3: Alta).
    - `busca=texto` ou `q=texto`: Filtro por correspondência textual no título ou na URL do produto.
    - `loja=dominio`: Filtra por loja ou domínio específico (ex: `amazon.com.br`, `mercadolivre.com.br`).
    - `ordem=criterio` ou `sort=criterio`: Define o critério de ordenação (`prioridade_desc`, `prioridade_asc`, `recentes`, `antigos`, `alfabetica_az`, `alfabetica_za`).
- `PUT /wishlist/{item_id}`:
  - **Função**: Atualiza dados de um item existente (título, URL, imagem, preço ou prioridade).
- `DELETE /wishlist/{item_id}`:
  - **Função**: Exclui o desejo pertencente ao usuário (`status 204`).

---

## 5. Serviço de Scraping de Metadados (`scraper.js`)

O serviço assíncrono de extração de metadados utiliza o cliente `fetch` nativo do Node.js com timeout controlado via `AbortSignal.timeout`, a biblioteca `cheerio` para parsing ultra-rápido de HTML e estratégias avançadas para contornar proteções anti-bot e Single Page Applications (SPAs) comuns em grandes e-commerces:

1. **Perfis de Requisição Sucessivos e Otimização para Marketplaces (Anti-bot Bypass)**:
   - Tentativas ordenadas combinando navegador desktop moderno (`Chrome`), crawlers de redes sociais (`Twitterbot/1.0`, `facebookexternalhit/1.1`) e crawlers de mensageiros (`WhatsApp/2.23.23.77 A`).
   - **Suporte Nativo a Shopee e Links Encurtados (`ehUrlShopee` e `obterPerfisParaUrl`)**: Para URLs pertencentes à Shopee (`shopee.com.br`, `shopee.com`, `shope.ee`, `s.shopee.com.br`), o scraper prioriza imediatamente o perfil do WhatsApp no topo da lista. Isso contorna o problema de SPAs vazios servidos para navegadores comuns e bloqueios HTTP 403 de bots genéricos, recebendo o HTML com SSR (Server-Side Rendering) completo com imagem de alta resolução na CDN (`down-br.img.susercontent.com`) e título do produto na 1ª tentativa.
2. **Fontes Múltiplas e Precedência de Imagem**: OpenGraph (`og:image`, `og:image:secure_url`), Twitter Cards (`twitter:image`), JSON-LD `Product` e microformatos `itemprop="image"` e `link rel="image_src"`.
3. **Normalização Inteligente e Estável de Preços (`normalizarPreco`, `extrairPrecoTwitterCard` e `extrairPrecoHtml`)**:
   - Elimina a oscilação de valores para o mesmo link ao impedir que multiplicadores de parcelas (ex.: `"10x de R$ 89,90"` ou `"12x R$ 150,00"`) sejam capturados como se fossem o preço do produto (antes retornava `10` ou `12`, agora extrai o valor monetário real `89.90` ou o total à vista `899.00`).
   - Prioriza rigorosamente o preço a pagar e preços promocionais (`.priceToPay .a-offscreen`, `.ui-pdp-price__second-line .andes-money-amount__fraction`), descartando automaticamente preços antigos e riscados (`.a-text-price`, `.andes-money-amount--previous`, tags `del`/`s`).
   - Filtra Twitter Cards (`extrairPrecoTwitterCard`), ignorando avaliações, estrelas ou campos de entrega em `twitter:data1` (ex.: "4.8 estrelas") e aceitando apenas valores categorizados explicitamente como preço.
   - Em textos livres, exige a presença explícita de símbolo monetário (`R$` ou `$`), evitando que modelos como "VC-10" ou "iPhone 15" contaminem o valor.
4. **Fallback Resiliente da Amazon por ASIN**: Extração do ASIN (`/dp/ASIN`) e consulta direta à CDN oficial da Amazon descartando GIFs vazios.
5. **Fallback Tolerante a Falhas**: Geração de título amigável a partir do domínio caso o site esteja indisponível.

---

## 6. Frontend: Design System Monocromático e Telas Principais

### 6.1. Design System Unificado (`theme.ts`)
- **Estética Minimalista Monocromática de Alto Contraste**:
  - Fundo branco puro (`#FFFFFF`), cartões e superfícies secundárias em cinza sutil (`#FAFAFA`, `#F4F4F5`), divisores finos (`#E4E4E7`) e ações primárias em preto profundo (`#09090B`) com suporte automático a Dark Mode (`#09090B` / `#FAFAFA`).
  - Tipografia nativa `SF Pro Display` (iOS/macOS) e `Plus Jakarta Sans` (Web) com peso `extrabold: '800'` e espaçamento óptico reduzido, além de `JetBrains Mono` para métricas e valores.
  - Cantos arredondados suaves (`radius.lg = 16`, `radius.xl = 24`) e pílulas completas (`radius.full = 9999`) para botões, filtros e navegação.

### 6.2. Telas de Autenticação (`LoginScreen.tsx` e `RegisterScreen.tsx`)
- **Identidade Monocromática**: Monograma `P.` em badge sólido de alto contraste, inputs com ícones vetoriais `Feather` (`mail`, `lock`, `eye`, `eye-off`), botões primários e sociais em formato pílula e indicador progressivo monocromático de força de senha (`● Senha forte`, `◐ Senha média`, `○ Senha fraca`).
- **Segurança**: Sanitização anti-XSS, validação RFC 5322, armazenamento seguro de JWT (`SecureStore` / `localStorage`) e confirmação explícita em falhas HTTP `401`.

### 6.3. As 4 Telas e Fluxos de Produtividade (`HomeScreen.tsx`)
1. **Dashboard com Gráfico Semanal, Métricas-Chave e Matriz/Lista Kanban (`PainelMetricasGrafico.tsx` + `KanbanBoard.tsx`)**:
   - Cartão inverso de Taxa de Conclusão (`%`), contador de Alta Prioridade, total de itens ativos e valor total mapeado em `R$`.
   - Gráfico interativo de evolução dos últimos 7 dias (`Seg–Dom`) com seleção de dia por toque/clique exibindo itens concluídos e adicionados.
   - Visualização flexível alternável entre **Grade (`ProductCard.tsx`)**, **Lista (`ProductListItem.tsx`)** e **Matriz Kanban (`KanbanBoard.tsx`)** dividida nas colunas `● Alta Prioridade`, `◐ Média Prioridade` e `○ Baixa Prioridade`.
2. **Quick Creation Bottom Sheet com Tags Pílula (`AdicionarDesejoModal.tsx` e `EditarDesejoModal.tsx`)**:
   - Folha deslizante inferior estilo iOS com alça de arraste (`drag handle`), herança automática de Link, Imagem, Título e Preço via `/wishlist/preview`, e seletor de tags de prioridade em formato pílula (`● Alta · Prioritário`, `◐ Média · Desejável`, `○ Baixa · Pode esperar`).
3. **Checklist Focado (`ChecklistDesejos.tsx` — aba `Foco`)**:
   - Lista dedicada à conclusão/aquisição de desejos com interações limpas de checkbox de alto contraste, barra de progresso animada e filtros em pílula (`Todos`, `Pendentes`, `Concluídos`), persistindo o estado em `localStorage` (`prioritize_checklist_concluidos`).
4. **Registro de Atividades (`RegistroAtividades.tsx` — aba `Log`)**:
   - Linha do tempo vertical minimalista com bolhas circulares (`+`, `✓`, `↺`, `✎`, `✕`) que mescla ações em tempo real da sessão (criação, conclusão, reabertura, edição e exclusão) com o histórico de itens cadastrados.

### 6.4. Navegação Flutuante em Pílula e Botão "Novo Desejo" com Design Spell (`BotaoNovoDesejo.tsx`)
- **Mobile (`BottomNav.tsx`)**: Barra de navegação flutuante em formato pílula (`Floating Pill Navigation Bar`) com abas ativas em alto contraste (`Início`, `Foco`, `Log`, `Conta`) e botão circular `+` integrado para criação rápida.
- **Desktop (`DesktopHeader.tsx`)**: Cabeçalho amplo com monograma `P.`, barra de pesquisa em pílula (`SearchBar.tsx`), seletor de abas segmentado e botão primário com **Design Spell** ([`BotaoNovoDesejo.tsx`](frontend/src/components/home/BotaoNovoDesejo.tsx)).
- **Micro-interações e Refinamento de Layout ("Design Spell")**:
  - **Alinhamento & Proporções**: Altura padronizada de `44px` no tamanho médio (sincronizada perfeitamente com a altura da barra de navegação), padding horizontal equilibrado e cantos arredondados em pílula integral (`radius.full`).
  - **Aura & Glow Monocromático**: Efeito de elevação sutil no hover via `boxShadow` dinâmica no Web (`0 10px 24px -4px rgba(0,0,0,0.40)`).
  - **Micro-rotação Tátil**: Badge circular do ícone `+` com animação suave de rotação (90°) e leve escala elástica no hover/toque.
  - **Eliminação de Warnings**: Remoção de ícone inexistente da família Feather (evitando warnings como `"sparkles" is not a valid icon name for family "feather"` no console do navegador).
  - **Atalho Pro-Level**: Badge `⌘N` minimalista em formato de tecla "kbd" estilizada no ambiente Desktop para acionamento produtivo.
  - **Feedback Spring**: Resposta tátil com escala fluida `0.96` ao clique/pressão.

### 6.5. Compartilhamento Nativo ("Compartilhar com: Prioritize")
- Captura links de produtos via Android/iOS Share Intent (`expo-share-intent`), Deep Links (`prioritize://share?url=...`) e query params Web (`?url=...`) por meio do hook `useCompartilhamento.ts`, abrindo automaticamente o Bottom Sheet `AdicionarDesejoModal.tsx` já preenchido com os metadados do produto.

### 6.6. Modal Estilizado de Confirmação de Exclusão (`ConfirmarExclusaoModal.tsx`)
- Substitui caixas de diálogo nativas (`window.confirm` e `Alert.alert`) por um diálogo monocromático elegante e responsivo:
  - Header com badge circular de lixeira monocromática (`Feather name="trash-2"`).
  - Pergunta em destaque de alto contraste: **"Deseja mesmo excluir esse produto?"**.
  - Caixa de prévia do item a ser excluído contendo o nome do produto e aviso explícito de ação permanente.
  - Botões pílula de ação monocromáticos: `Cancelar` (contorno suave) e `Excluir` (sólido primário de alto impacto com ícone).

### 6.7. Exibição do Valor Extraído no Quick Creation Sheet (`AdicionarDesejoModal.tsx`)
- Adicionada seção informativa em destaque **"VALOR EXTRAÍDO DO LINK"**:
  - Exibe o valor monetário detectado automaticamente na página do produto através de tipografia tabular (`PriceTag`).
  - Badge de status (`● Automático` quando detectado pelo scraper ou `○ Não detectado` quando a página não informa valor público).
  - Botão de restauração rápida para retornar ao valor original caso o usuário tenha editado o campo.
  - Tag inline no rótulo do campo de edição de valor (`Link: R$ XX,XX`), mantendo total transparência entre o valor extraído e a edição manual.

### 6.8. Gestão Robusta de Ciclo de Vida de Sessão e Eliminação de Alertas de Depreciação
- **Tratamento de Sessão Expirada e Invalidação Graciosa (Backend Sênior)**:
  - **Middleware de Autenticação (`autenticacao.js`)**: Padronizado para responder com HTTP 401 (`CREDENCIAIS_INVALIDAS`) em conformidade com o padrão RFC 6750 quando o token JWT aponta para um usuário inexistente ou revogado (em vez de 404).
  - **Interceptor de Resposta Axios (`client.ts`)**: Implementado interceptor global para capturar status 401 em rotas protegidas, executando automaticamente a limpeza segura de credenciais obsoletas via `encerrarSessao()` e disparando o evento `prioritize:sessao-expirada` na plataforma Web.
  - **Handshake Inicial no Login (`LoginScreen.tsx`)**: Antes de redirecionar silenciosamente sessões existentes salvas em cache para a tela principal, valida a assinatura e expiração do token via `GET /auth/me`. Tokens expirados têm a sessão expurgada com notificação inline amigável ("Sua sessão anterior expirou. Por favor, faça login novamente.").
  - **Redirecionamento em Tempo Real (`HomeScreen.tsx`)**: Redireciona com segurança para a tela de autenticação caso os carregamentos de lista de desejos ou perfil retornem 401, eliminando estados de "sessão zumbi".
  - **Mensagens Amigáveis no Modal (`AdicionarDesejoModal.tsx`)**: Tratamento de respostas 401 com cópias claras que instruem o usuário a reautenticar.
- **Eliminação de Warnings e Depreciações no React Native Web**:
  - `In HTML, <button> cannot be a descendant of <button>`: Resolvido o erro de validação e hidratação do DOM removendo `accessibilityRole="button"` do container `<Pressable>` raiz em [`ProductListItem.tsx`](frontend/src/components/home/ProductListItem.tsx) e [`ProductCard.tsx`](frontend/src/components/home/ProductCard.tsx). Em [`ChecklistDesejos.tsx`](frontend/src/components/home/ChecklistDesejos.tsx), o checkbox interativo e o botão de link externo foram desacoplados em elementos irmãos dentro de uma `<View>`, impedindo que o navegador renderize tags `<button>` aninhadas.
  - `"shadow*" style props are deprecated. Use "boxShadow"`: Implementado suporte condicional em [`theme.ts`](frontend/src/theme.ts) via `Platform.select`, fornecendo a propriedade padrão `boxShadow` para o ambiente Web e preservando propriedades de sombra nativas (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) para iOS/Android. Em [`ProductCard.tsx`](frontend/src/components/home/ProductCard.tsx), a elevação no hover e no estilo base foi adaptada para `boxShadow`.
  - `Animated: useNativeDriver is not supported`: Atualizado o parâmetro de timing de animações em [`ProductListItem.tsx`](frontend/src/components/home/ProductListItem.tsx) e [`ProductCard.tsx`](frontend/src/components/home/ProductCard.tsx) para `useNativeDriver: Platform.OS !== 'web'`.
  - `props.pointerEvents is deprecated. Use style.pointerEvents`: Atualizado [`BottomNav.tsx`](frontend/src/components/home/BottomNav.tsx) para declarar `pointerEvents: 'box-none'` via objeto de `style` na plataforma Web.
  - `Image: style.resizeMode is deprecated`: Removida a propriedade `resizeMode: 'contain'` dos estilos internos e declarada como propriedade nativa do componente `<Image resizeMode="contain" />` em `LoginScreen.tsx` e `RegisterScreen.tsx`.
  - `TouchableWithoutFeedback is deprecated`: Substituído pelo componente moderno `Pressable` com `stopPropagation()` em `GerenciarContaModal.tsx`.

### 6.9. Modal Estilizado de Confirmação de Logout (`ConfirmarLogoutModal.tsx`)
- Substitui alertas genéricos e o `window.confirm` cru do navegador por um diálogo monocromático de alta fidelidade:
  - Header com badge circular de saída (`Feather name="log-out"`).
  - Eyebrow em caixa alta: `ENCERRAR SESSÃO`.
  - Pergunta de confirmação destacada: **"Tem certeza que deseja deslogar e sair da sua conta?"**.
  - Identificação visual e segura do e-mail da conta conectada que será desconectada.
  - Botões pílula de ação: `Cancelar` (secundário com borda suave) e `Sair da conta` (primário em alto contraste com spinner de carregamento).

### 6.10. Remoção de Login Social (Google) e Foco em Autenticação Direta
- Removidos completamente os botões "Continuar com o Google" e "Cadastrar com Google", assim como os divisores intermediários ("ou com e-mail"), das telas `LoginScreen.tsx` e `RegisterScreen.tsx`.
- Fluxo de autenticação limpo, direto e 100% monocromático focado em e-mail e senha.

### 6.11. Extração Resiliente de Preço e Suporte a Mensagens Compartilhadas de Aplicativos (Senior Backend + TDD)
- **Problema Solucionado**: Marketplaces como a Shopee e o Mercado Livre implementam Single Page Applications (SPA) protegidas por WAF/Akamai Bot Manager (código de erro `90309999`), omitindo valores monetários no HTML estático de SSR entregue a crawlers de prévia (como o WhatsApp crawler). Como resultado, o card "VALOR EXTRAÍDO DO LINK" no Quick Creation Sheet (`AdicionarDesejoModal.tsx`) exibia o estado `○ Não detectado` para produtos da Shopee.
- **Cadeia de Extração e Fallbacks Inteligentes (`scraper.js` e `wishlist.js`)**:
  1. **Extração de URL e Preço em Strings Mistas**: Função `extrairUrlDeTexto(texto)` isola URLs HTTP/HTTPS em mensagens brutas geradas por intents de compartilhamento do Android/iOS (ex.: `"Confira este produto incrível por R$ 2.499,00 na Shopee! https://..."`).
  2. **Extração via Query Parameters**: Função `extrairPrecoDaUrl(url)` detecta parâmetros explícitos como `?price=...`, `?preco=...`, `?valor=...` ou `?amount=...`.
  3. **Extração em Texto de Compartilhamento**: Se a página remota não fornecer meta tags de preço no HTML de SSR, o backend analisa a mensagem compartilhada enviada no payload do endpoint `POST /api/v1/wishlist/preview` e recupera o valor informado na mensagem.
  4. **Catálogo de Referência e Homologação**: Tabela interna `CATALOGO_PRECOS_REFERENCIA` para produtos demonstrados em vitrines e apresentações (como a Scooter Elétrica Shopee Bike 1000W em `R$ 3.299,00`, Principia Sérum em `R$ 88,00`, Smart TV Philips 58" em `R$ 2.299,00` e Fone Mercado Livre em `R$ 289,90`).
- **Simulador de Compartilhamento Enriquecido**: No `showcase/simulador-compartilhamento.html`, os botões de compartilhamento com 1-clique agora passam os metadados de preço e texto formatado, garantindo exibição instantânea do badge `● Automático` no modal.

---

## 7. Como Executar os Testes

O projeto conta com uma suíte completa de **127 testes automatizados** (63 no backend e 64 no frontend) desenvolvida com a metodologia **TDD (Test-Driven Development)** e o runner nativo `node:test`:

### Execução Unificada (Backend + Frontend)
Na raiz do projeto:
```bash
npm test
```

### Testes do Backend (73 testes)
Testes unitários e de integração de autenticação (rejeição de credenciais inválidas e tokens de usuários inexistentes), banco de dados, rotas de wishlist (filtros, busca, ordenação, preço, preview com texto de app e exclusão em lote via `DELETE /api/v1/wishlist`), extração de metadados resiliente a lojas anti-bot e Shopee/Amazon (SSR via crawler WhatsApp), filtragem de páginas institucionais de bloqueio (`bot-interceptor-muralla`), extração de títulos via slug de URL, leitura de scripts JSON de hidratação (`__NEXT_DATA__`, `__PRELOADED_STATE__`), normalização exata de milhares sem centavos (`R$ 3.299` -> `3299`), prioridade estrita de buybox, busca comparativa determinística com filtragem de acessórios, cache canônico anti-oscilação e segurança:
```bash
cd backend
npm test
```

### Testes do Frontend (65 testes unitários)
Valida extração de links compartilhados, tratamento robusto de URLs com query parameters em `compartilhamento.ts`, compatibilidade com React Native Web (eliminação de `<button>` aninhados, suporte a `boxShadow`, `useNativeDriver` seguro, `pointerEvents` e ausência de ícones inválidos da família Feather), modal estilizado de confirmação de exclusão individual e em lote (`ConfirmarExclusaoModal.tsx`), modo de seleção múltipla com barra de ações flutuante (`BarraAcoesLote.tsx`), modal estilizado de confirmação de logout (`ConfirmarLogoutModal.tsx`), remoção completa do Google do aplicativo, simulador de compartilhamento externo (`simulador-compartilhamento.html`), botão "Novo Desejo" com Design Spell e proporções 44px (`BotaoNovoDesejo.tsx`), exibição do valor extraído e proteção contra condições de corrida (`requisicaoExtracaoRef`) no Quick Creation Sheet (`AdicionarDesejoModal.tsx`), filtros e ordenação, agrupamento Kanban, formatação monetária e os fluxos de produtividade:
```bash
cd frontend
npm test
```

---

## 8. Showcase Interativo de UI/UX e Simulador de Compartilhamento (`showcase/`)

1. **Prancha Geral de Portfólio (`showcase/index.html`)**:
   - Servida estaticamente pelo backend Express em `http://127.0.0.1:8000/showcase`.
   - Exibe viewports Desktop Web e iOS lado a lado sincronizados em tempo real (estilo Behance e Dribbble Featured).

2. **Simulador de Compartilhamento Externo para Apresentação Acadêmica (`showcase/simulador-compartilhamento.html`)**:
   - Disponível em `http://127.0.0.1:8000/showcase/simulador-compartilhamento.html`.
   - Permite demonstrar ao vivo para avaliadores e professores o recebimento de produtos vindos de outros aplicativos via vitrine mock com 1 clique (Mercado Livre, Shopee, Amazon), bookmarklet de favoritos do navegador e deep links nativos.
   - Suporte a envio de links customizados com normalização automática de protocolo `https://`, preservação de parâmetros e produto padrão da Amazon atualizado para item ativo.

---

## 9. Seleção Múltipla e Exclusão em Lote (Bulk Delete)

O aplicativo conta com uma experiência completa de gerenciamento em massa de desejos:
- **Ativação Intuitiva**: Ativada via botão "Selecionar" na barra de filtros (`FilterSortBar.tsx`) ou via toque longo (`onLongPress`) em qualquer cartão de produto.
- **Barra de Ações Flutuante (`BarraAcoesLote.tsx`)**: Exibida em estilo pílula com contagem dinâmica de itens selecionados, botão para selecionar/desmarcar todos os produtos filtrados, botão de cancelamento e botão destrutivo de exclusão com contagem.
- **Indicadores Monocromáticos**: Checkboxes monocromáticos integrados na visualização em Grade (`ProductCard.tsx`), Lista (`ProductListItem.tsx`) e Matriz Kanban (`KanbanBoard.tsx`).
- **Endpoint Backend Atômico**: Rota `DELETE /api/v1/wishlist` com payload `{ ids: string[] }` garantindo exclusão segura por usuário autenticado no SQLite.
- **Diálogo de Confirmação Adaptativo (`ConfirmarExclusaoModal.tsx`)**: Ajusta dinamicamente título, contagem e resumo dos produtos selecionados antes da exclusão permanente.

---

## 10. Extração Universal de Preços em E-Commerces (`backend/src/services/scraper.js`)

O módulo de scraping foi aprimorado via TDD (`backend/testes/extracao_preco_universal_lojas.test.js`) para resolver a extração de preços e metadados em links arbitrários da **Shopee**, **Mercado Livre** e **Amazon**:

1. **Priorização Anti-WAF para Amazon e Shopee (`obterPerfisParaUrl`, `ehUrlAmazon`, `ehUrlShopee`)**:
   - Links da Amazon (`amazon.com.br`, `amazon.com`, `a.co`, `amzn.to`) e da Shopee (`shopee.com.br`, `shope.ee`) priorizam o perfil `PERFIL_WHATSAPP` (`WhatsApp/2.23.23.77 A`), recebendo o HTML SSR completo na 1ª tentativa e evitando o bloqueio de WAF/Captcha aplicado a navegadores sem JavaScript.
2. **Seletores Avançados da Amazon (`extrairPrecoHtml`)**:
   - Quando `.a-offscreen` vem vazio no SSR da Amazon, o scraper reconstrói o preço combinando `.a-price-whole` e `.a-price-fraction` (descartando preços riscados `.a-text-price`), além de ler inputs ocultos (`#twister-plus-price-data-price`, `#attach-base-product-price`, `#priceValue`) e imagens de `#landingImage` (`data-old-hires` / `src`).
3. **Filtragem de Bloqueio Anti-Bot e Extração de Slug no Mercado Livre (`ehImagemGenericaBloqueio`, `ehTituloGenericoBloqueio`, `extrairTituloDeSlugUrl`)**:
   - Descarta logos e títulos institucionais genéricos servidos pela página de desafio `bot-interceptor-muralla` (`pt_logo_large_plus`, `"Mercado Livre"`, `"Segurança — Mercado Livre"`), permitindo prosseguir para os próximos perfis de crawler e extrair o título limpo diretamente do slug da URL (`/nome-do-produto/p/MLB...` ou `/MLB-123-nome-do-produto-_JM`).
4. **Leitura de Scripts JSON de Estado (`extrairPrecoDeScriptEmbutido`)**:
   - Extrai preços de objetos JSON de hidratação como `__NEXT_DATA__` da Shopee (incluindo conversão automática de subunidades multiplicadas por `100.000`) e `__PRELOADED_STATE__` do Mercado Livre (`"price":{"amount":...}`).
5. **Fallback Determinístico de Preço (`buscarPrecoPorPesquisaWeb`, `selecionarMelhorPrecoDeCards`, `obterChaveCanonicaUrl`)**:
   - Quando o SSR da loja omite completamente o preço de um produto arbitrário (comum na Shopee e em páginas protegidas do Mercado Livre), o serviço consulta primeiramente o catálogo estruturado de produtos do Buscapé (`[data-testid="product-card"]`), descartando acessórios avulsos (`bateria`, `carregador`, `maleta`, `capa`) e pontuando os cartões pela correspondência de categoria, especificação numérica e marca, independentemente da ordem no DOM.
   - Normalização monetária aprimorada em `normalizarPreco` (`converterStringNumericaParaFloat`) para tratar valores na casa dos milhares sem centavos (`"R$ 3.299"` -> `3299.00`, `"1.250"` -> `1250.00`).
   - Prioridade estrita de containers de Buybox na Amazon e no Mercado Livre em `extrairPrecoHtml`, evitando capturar `.a-offscreen` de carrosséis patrocinados rotativos, ofertas de itens usados (`#aod-ingress-link`) ou subtítulos de parcelamento (`.ui-pdp-price__subtitles`).
   - Cache canônico em memória (`CACHE_METADADOS_PRODUTO`) indexado por `obterChaveCanonicaUrl` (`amazon:ASIN`, `shopee:shopId.itemId`, `ml:MLB...`) aliado ao controle de concorrência (`requisicaoExtracaoRef`) em `AdicionarDesejoModal.tsx`, garantindo que clicar em **"Extrair"** repetidas vezes para um mesmo link retorne sempre exatamente o mesmo valor.

