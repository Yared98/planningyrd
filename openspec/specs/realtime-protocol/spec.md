# Spec: Real-time WebSocket Protocol

## Objetivo
Definir o contrato de mensagens em tempo real entre os clientes do frontend e o backend em Rust.

## Tipos de Mensagens (Cliente -> Servidor)

1. `join`:
   ```json
   {
     "type": "join",
     "participant_id": "usr_123",
     "name": "Yared",
     "avatar": "🦊",
     "role": "estimator",
     "facilitator_token": "optional_token"
   }
   ```
2. `vote`:
   ```json
   {
     "type": "vote",
     "card_value": "5"
   }
   ```
3. `retract_vote`:
   ```json
   {
     "type": "retract_vote"
   }
   ```
4. `reveal_cards`:
   ```json
   {
     "type": "reveal_cards"
   }
   ```
5. `reset_round`:
   ```json
   {
     "type": "reset_round"
   }
   ```
6. `add_story`:
   ```json
   {
     "type": "add_story",
     "title": "Migrar autenticação para JWT",
     "description": "Detalhes de aceitação..."
   }
   ```
7. `select_story`:
   ```json
   {
     "type": "select_story",
     "story_id": "st_01"
   }
   ```
8. `save_story_score`:
   ```json
   {
     "type": "save_story_score",
     "story_id": "st_01",
     "score": "5"
   }
   ```
9. `change_deck`:
   ```json
   {
     "type": "change_deck",
     "deck_type": "tshirt"
   }
   ```
10. `timer_action`:
    ```json
    {
      "type": "timer_action",
      "action": "start", // "start" | "pause" | "reset"
      "duration_seconds": 120
    }
    ```
11. `reaction`:
    ```json
    {
      "type": "reaction",
      "emoji": "🎉"
    }
    ```
12. `ping`:
    ```json
    {
      "type": "ping"
    }
    ```

## Tipos de Eventos (Servidor -> Clientes Broadcast)

1. `room_snapshot`: Estado completo ao conectar (sala, histórias, participantes online, votos mascarados ou desmascarados conforme status atual).
2. `presence_updated`: Lista atualizada de participantes conectados e seus papéis.
3. `vote_cast`: Indicador de que um participante votou (`has_voted: true`).
4. `vote_retracted`: Indicador de que um participante cancelou seu voto antes da revelação.
5. `cards_revealed`: Lista com todos os votos desmascarados e cálculo de estatísticas (média, mediana, concordância).
6. `round_reset`: Limpeza da rodada para nova votação.
7. `backlog_updated`: Atualização na lista de histórias ou história ativa.
8. `deck_updated`: Notificação de troca de baralho da sala.
9. `timer_updated`: Estado atual do timer (`ends_at`, `remaining_seconds`, `is_running`).
10. `reaction_received`: Broadcast de emoji disparado por um usuário.
11. `pong`: Resposta do heartbeat.
