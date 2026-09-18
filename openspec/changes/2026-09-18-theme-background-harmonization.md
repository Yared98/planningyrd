# Change: Harmonização Visual do Tema e Background da Tela Inicial

## Contexto
O background radial atmosférico e a estilização dos containers da tela inicial do PlanningYrd foram formalizados como tokens de design reutilizáveis do ecossistema.

## Mudanças Realizadas
- Introduzida a variável CSS `--bg-canvas-radial` no tema escuro (`radial-gradient(circle at 50% 20%, #151d32 0%, var(--bg-canvas) 80%)`) e no tema claro (`radial-gradient(circle at 50% 20%, #e0e7ff 0%, var(--bg-canvas) 80%)`).
- Atualização do componente `LandingPage.tsx` para consumir `--bg-canvas-radial` de forma reativa ao tema.
- Sincronização dos padrões visuais de glassmorphism e iluminação com `RetroYrd` e `DailyYrd`.
