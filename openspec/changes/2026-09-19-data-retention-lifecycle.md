# Change: Política de Retenção de Dados e Auto-Purge no PlanningYrd

- **Data**: 2026-09-19
- **Status**: Concluído
- **Contexto**: Padronização do tempo de guarda de dados com o ecossistema Yrd (RetroYrd / DailyYrd).

## Modificações Realizadas
1. **Método de Limpeza no Banco (`db.rs`)**:
   - Adicionado `cleanup_expired_rooms(&self, retention_days: i64) -> Result<usize>`.
   - Remoção de salas com `created_at < now - retention_days`.
   - Propagação em cascata no SQLite (`ON DELETE CASCADE`) para `stories` e `votes`.
   - Teste unitário automatizado `test_cleanup_expired_rooms`.
2. **Rotina em Segundo Plano (`main.rs`)**:
   - `tokio::spawn` rodando a cada 24 horas (`tokio::time::interval`).
   - Leitura da variável de ambiente `ROOM_RETENTION_DAYS` (padrão: `60`).
3. **Configuração e Documentação**:
   - Documentado no `.env.example`, `Dockerfile`, `docker-compose.yml` e `openspec/specs/room-lifecycle/spec.md`.
