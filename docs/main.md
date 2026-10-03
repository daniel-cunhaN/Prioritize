# Documentação Técnica do Projeto Prioritize

O **Prioritize** é uma aplicação para centralização e classificação de listas de desejos (wishlist). O objetivo principal é permitir que o usuário colete links de produtos compartilhados de outros aplicativos ou inseridos manualmente, herde automaticamente os dados do produto (link, imagem e título), classifique o item por ordem de importância e organize visualmente seus desejos.

---

## 1. Arquitetura do Projeto

O projeto é estruturado como um monorepo dividido em duas camadas principais:

```
Prioritize/
├── backend/                       # API REST assíncrona desenvolvida com FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py            # Injeção de dependências e autenticação JWT
│   │   │   └── routes/
│   │   │       ├── auth.py        # Rotas de cadastro e login de usuários
│   │   │       └── wishlist.py    # Rotas de gerenciamento de desejos e scraping
│   │   ├── core/                  # Configurações globais e segurança (hash de senhas)
│   │   ├── db/                    # Conexão com SQLite assíncrono e modelos SQLAlchemy
│   │   ├── schemas/               # Modelos de validação Pydantic
│   │   └── services/              # Serviços de negócio (ex: scraper de metadados)
│   └── wishlist.db                # Banco de dados relacional SQLite local
│
├── frontend/                      # Aplicativo React Native (Expo) multi-plataforma
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Cliente HTTP Axios com interceptor de token JWT
│   │   ├── components/
│   │   │   ├── AdicionarDesejoModal.tsx # Modal interativo para herança e criação de desejos
│   │   │   └── AlertBox.tsx       # Caixa de alerta estilizada para feedback de UI
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx     # Tela principal com métricas e lista de desejos
│   │   │   ├── LoginScreen.tsx    # Tela de login (refatorada com validação e segurança)
│   │   │   └── RegisterScreen.tsx # Tela de cadastro (refatorada com força de senha)
│   │   ├── utils/
│   │   │   └── validacao.ts       # Validação, sanitização XSS e token em memória
│   │   └── theme.ts               # Design system baseado na paleta Claude Amber
│   └── App.tsx                    # Navegação em pilha (Stack Navigator)
│
└── docs/
    └── main.md                    # Esta documentação técnica
```

---

## 2. Modelo de Dados (Banco de Dados)

### Tabela `users`
Armazena as contas de usuário do aplicativo.
- `id` (UUID, Chave Primária): Identificador único do usuário.
- `email` (String, Único, Indexado): E-mail de login.
- `hashed_password` (String): Hash da senha com bcrypt.
- `created_at` (DateTime): Data e hora de cadastro em UTC.
- `updated_at` (DateTime): Data e hora da última atualização.

### Tabela `wishlist_items`
Armazena os itens da lista de desejos associados ao usuário.
- `id` (UUID, Chave Primária): Identificador único do item.
- `user_id` (UUID, Chave Estrangeira `users.id`): Vínculo com o usuário proprietário.
- `url` (Text, Obrigatório): Link do produto original.
- `title` (String, Opcional/Editável): Título ou descrição do produto.
- `image_url` (Text, Opcional): Link da imagem representativa obtida do link.
- `priority` (Integer, Obrigatório): Escala de importância do item (1 a 3).
- `created_at` (DateTime): Data e hora de inclusão em UTC.
- `updated_at` (DateTime): Data e hora da última alteração.

---

## 3. Escala de Prioridade / Importância

Conforme estabelecido nas regras de negócio:
| Valor Numérico | Classificação | Ícone Representativo | Descrição de Uso |
| :--- | :--- | :--- | :--- |
| **1** | **Baixa** | 🌱 | Compras futuras, sem urgência ("Pode esperar"). |
| **2** | **Média** | ⭐ | Compras desejáveis a médio prazo ("Desejável"). |
| **3** | **Alta** | 🔥 | Itens prioritários, essenciais ou urgentes ("Prioritário"). |

---

## 4. Endpoints da API REST (Backend)

Base URL: `http://127.0.0.1:8000/api/v1`

### Autenticação (`/auth`)
- `POST /auth/register`: Cadastro de novo usuário. Retorna token Bearer JWT.
- `POST /auth/login`: Autenticação por e-mail e senha. Retorna token Bearer JWT.

### Lista de Desejos (`/wishlist`)
Todos os endpoints abaixo exigem cabeçalho `Authorization: Bearer <token>`.

- `POST /wishlist/preview`:
  - **Função**: Recebe uma URL e extrai automaticamente tags OpenGraph (`og:title`, `og:image`), Twitter Cards (`twitter:title`, `twitter:image`) ou a tag HTML `<title>`.
  - **Body**: `{ "url": "https://loja.com/produto" }`
  - **Retorno**: `{ "url": "...", "titulo": "...", "imagem_url": "..." }`
- `POST /wishlist/`:
  - **Função**: Persiste um novo desejo vinculado ao usuário logado.
  - **Body**: `{ "url": "...", "titulo": "...", "imagem_url": "...", "prioridade": 1|2|3 }`
  - **Retorno**: Item criado com `id`, `user_id`, `created_at`, etc.
- `GET /wishlist/`:
  - **Função**: Lista todos os desejos do usuário autenticado, ordenados por data decrescente.
  - **Parâmetro opcional de Query**: `?prioridade=1|2|3` para filtrar por importância.
- `DELETE /wishlist/{item_id}`:
  - **Função**: Exclui o desejo pertencente ao usuário.

---

## 5. Serviço de Scraping de Metadados (`scraper.py`)

