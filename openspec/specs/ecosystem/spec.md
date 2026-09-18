# PlanningYrd - Ecosystem & Analytics Specification

## 1. Yrd Agile Toolkit Switcher
- O componente `EcosystemSwitcher` permite alternar entre `RetroYrd`, `DailyYrd` e `PlanningYrd` com detecção de ambiente dev/prod.
- Integrado na barra de navegação superior (`Header.tsx`) e na página inicial (`LandingPage.tsx`).

## 2. Rodapé Padronizado
- Exibe o texto "Desenvolvido por Yared" com links para `https://yared.com.br/` e repositório GitHub `https://github.com/Yared98/planningyrd`.

## 3. Umami Analytics com Foco em Privacidade
- Rota backend `GET /api/config` alimenta as credenciais do script Umami.
- Força `data-auto-track="false"` e higienização para rotas `/` e `/room` (sem IDs ou tokens na telemetria).
