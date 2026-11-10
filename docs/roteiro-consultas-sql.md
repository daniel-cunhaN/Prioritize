# Roteiro de Apresentação com Consultas SQL em Tempo Real

Este guia foi elaborado para apoiar a apresentação do **Prioritize** para seu professor e avaliadores, permitindo demonstrar a correspondência direta entre as **ações na interface do aplicativo** e a **persistência relacional no banco de dados SQLite**.

---

## 1. Preparação do Terminal para a Apresentação

Abra um terminal (PowerShell ou Prompt de Comando) na pasta raiz do projeto (`Prioritize`) antes de iniciar a apresentação.

### Opção A: Executar Terminal Interativo do SQLite com Bordas Elegantes (Recomendado)
Para deixar a visualização no projetor com visual de tabela formatada:

```powershell
sqlite3 -box -header backend/wishlist.db
```

> **Dica**: No terminal do SQLite, os comandos abaixo podem ser colados diretamente seguidos de `;` e Enter. Para sair, digite `.exit`.

### Opção B: Executar Comandos Diretos via PowerShell
Caso prefira rodar comando a comando diretamente no PowerShell sem entrar no shell interativo:

```powershell
sqlite3 -box -header backend/wishlist.db "SUA_CONSULTA_AQUI;"
```

---

## 2. Abertura da Apresentação: Estrutura do Banco e Integridade

**O que falar para o professor:**
> *"Nosso banco de dados é relacional, utilizando SQLite com integridade referencial (`FOREIGN KEY`) ativa e índices otimizados para consultas rápidas por e-mail e identificador de usuário."*

### Consulta 0: Exibir as Tabelas e o Esquema Relacional
No terminal do SQLite:
```sql
.tables
```
```sql
.schema
```
**O que mostrar:**
- Tabela `users` com `email UNIQUE` e índice `idx_users_email`.
- Tabela `wishlist_items` com `user_id`, `priority`, `price REAL` e `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`.

---

## 3. Roteiro Passo a Passo: Ação no App ➡️ Consulta SQL

---

### Ação 1: Cadastro de Novo Usuário no Aplicativo
1. **No Aplicativo:** Acesse a tela de Registro e crie uma nova conta (ex.: `professor@faculdade.com`).
2. **No Terminal:** Execute a consulta para comprovar a inserção segura:

```sql
SELECT
    id,
    email,
    SUBSTR(hashed_password, 1, 28) || '...' AS hash_seguro,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 1;
```

**Explicação para a banca:**
- O ID gerado é um identificador único (UUID v4).
- A senha **nunca é armazenada em texto puro** — é gerado um hash criptográfico seguro com salt, protegendo as credenciais do usuário.

---

### Ação 2: Adição de Produto via Link Compartilhado ou Modal
1. **No Aplicativo:** Cole um link (Mercado Livre, Shopee ou Amazon) ou utilize o botão *"Compartilhar no Prioritize"* no Simulador/Bookmarklet.
2. Observe o modal preencher automaticamente **título**, **imagem** e **preço extraído**.
3. Selecione a importância **Alta** e clique em **+ Salvar na Lista**.
4. **No Terminal:** Execute a consulta para inspecionar os dados recebidos:

```sql
SELECT
    id,
    title,
    price,
    priority,
    SUBSTR(url, 1, 45) || '...' AS url_encurtada,
    SUBSTR(image_url, 1, 40) || '...' AS imagem_cdn,
    created_at
FROM wishlist_items
ORDER BY created_at DESC
LIMIT 1;
```

**Explicação para a banca:**
- Demonstra que o web scraping extraiu o valor numérico (`REAL`), o link da CDN da imagem e o título limpo.
- A classificação de importância foi gravada como `3` (Alta), pronta para alimentar a visualização Kanban.

---

### Ação 3: Relação 1:N (JOIN entre Usuário e Seus Desejos)
1. **No Terminal:** Execute a consulta com `INNER JOIN` para mostrar a associação relacional:

```sql
SELECT
    u.email AS usuario,
    w.title AS produto,
    'R$ ' || PRINTF('%.2f', w.price) AS preco,
    CASE w.priority
        WHEN 3 THEN '● Alta (Prioritário)'
        WHEN 2 THEN '◐ Média (Desejável)'
        WHEN 1 THEN '○ Baixa (Pode esperar)'
    END AS classificacao,
    w.created_at AS adicionado_em
FROM wishlist_items w
INNER JOIN users u ON w.user_id = u.id
ORDER BY w.created_at DESC
LIMIT 5;
```

**Explicação para a banca:**
- Mostra a integridade referencial: cada item da lista pertence estritamente ao seu respectivo usuário autenticado via chave estrangeira `user_id`.

---

