# Spec: Room Lifecycle & Access Control

## Objetivo
Definir a criação de salas, geração de links/códigos únicos, persistência do estado e gerenciamento de participantes e papéis (Facilitador, Avaliador e Espectador).

## Requisitos

### 1. Criação da Sala
- **Given** um usuário que acessa a página inicial do PlanningYrd
- **When** ele preenche o nome da sala e escolhe o baralho inicial (Fibonacci, Modificado, Camiseta, Potências de 2)
- **Then** o sistema gera uma sala única (ID ULID), armazena no SQLite e cria um token secreto de Facilitador.
- **And** o criador é automaticamente atribuído com o papel de Facilitador.

### 2. Entrada de Participantes (Lobby)
- **Given** um participante que acessa o link da sala (`/room/:id` ou código direto)
- **When** ele fornece um apelido (nome) e escolhe seu papel (`estimator` ou `spectator`)
- **Then** o sistema registra a presença em tempo real via WebSocket e transmite para todos os participantes na sala.
- **And** se o usuário possuir o token de Facilitador salvo para aquela sala, seu status de Facilitador é restaurado.

### 3. Modos de Participante
- **Avaliador (Estimator):** Recebe a mão de cartas para votar e seu assento é reservado ao redor da mesa com indicador de voto.
- **Espectador (Spectator):** Não recebe baralho para votar, não afeta o cálculo do quórum ou consenso, mas pode acompanhar a sessão, ver as histórias e interagir com reações.

### 4. Cronômetro da Sala (Timebox)
- **Given** o Facilitador que deseja limitar o tempo de discussão
- **When** ele inicia o cronômetro (ex: 60s, 120s, 180s, 300s)
- **Then** o estado do timer é transmitido em tempo real via WebSocket para todos os clientes com sincronização de fim (`ends_at`).
