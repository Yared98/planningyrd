# Spec: Voting Engine & Consensus Analytics

## Objetivo
Definir o mecanismo de votação cega, mascaramento de votos durante a rodada, baralhos suportados, revelação sincronizada e cálculo analítico de consenso.

## Requisitos

### 1. Baralhos Suportados
- **Fibonacci Clássico:** `["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"]`
- **Fibonacci Modificado:** `["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"]`
- **T-Shirt Sizes:** `["XS", "S", "M", "L", "XL", "XXL", "?"]`
- **Potências de 2:** `["1", "2", "4", "8", "16", "32", "64", "?"]`

### 2. Votação Cega e Mascaramento
- **Given** uma rodada de votação em andamento
- **When** um participante envia seu voto (`card_value`)
- **Then** o backend armazena o voto e transmite para a sala apenas o status mascarado `{ participant_id, has_voted: true }`.
- **And** nenhum cliente tem acesso ao valor do voto de terceiros antes da revelação formal, garantindo ausência de viés de ancoragem.

### 3. Revelação (Show Cards)
- **Given** que a rodada foi revelada pelo Facilitador (ou por regra de auto-revelação)
- **When** o evento `cards_revealed` é transmitido
- **Then** todos os votos reais são enviados acompanhados de seus autores e a mesa executa uma animação de flip 3D.

### 4. Estatísticas de Consenso
- **Média (Mean):** Calculada ignorando valores não numéricos (`?`, `☕`).
- **Mediana (Median):** Valor central ordenado das pontuações numéricas.
- **Moda (Mode):** O valor ou conjunto de valores mais frequentes.
- **Índice de Consenso:**
  - `100%`: Consenso unânime (todos os avaliadores votaram na mesma carta) -> Disparo de confetes!
  - `70% - 99%`: Alto consenso (maioria sólida).
  - `< 70%`: Divergência (destaca os participantes com menor e maior voto para justificar seus argumentos).