O serviço assíncrono de extração de metadados utiliza o cliente `httpx.AsyncClient` configurado com headers simulando um navegador moderno e um parser customizado baseado em `html.parser.HTMLParser` nativo do Python:
1. Resolução de URLs de imagens relativas via `urllib.parse.urljoin`.
2. Precedência de títulos: `og:title` > `twitter:title` > `<title>`.
3. Precedência de imagens: `og:image` > `twitter:image`.
4. Fallback tolerante a falhas: caso o site bloqueie bots ou apresente erro de rede/DNS, um título amigável é derivado do domínio da URL sem derrubar a requisição do usuário.

---

## 6. Frontend: Modal de Adicionar Desejo (`AdicionarDesejoModal.tsx`)

O componente foi construído respeitando as diretrizes visuais Claude Amber e os requisitos de acessibilidade:
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

---

## 7. Frontend: Módulo de Validação e Segurança (`validacao.ts`)

Módulo utilitário centralizado que provê segurança do lado do cliente:

### Validação de E-mail
- Regex baseada na RFC 5322 simplificada para validação de formato.
- Retorna objeto tipado com `valido` (boolean) e `erro` (mensagem descritiva).

### Validação de Força de Senha
- Critérios obrigatórios: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número.
- Critério bônus: caractere especial.
- Classificação progressiva: `fraca` (≤3 critérios), `media` (4 critérios), `forte` (5 critérios).
- Retorna interface `ResultadoForcaSenha` com critérios individuais para feedback visual.

### Sanitização Anti-XSS
- `sanitizarInput(texto)`: Substitui caracteres HTML perigosos (`<`, `>`, `"`, `'`, `&`, `/`) por entidades seguras.
- `removerHTML(texto)`: Remove tags HTML e scripts antes de processar o input.

### Gerenciamento de Tokens em Memória
- Tokens JWT armazenados em closure de módulo (`tokenEmMemoria`), evitando `localStorage` para dados sensíveis.
- Funções exportadas: `definirToken()`, `obterToken()`, `limparToken()`.
- Em plataformas nativas: `expo-secure-store` como camada persistente segura.
- Em web: `sessionStorage` como fallback temporário (ideal futuro: cookies `HttpOnly`).

---

## 8. Frontend: Telas de Login e Registro Refatoradas

As telas `LoginScreen.tsx` e `RegisterScreen.tsx` foram refatoradas com foco em:

### Layout e UX (Inspiração: Auth Screen Moderno)
- **Cabeçalho limpo com nova identidade visual**: Nova logo oficial do Prioritize em formato PNG com canal alfa / transparência (`logo.png`, `iconeapp.png` e `icon.png`) centralizada com nome e subtítulo, adaptando-se perfeitamente aos modos claro e escuro.
- **Login social**: Foco exclusivo em Google (`Continuar com Google`), sem Apple.
- **Divisor visual "ou"**: Separa login social do formulário de credenciais.
- **Campos de input com ícones**: Ícone de envelope para e-mail, cadeado para senha.
- **Toggle de visibilidade minimalista e profissional**: Alternância com ícone de olho aberto (`👁`) e fechado/traçado (`⊘`), sem emojis informais.
- **Caixa de Alerta Customizada (`AlertBox.tsx`)**: Feedback inline padronizado (erro, sucesso, aviso, info) perfeitamente integrado à paleta Claude Amber, eliminando diálogos bloqueantes ou intrusivos.
- **Botão CTA primário em destaque**: Cor `primary` da paleta Claude Amber.
- **Responsividade mobile-first**: `maxWidth: 420px` no container, centralizado em telas grandes.
- **KeyboardAvoidingView**: Comportamento adaptado por plataforma (iOS: `padding`, Android: `height`).

### Segurança Client-Side
- **Validação em tempo real**: E-mail validado no `onBlur`, senha validada no envio.
- **Indicador de força de senha** (apenas `RegisterScreen`): Barra progressiva colorida + lista de critérios com checkmarks.
- **Campo de confirmação de senha** (apenas `RegisterScreen`): Validação de correspondência em tempo real.
- **Sanitização anti-XSS**: Todos os inputs passam por `removerHTML()` antes de atualizar o estado.
- **Dados sanitizados no envio**: `sanitizarInput()` aplicado antes de enviar para a API.
- **Token seguro**: `definirToken()` armazena em memória; fallback para `SecureStore` (nativo) ou `sessionStorage` (web).

### Consistência Visual
- Todas as cores derivadas exclusivamente de `theme.ts` (paleta Claude Amber).
- Estilos nomeados em português brasileiro conforme convenção do projeto.
- Tokens de design (`spacing`, `radius`, `typography`, `shadows`) utilizados consistentemente.

---

## 9. Próximos Passos Recomendados

1. **Visualização Kanban**:
   - Implementar colunas kanban agrupando os cards de desejos pelas três classificações de prioridade ("Baixa", "Média", "Alta"), permitindo reordenação ou arrastar e soltar (drag and drop).
2. **Deep Linking / Intent de Compartilhamento Nativo**:
   - Configurar o módulo `expo-sharing` ou handlers de intents do Android/iOS para capturar links compartilhados de navegadores ou apps de e-commerce diretamente no modal do Prioritize.
3. **Cookies HttpOnly para Tokens JWT**:
   - Migrar o armazenamento de tokens na web de `sessionStorage` para cookies `HttpOnly` configurados no backend, eliminando qualquer exposição a XSS.
4. **Integração Real de Login Social**:
   - Implementar OAuth2/OpenID Connect com Google e Apple usando `expo-auth-session` para preencher os botões de login social já estruturados nas telas.
