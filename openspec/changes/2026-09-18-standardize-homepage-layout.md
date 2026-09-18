# Mudança: Controles de Barra Superior e Histórico na Landing Page do PlanningYrd

- **Data**: 2026-09-18
- **Autor**: Antigravity AI
- **Repositórios Impactados**: `planningyrd`, `retroyrd`, `dailyyrd`

## Contexto e Motivação
Para alinhar a experiência de usuário entre as três ferramentas do toolkit ágil, a `LandingPage` do `PlanningYrd` recebeu a barra de controles completa de topo (posicionada no canto superior direito), servindo como padrão de referência unificado:
1. `EcosystemSwitcher` para saltar entre `planningyrd`, `retroyrd` e `dailyyrd`.
2. Alternador de idioma PT/EN via `i18next`.
3. Alternador de tema Claro/Escuro sincronizado via props com a raiz do aplicativo e persistido no `localStorage`.
4. Link direto com ícone SVG padronizado para o repositório GitHub do `planningyrd`.
5. Histórico recente segregado por "Salas que Facilitei" e "Salas que Participei".