### Ação 4: O Coração do Projeto — Tabela Kanban Agrupada por Importância
1. **No Aplicativo:** Mostre as três raias do Kanban (**Alta**, **Média** e **Baixa**) na tela inicial.
2. **No Terminal:** Execute a consulta de agregação (`GROUP BY`) que reflete o cálculo do quadro:

```sql
SELECT
    CASE priority
        WHEN 3 THEN '3 - Alta'
        WHEN 2 THEN '2 - Média'
        WHEN 1 THEN '1 - Baixa'
    END AS coluna_kanban,
    COUNT(*) AS total_itens,
    'R$ ' || PRINTF('%.2f', SUM(COALESCE(price, 0))) AS valor_total_estimado,
    'R$ ' || PRINTF('%.2f', AVG(COALESCE(price, 0))) AS ticket_medio
FROM wishlist_items
GROUP BY priority
ORDER BY priority DESC;
```

**Explicação para a banca:**
- Comprova que as três colunas do Kanban no frontend correspondem à agregação SQL por `priority`.
- Apresenta métricas consolidadas: volume de itens e valor financeiro total estimado para cada faixa de prioridade.

---

### Ação 5: Edição de Produto (Mudança de Prioridade ou Valor)
1. **No Aplicativo:** Clique no card de um produto salvo, altere a importância de "Média" para "Alta" (ou edite o valor) e salve.
2. **No Terminal:** Execute a consulta para auditar a atualização temporal:

```sql
SELECT
    title,
    priority,
    price,
    created_at,
    updated_at
FROM wishlist_items
ORDER BY updated_at DESC
LIMIT 1;
```

**Explicação para a banca:**
- Mostra que o timestamp `updated_at` foi atualizado em tempo real via comando `UPDATE`, preservando a rastreabilidade da alteração.

---

### Ação 6: Filtros e Pesquisa de Produtos (Simulação de `LIKE`)
1. **No Aplicativo:** Digite um termo na barra de pesquisa (ex.: *"Fone"* ou *"Scooter"*) ou selecione o filtro de uma loja (ex.: *"Shopee"*).
2. **No Terminal:** Mostre a consulta SQL equivalente executada pela API:

```sql
SELECT
    title,
    'R$ ' || PRINTF('%.2f', price) AS preco,
    SUBSTR(url, 1, 50) AS loja_url
FROM wishlist_items
WHERE title LIKE '%fone%' OR url LIKE '%fone%'
ORDER BY created_at DESC;
```

**Explicação para a banca:**
- O backend implementa sanitização de parâmetros contra SQL Injection utilizando prepared statements do SQLite (`?`).

---

### Ação 7: Exclusão em Lote (Modo de Seleção Múltipla / Bulk Delete)
1. **No Aplicativo:**
   - Clique em **"Selecionar"** na barra de ações (ou dê um clique longo em um item).
   - Marque 2 ou mais produtos com o checkbox monocromático.
   - Clique no botão vermelho **"Excluir (X)"** e confirme no diálogo modal.
2. **No Terminal:** Execute a consulta antes e depois para comprovar a exclusão atômica:

```sql
-- Contagem total de itens atuais
SELECT COUNT(*) AS total_itens_restantes FROM wishlist_items;
```

**Explicação para a banca:**
- A API executa a exclusão de múltiplos registros em uma única transação atômica (`DELETE FROM wishlist_items WHERE id IN (?, ?) AND user_id = ?`), garantindo integridade e consistência.

---

### Ação 8: Verificação de Integridade Referencial (`PRAGMA`)
1. **No Terminal:** Execute a checagem oficial de integridade de chaves estrangeiras:

```sql
PRAGMA foreign_key_check;
```

**Explicação para a banca:**
- Se o comando retornar vazio, significa **zero registros órfãos** e **100% de conformidade referencial**.
- Caso um usuário seja excluído, a regra `ON DELETE CASCADE` remove automaticamente todos os seus desejos dependentes sem deixar lixo no banco.

---

## 4. Resumo Rápido para Colar no Terminal Durante a Apresentação

Mantenha este bloco aberto em uma janela secundária para consultas instantâneas:

```sql
-- 1. Último usuário cadastrado
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 1;

-- 2. Último produto adicionado
SELECT title, price, priority, created_at FROM wishlist_items ORDER BY created_at DESC LIMIT 1;

-- 3. Resumo completo das colunas do Kanban
SELECT
    priority,
    COUNT(*) AS total,
    SUM(price) AS soma_reais
FROM wishlist_items
GROUP BY priority
ORDER BY priority DESC;

-- 4. Todos os produtos com seus usuários
SELECT u.email, w.title, w.price, w.priority
FROM wishlist_items w
JOIN users u ON w.user_id = u.id
ORDER BY w.created_at DESC;
```
