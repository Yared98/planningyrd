# Governança do Projeto PlanningYrd (AGENTS.md)

Este projeto adota a metodologia **Spec-Driven Development** através do diretório `openspec/`.

## Regras Obrigatórias para Agentes de IA
1. **Segredo de Voto & Votação Cega**:
   - Votos permanecem estritamente mascarados (`card: None`) no WebSocket até que o Facilitador acione a revelação.
2. **Resiliência de Banco & Conexões**:
   - Recuperação automática de Mutex envenenado em SQLite e tratamento de lag no broadcast.
   - Remoção de salas vazias da memória (`remove_room_if_empty`).
3. **Servidor MCP Nativo (`POST /mcp`)**:
   - Suporte à injeção e estimativa de histórias de usuário via agentes de IA.
4. **Sincronização Contínua do OpenSpec**:
   - Toda alteração funcional, de endpoint, segurança ou UI deve ser refletida em `openspec/specs/` e documentada em `openspec/changes/`.
   - Consulte `openspec/AGENTS.md` e as especificações em `openspec/specs/` para orientações detalhadas.
