# Change 001: PlanningYrd Initial Architecture

## Contexto
Criação da ferramenta de Planning Poker do ecossistema ágil Yrd, mantendo paridade visual com o Retroyrd e alta performance com Rust e WebSockets.

## Decisões Arquiteturais
1. **Backend:**
   - Framework web: Axum 0.8 com suporte a WebSockets assíncronos via Tokio.
   - Persistência: SQLite embutido (rusqlite com WAL mode) para armazenar salas, histórias e pontuações consolidadas.
   - Comunicação em tempo real: `tokio::sync::broadcast` com broadcast por sala e gerência de conexões em `DashMap`.
   - Segurança: Blind voting no nível de protocolo (valores reais de votos de outros usuários nunca chegam ao navegador antes do evento `cards_revealed`).

2. **Frontend:**
   - Framework: React 19 + TypeScript com Vite.
   - Design System: Agile Cadence (Stitch MCP `projects/10246812849207390415`), paleta Dark/Light mode com CSS custom properties.
   - i18n: Suporte bilíngue nativo (pt-BR e en-US) via `react-i18next`.
   - Experiência tátil: Mesa oval com participantes, cartas de poker 3D com efeito flip e celebração por confetes.

3. **Status:** Aprovado e em implementação.
