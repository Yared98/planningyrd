# PlanningYrd - Core Workflow Specification

**Versão:** 1.2.0 | **Atualizado:** 2026-09-18

## 1. Visão Geral
O **PlanningYrd** é uma ferramenta de Planning Poker (Estimativa Ágil) em tempo real. Suporta múltiplos baralhos, votação cega, auto-revelação, histórias/backlog e exportação multi-formato.

---

## 2. API REST

### `POST /api/rooms`
Cria uma nova sala de estimativa.

**Request Body:**
```json
{
  "name": "Sprint 43 Planning",
  "deck_type": "fibonacci",
  "custom_deck": null,
  "auto_reveal": false
}
```

**Response `201`:**
```json
{
  "id": "01HXXX...",
  "name": "Sprint 43 Planning",
  "deck_type": "fibonacci",
  "facilitator_token": "01HYYY..."
}
```

**Validações:**
- `name`: 1 a 100 caracteres (obrigatório).
- `deck_type`: `"fibonacci"`, `"modified_fibonacci"`, `"tshirt"`, `"powers_of_2"`, `"custom"`.
- `custom_deck`: Array de strings, máximo 50 cartas, cada carta com 1 a 20 caracteres.
- `auto_reveal`: `false` por padrão.

### `GET /api/rooms/{id}`
Retorna estado da sala, lista de histórias e história atual.

**Response `200`:**
```json
{
  "room": { "id": "...", "name": "...", "deck_type": "...", "status": "voting", "auto_reveal": false, "show_average": true, "current_story_id": null, "timer_seconds_remaining": 0, "timer_is_running": false },
  "stories": [...],
  "current_story": { ... }
}
```

> **Segurança:** O campo `facilitator_token` é **omitido** da resposta pública (`RoomPublic`). Apenas o criador da sala conhece o token.

### `GET /api/rooms/{id}/export`
Exporta as histórias estimadas. **Query:** `format=markdown|csv|json`

**Formatos:**
- `markdown` (padrão): Tabela com ID, título, pontuação final e status.
- `csv`: Colunas `id,title,description,status,final_score`.
- `json`: Objeto `{ room, stories }`.

---

## 3. Ciclo de Vida da Sala

### Fase 1: Setup (Lobby)
- **Given** um usuário que acessa a página inicial do PlanningYrd
- **When** ele preenche o nome da sala e escolhe o baralho
- **Then** o sistema gera a sala (ID ULID), armazena no SQLite e cria um `facilitator_token` secreto.
- **And** o criador automaticamente assume o papel de Facilitador.

### Fase 2: Gerenciamento do Backlog
- O Facilitador pode adicionar histórias/tarefas ao backlog via interface ou WebSocket (`ADD_STORY`).
- A história ativa é definida pelo campo `current_story_id` da sala.

### Fase 3: Estimativa (Votação Cega)
- **Given** uma história em discussão
- **When** um participante envia seu voto via WebSocket
- **Then** o backend armazena o voto e transmite o status mascarado `{ participant_id, has_voted: true }` para os demais.
- **And** nenhum cliente vê o valor do voto de terceiros antes da revelação (sem viés de ancoragem).

### Fase 4: Revelação (Show Cards)
- **Given** que todos votaram **ou** o Facilitador encerrou a rodada
- **When** o evento de revelação (`cards_revealed`) é transmitido
- **Then** todos os votos reais são enviados com autores, a mesa executa animação de flip 3D.
- **And** se `auto_reveal: true`, a revelação ocorre automaticamente quando o último voto é registrado.

### Fase 5: Consenso & Score Final
- Estatísticas calculadas: Média (ignorando `?`, `☕`), Mediana, Moda.
- Índice de consenso: 100% = unânime (confetes!); 70–99% = alto; <70% = divergência.
- O Facilitador define o `final_score` da história (pode divergir da média).

---

## 4. Limpeza de Salas Vazias
- O backend mantém um `HashMap<RoomId, RoomState>` em memória protegido por `tokio::sync::Mutex`.
- Quando o último participante desconecta de uma sala, o estado em memória é limpo para evitar leak.
- O SQLite persiste o estado das histórias e votos para eventual reconexão.

---

## 5. Modos de Participante
- **Facilitador**: Controla histórias, cronômetro, revelação e score final. Identificado por `facilitator_token` em cookie local.
- **Avaliador (Estimator)**: Recebe o baralho para votar. Seu assento tem indicador de voto na mesa.
- **Espectador (Spectator)**: Não vota. Não afeta quórum nem consenso. Pode acompanhar e reagir.
