# Prioritize — Lista de Desejos e Gestão de Prioridades

Aplicação fullstack multiplataforma com backend em **Node.js (Express + SQLite)** e frontend em **React Native (Expo Web / iOS / Android)**, construída sob um **Design System Monocromático Minimalista de Alto Contraste**.

---

## ✨ Principais Recursos de UI/UX e Produto

- **Design System Monocromático (P&B Alto Contraste)**: Fundo branco puro (`#FFFFFF`), cartões cinza claro sutis (`#FAFAFA`), tipografia bold (`SF Pro Display` / `Plus Jakarta Sans`) e componentes em formato pílula.
- **Herança Automática via Compartilhamento de Links**: Cole ou compartilhe um link de qualquer loja para herdar **Link, Imagem, Título e Preço** automaticamente no **Quick Creation Bottom Sheet**, classificando a importância com tags em pílula (`● Alta`, `◐ Média`, `○ Baixa`).
- **4 Visões Integradas de Produtividade**:
  1. **Dashboard & Matriz Kanban**: Métricas-chave, gráfico semanal interativo de conclusão (`7D`) e visualização em **Kanban**, **Grade** ou **Lista**.
  2. **Quick Creation Bottom Sheet**: Criação/edição deslizante estilo iOS com tags de prioridade em formato pílula.
  3. **Checklist Focado (`Foco`)**: Checkboxes limpos de alto contraste, barra de progresso em tempo real e filtros rápidos (`Todos`, `Pendentes`, `Concluídos`).
  4. **Activity Log (`Log`)**: Linha do tempo minimalista com bolhas circulares de eventos (`+`, `✓`, `↺`, `✎`, `✕`).
- **Floating Pill Navigation Bar**: Barra flutuante mobile em formato pílula com botão `+` integrado e cabeçalho responsivo lado a lado na Web.

---

## 🚀 Como Executar o Projeto

### 1. Instalar as Dependências

```bash
# Setup do Backend (Node.js)
cd backend
npm install
cd ..

# Setup do Frontend (Expo)
cd frontend
npm install
cd ..
```

---

### 2. Iniciar a Aplicação

#### Opção A: Via inicializador unificado (Windows)
```cmd
start.bat
```

#### Opção B: Via Node.js (Multiplataforma)
```bash
node start.js
# ou
npm run dev
```

- **Aplicação Web (Expo)**: http://localhost:8081
- **API Backend**: http://127.0.0.1:8000
- **UI/UX Portfolio Showcase**: http://127.0.0.1:8000/showcase

---

### 3. Executar os Testes Automatizados

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```
