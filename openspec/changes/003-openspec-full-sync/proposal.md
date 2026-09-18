# Proposal: OpenSpec Full Sync — 2026-09-18

## Tipo
`spec-sync` | Sincronização de documentação com o código atual

## Escopo
Auditoria e atualização completa dos specs do PlanningYrd para refletir o estado real da implementação.

## Mudanças Registradas

### `specs/core-workflow/spec.md` — v1.0 → v1.2
- **Expandido drasticamente** de 20 linhas para spec completo:
  - Seção `API REST` com `POST /api/rooms`, `GET /api/rooms/{id}`, `GET /api/rooms/{id}/export`
  - Validações: nome (1-100 chars), `custom_deck` (≤50 cartas, 1-20 chars cada), `auto_reveal`
  - Exportação multi-formato: `markdown` (tabela), `csv`, `json`
  - Segurança: `facilitator_token` omitido do `RoomPublic`
  - Ciclo de vida completo: Lobby → Backlog → Estimativa → Revelação → Consenso
  - Limpeza de salas vazias em memória (`Mutex` + tokio cleanup)
  - Modos de participante: Facilitador, Avaliador, Espectador
