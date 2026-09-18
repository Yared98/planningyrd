# Change: Expansão do Background Atmosférico e Histórico de Salas Recentes

## Contexto
O background radial atmosférico foi expandido para todas as telas do PlanningYrd, e um sistema completo de histórico de salas recentes com distinção de papéis foi adicionado à tela inicial.

## Mudanças Realizadas
- `html, body, #root` em `index.css` configurado com `background: var(--bg-canvas-radial)` e `background-attachment: fixed`.
- `.app-container` ajustado para `background: transparent`.
- Criado o utilitário `recentRooms.ts` com tipagem e persistência em `localStorage` (`planningyrd_recent_rooms`).
- Tela inicial `LandingPage.tsx` atualizada com histórico dividido em "Salas que Facilitei" (preservando token de facilitador) e "Salas que Participei".
- Modal de confirmação para remoção de sala do histórico.
- Sincronização automática do título da sala ao carregar via WebSocket em `App.tsx`.
