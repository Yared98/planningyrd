# Spec: Stories Backlog & Session Export

## Objetivo
Definir a gestão de histórias/tarefas a serem estimadas durante a sessão de Planning Poker e a exportação dos resultados finais.

## Requisitos

### 1. Gestão de Histórias
- Cada história possui: `id`, `room_id`, `title`, `description`, `order_index`, `final_score`, `status` (`pending`, `active`, `estimated`, `skipped`).
- O Facilitador pode adicionar histórias individualmente ou importar uma lista.
- Uma história por vez é definida como `active` (em discussão e estimativa).
- Histórias podem ser reordenadas ou puladas se necessário.

### 2. Confirmação do Valor de Estimativa
- **Given** uma história ativa com cartas reveladas
- **When** o Facilitador seleciona ou digita o valor final acordado (ex: "5 story points") e confirma
- **Then** a história é marcada como `estimated` com o `final_score` persistido no SQLite.
- **And** a próxima história pendente no backlog pode ser ativada automaticamente com limpeza da rodada de votos.

### 3. Exportação da Sessão
- O usuário pode exportar o resumo da sessão a qualquer momento nos seguintes formatos:
  - **Markdown:** Tabela formatada contendo Histórias, Pontuação Final, e sumário da rodada.
  - **CSV:** Dados tabulares para importação direta em ferramentas como Excel/Google Sheets.
  - **JSON:** Objeto estruturado com todos os metadados para automações ou integrações com Jira/Linear.
