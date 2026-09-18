# PlanningYrd - MCP Server Specification

## 1. Visão Geral
O **PlanningYrd** expõe um servidor nativo Model Context Protocol (MCP) JSON-RPC 2.0 no endpoint `POST /mcp`.
Ele viabiliza que agentes de IA (como assistentes ágeis conectados ao Kanban/Jira) preparem, alimentem o backlog e facilitem rodadas de estimativa.

## 2. Resources Expostos
1. **`planning://room/{id}/backlog`**:
   - Lista todas as histórias cadastradas na sala, com título, status (`pending`, `active`, `estimated`) e pontuação final.
2. **`planning://room/{id}/consensus`**:
   - Métricas em tempo real da rodada ativa (média, mediana, moda e índice de concordância percentual).

## 3. Tools Disponíveis
- **`planning_import_stories`**: Injeta múltiplas histórias de usuário em lote a partir de cartões do Kanban ou backlog do produto.
- **`planning_add_story`**: Adiciona uma nova história individual ao backlog da sala.
- **`planning_select_story`**: Define qual história está sob votação ativa no momento.
- **`planning_save_estimate`**: Registra a pontuação de consenso final acordada pelo time.
- **`planning_get_room_state`**: Consulta o estado completo da sala e participantes.

## 4. Sincronização em Tempo Real
- Mutações via MCP persistem no SQLite e acionam broadcasts WebSocket para atualizar a mesa de poker dos participantes instantaneamente.

## 5. Interface de Descoberta & Setup (UI)
- **REQ-MCP-UI-001**: A aplicação DEVE expor um botão padronizado com ícone `Bot` e etiqueta "MCP" na barra superior da landing page (`LandingPage`) e na barra de ferramentas da sala ativa (`Header`).
- **REQ-MCP-UI-002**: Ao clicar no botão, o modal `McpModal` DEVE exibir a URL do endpoint (`/mcp`), os recursos da sala (`planning://room/{id}/backlog` e `/consensus`), snippet JSON pronto para Claude Desktop e Cursor, catálogo de ferramentas e teste de ping síncrono.

