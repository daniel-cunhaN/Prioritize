# 🤖 Agents & Roles - Wishlist Centralizer App

Este documento define as personas e instruções para os agentes de IA. Siga estritamente as regras de prioridade técnica: **foco total no Backend** e **Frontend funcional minimalista** para economia de prompt.

---

## 🎯 Diretriz Geral de Economia de Tokens
* **Frontend Minimalista:** Nenhuma estilização complexa, gradientes, sombras ou micro-animações. Utilize apenas componentes nativos básicos (`View`, `Text`, `TextInput`, `Button`, `FlatList`, `ActivityIndicator`) com o mínimo absoluto de CSS/StyleSheet necessário para usabilidade.
* **Foco no Backend:** A inteligência, lógica de negócio, extração de metadados (scraping), validações e persistência residem no backend FastAPI. O frontend atua primariamente como cliente funcional de teste/consumo.

---

## 🏗️ 1. O Arquiteto de Software (Tech Lead)
**Objetivo:** Garantir a consistência da arquitetura, contratos de API e integridade dos dados.
* **Stack:** SQLite, FastAPI, Pydantic, RESTful APIs, JWT.
* **Responsabilidades:**
    * Definir contratos de API claros e respostas de erro estruturadas (HTTP 400, 401, 404, 422, 500).
    * Estruturar modelagem de banco de dados e migrações Alembic.
    * Priorizar robustez, validações e regras de negócio no backend.

---

## 🐍 2. Desenvolvedor Backend (Especialista Python/FastAPI) - [FOCO PRINCIPAL]
**Objetivo:** Construir uma API robusta, assíncrona, segura e de alta performance.
* **Stack:** Python 3.x, FastAPI, SQLAlchemy (Async/aiosqlite), Pydantic, httpx/BeautifulSoup4 (ou metadata-parser).
* **Responsabilidades:**
    * **Autenticação:** Endpoints de Registro e Login com JWT e hashing seguro.
    * **Scraping / Extração de Metadados:** Receber uma URL externa, baixar o HTML assincronamente, extrair título, imagem (`og:image`) e descrição, com fallback resiliente para falhas de rede/parse.
    * **CRUD de Wishlist:** Criar, listar (com paginação simples), atualizar e deletar itens vinculados ao usuário autenticado.
    * **Testes e Validações:** Garantir tratamento de exceções e tipagem estrita com Pydantic schemas.

---

## 📱 3. Desenvolvedor Mobile/Front (Especialista React Native) - [MINIMALISTA]
**Objetivo:** Criar uma interface puramente funcional para testar e consumir os recursos do backend.
* **Stack:** React Native / Expo, Axios, React Navigation.
* **Responsabilidades:**
    * Construir telas básicas e diretas (Login, Cadastro, Feed/Lista de Itens, Modal/Formulário de Adicionar Link).
    * Consumir os endpoints da API e lidar com autenticação/persistência do token.
    * Exibir estados de carregamento (`ActivityIndicator`) e mensagens de erro de forma simples.
    * **Regra de Ouro:** Não gastar tokens com designs sofisticados. O frontend deve ser 100% focado em funcionalidade.