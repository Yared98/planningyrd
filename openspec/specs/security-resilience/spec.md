# PlanningYrd - Security & Resilience Specification

## 1. Votação Cega e Proteção contra Vazamento de Cartas
- **Regra Estrita**: Enquanto `is_revealed` for falso, mensagens de broadcast (`RoomSnapshot`) devem enviar `card: None` para todos os participantes.
- **Unicast**: O snapshot com a própria carta do participante é transmitido estritamente pelo canal privado (unicast) na conexão do cliente.

## 2. Resiliência de Conexão com SQLite
- Acesso à conexão SQLite é protegido pelo helper `get_conn(&self)`, tratando `PoisonError` e recuperando a integridade caso uma thread anterior sofra pânico.

## 3. Limpeza de Memória e Gestão de Conexões
- **Remoção de Salas Vazias**: O método `remove_room_if_empty` remove a instância da sala do `DashMap` quando o último participante se desconecta.
- **Tolerância a Lag no Broadcast**: O consumidor de broadcast trata `RecvError::Lagged` com log de aviso sem interromper a conexão WebSocket.
