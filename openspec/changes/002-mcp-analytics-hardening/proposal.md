# Change Proposal: 002 - MCP Server, Analytics e Hardening de Resiliência

## Motivação
Integrar o PlanningYrd ao ecossistema Yrd Agile Toolkit, viabilizar alimentação de histórias por agentes de IA e reforçar a estabilidade do servidor em produção.

## Mudanças Principais
1. **Servidor MCP**:
   - `planning_import_stories` e `planning_save_estimate` para colaboração de IA com Kanban.
2. **Hardening**:
   - Prevenção de vazamento de cartas cegas via broadcast.
   - Recuperação contra Mutex poisoning em SQLite.
   - Remoção de salas vazias em memória para evitar memory leaks.
3. **Analytics & Ecossistema**:
   - Injeção dinâmica do Umami com URLs sanitizadas.
   - Dropdown `EcosystemSwitcher` e rodapé com links oficiais.
