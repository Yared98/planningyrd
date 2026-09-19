<div align="center">

# 🃏 PlanningYrd

**Planning Poker Ágil & Colaborativo em Tempo Real**

*Estimativas ágeis sem viés de ancoragem, múltiplos baralhos, métricas de consenso automáticas e servidor MCP nativo para integração com Inteligência Artificial.*

[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg?logo=rust)](https://www.rust-lang.org)
[![Axum](https://img.shields.io/badge/Axum-0.8-blue.svg)](https://github.com/tokio-rs/axum)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Design System](https://img.shields.io/badge/Design_System-Agile_Cadence-6366f1.svg)](https://github.com/Yared98)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[🚀 Teste a Demonstração Online](https://planning.yared.com.br)** • [Funcionalidades](#-funcionalidades-principais) • [Arquitetura](#-arquitetura) • [Como Executar](#-como-executar) • [Servidor MCP](#-servidor-mcp-nativo) • [Yrd Agile Toolkit](#-yrd-agile-toolkit)

</div>

---

## 🎯 Visão Geral

O **PlanningYrd** é uma ferramenta corporativa de Planning Poker em tempo real projetada para eliminar o viés de ancoragem nas estimativas de histórias e sprints. Construído como alternativa privada, robusta e auto-hospedável a plataformas pagas como PlanningPoker.com ou PointingPoker, o PlanningYrd oferece zero custo de licenciamento, total privacidade de dados e integração nativa com agentes de IA via Model Context Protocol (MCP).

### Destaques
1. **Sem Viés de Ancoragem:** Votos mantidos estritamente ocultos até a revelação simultânea pelo facilitador ou revelação automática configurável.
2. **Estatísticas Instantâneas:** Média aritmética, mediana, percentual de concordância e distribuição de votos calculados no ato da revelação com celebração de confetes em caso de consenso!
3. **Baralhos Diversos:** Suporte nativo a Fibonacci (`0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕`), Tamanhos de Camiseta (`XS, S, M, L, XL, XXL, ?, ☕`), Sequencial ou baralhos totalmente customizáveis.
4. **Papéis Bem Definidos:** Facilitadores (controle de rodada, revelação, limpeza e gestão de backlog), Estimadores e Espectadores.
5. **Backlog de Histórias:** Adicione, reordene e estime histórias em sequência com exportação completa em Markdown, CSV e JSON.

---

## 🚀 Funcionalidades Principais

- 🃏 **Votação em Tempo Real via WebSockets:** Sincronização instantânea entre todos os participantes da mesa com reconexão resiliente.
- 🎭 **Perfis e Avatares:** Escolha seu apelido e avatar personalizado.
- 🔒 **Controle Seguro de Facilitador:** Token criptográfico para retomar o controle da sala a qualquer momento.
- 📊 **Cálculo de Consenso:** Identificação automática de divergências extremas para incentivar discussões técnicas produtivas.
- 📥 **Exportação Rápida:** Gere relatórios das estimativas em Markdown para colar no Jira, Azure DevOps, Notion ou Slack.
- 🌐 **Internacionalização (i18n):** Suporte nativo e instantâneo a Português (`pt-BR`) e Inglês (`en-US`).
- 🌗 **Tema Claro & Escuro:** Design system sofisticado *Agile Cadence* com iluminação radial atmosférica.
- 🕒 **Histórico de Salas Recentes:** Acesso direto às salas facilitadas e participadas com modal de confirmação para remoção.

---

## 🏗️ Arquitetura

O PlanningYrd segue a metodologia **OpenSpec (Spec-Driven Development)** e padrões arquiteturais de alta performance:

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Backend** | **Rust (Axum + Tokio)** | Servidor assíncrono ultrarrápido com consumo mínimo de memória (< 20MB) e Event Broker nativo. |
| **Banco de Dados** | **SQLite (WAL Mode)** | Arquivo único persistido em volume local/Docker, garantindo concorrência segura e backups triviais. |
| **Frontend** | **React + Vite + TypeScript** | SPA reativa com design moderno em glassmorphism e animações fluidas. |
| **Protocolo de IA** | **Model Context Protocol (MCP)** | Endpoint JSON-RPC 2.0 em `/mcp` para consulta de salas e injeção de estimativas por LLMs. |

### Estrutura de Diretórios

```text
planningyrd/
├── openspec/                         # Especificações OpenSpec e governança
│   ├── AGENTS.md                     # Diretrizes para agentes de IA
│   ├── specs/                        # Especificações vivas do domínio
│   └── changes/                      # Histórico de propostas e mudanças
├── backend/                          # Backend em Rust (Axum)
│   ├── src/
│   │   ├── main.rs                   # Inicialização, rotas HTTP e static service
│   │   ├── db.rs                     # SQLite migrations e queries estruturadas
│   │   ├── ws.rs                     # WebSocket hub, broadcast e presença
│   │   ├── mcp.rs                    # Servidor nativo Model Context Protocol
│   │   ├── models.rs                 # Structs de salas, participantes, votos e histórias
│   │   └── state.rs                  # AppState compartilhado
│   └── Cargo.toml
├── frontend/                         # Frontend React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/               # LandingPage, Header, PokerTable, Backlog, etc.
│   │   ├── hooks/                    # useRoomSocket com sincronização em tempo real
│   │   ├── i18n/                     # Traduções completas em PT e EN
│   │   ├── utils/                    # Histórico recente de salas e sessões
│   │   ├── index.css                 # Design System "Agile Cadence"
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 🤖 Servidor MCP Nativo

O PlanningYrd disponibiliza um endpoint JSON-RPC 2.0 compatível com a especificação **Model Context Protocol** em:
`http://localhost:8082/mcp` (ou porta configurada).

### Capacidades para Agentes de IA:
- **Consultar Estado da Mesa:** Obter lista de participantes, cartas votadas, status de revelação e estatísticas de consenso.
- **Gerenciar Backlog:** Criar histórias automaticamente a partir de issues do GitHub/Jira ou épicos de produto.
- **Facilitação Assistida:** Agentes de IA podem resumir discussões de estimativas e propor pontos de história de forma autônoma.

---

## 💻 Como Executar

### Opção 1: Via Docker Compose (Recomendado para Produção / Zero Cost)

```bash
docker-compose up -d --build
```
A aplicação estará disponível em `http://localhost:8082` com persistência de dados no volume `planning-data`.

#### Variáveis de Ambiente (`.env`)
- `PORT`: Porta interna do servidor (Padrão: `3000`, mapeada para `8082` no Docker).
- `DATABASE_PATH`: Caminho do banco SQLite (Padrão: `/app/data/planningyrd.db`).
- `UMAMI_SCRIPT_URL`: URL do script de telemetria com foco em privacidade (Opcional).
- `UMAMI_WEBSITE_ID`: ID do site no Umami (Opcional).

---

### Opção 2: Desenvolvimento Local

#### 1. Backend (Rust)
```bash
cd backend
cargo run
```
O servidor iniciará em `http://localhost:3000`.

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
O frontend iniciará em `http://localhost:5173` com proxy automático redirecionando chamadas `/api`, `/ws` e `/mcp` para a porta `3000`.

---

## 🧰 Yrd Agile Toolkit

O **PlanningYrd** faz parte do ecossistema de cerimônias ágeis corporativas sem custo de licenciamento:

| Ferramenta | Propósito | Link de Produção |
| :--- | :--- | :--- |
| **RetroYrd** | Retrospectivas Ágeis com Segurança Psicológica, Modo Cego e Servidor MCP | [retro.yared.com.br](https://retro.yared.com.br) |
| **DailyYrd** | Standups Diárias com Roleta de Fala, Spotlight de Bloqueios e Exportação Slack | [daily.yared.com.br](https://daily.yared.com.br) |
| **PlanningYrd** | Planning Poker em Tempo Real, Métricas de Consenso e Backlog de Histórias | [planning.yared.com.br](https://planning.yared.com.br) |
| **CoffeeYrd** | Lean Coffee com Dot-Voting, Timer, Notas Compartilhadas e Votação Romana | [coffee.yared.com.br](https://coffee.yared.com.br) |

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais detalhes.
Desenvolvido por **[Yared](https://yared.com.br)**.
