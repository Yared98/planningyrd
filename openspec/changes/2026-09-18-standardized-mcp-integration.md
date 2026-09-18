# Change: Padronização da Interface de Descoberta e Configuração MCP no PlanningYrd

- **Data**: 2026-09-18
- **Autor**: Antigravity AI Agent
- **Status**: Implementado & Validado
- **Repositórios Alinhados**: RetroYrd, DailyYrd, PlanningYrd

## Contexto & Motivação
Para unificar a experiência do usuário entre RetroYrd, DailyYrd e PlanningYrd, adicionamos a camada de UI de configuração do MCP no PlanningYrd, permitindo que os times descubram as ferramentas do backend (`planning_import_stories`, `planning_select_story`, `planning_save_estimate`, etc.) e configurem seus clientes de IA.

## Alterações Realizadas
1. **Componente `McpModal.tsx`**: Criado componente de visualização de status, endpoints, snippet JSON configurável para `claude_desktop_config.json` e Cursor, lista descritiva de tools e teste interativo de conectividade `/mcp`.
2. **Botão Padronizado**: Adicionado botão com ícone `Bot` e etiqueta "MCP" em `LandingPage.tsx` (na página inicial) e em `Header.tsx` (na sala de poker ativa).
3. **Internacionalização (i18n)**: Inclusão de chaves `mcp` em português e inglês no arquivo `frontend/src/i18n/index.ts`.
4. **Vite Proxy**: Configurado proxy de `/mcp` para `http://127.0.0.1:3000` em desenvolvimento.
5. **OpenSpec**: Especificação atualizada em `openspec/specs/mcp-server/spec.md`.
