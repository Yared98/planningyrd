# PlanningYrd - Ecosystem & Analytics Specification

## 1. Yrd Agile Toolkit Switcher
- O componente `EcosystemSwitcher` permite alternar entre `RetroYrd`, `DailyYrd` e `PlanningYrd` com detecção de ambiente dev/prod.
- Integrado na barra de navegação superior (`Header.tsx`) e na página inicial (`LandingPage.tsx`).

## 2. Rodapé Padronizado
- Exibe o texto "Desenvolvido por Yared" com links para `https://yared.com.br/` e repositório GitHub `https://github.com/Yared98/planningyrd`.

## 3. Umami Analytics com Foco em Privacidade
- Rota backend `GET /api/config` alimenta as credenciais do script Umami.
- Força `data-auto-track="false"` e higienização para rotas `/` e `/room` (sem IDs ou tokens na telemetria).

## 4. Design System & Tema Unificado
- Utiliza tema escuro "Agile Cadence" com paleta Slate/Obsidian (`--bg-canvas: #090d16`, `--bg-surface: #0f172a`, `--bg-surface-elevated: #1e293b`, `--bg-card: rgba(30, 41, 59, 0.7)`).
- Tela inicial com iluminação atmosférica via background radial gradient (`--bg-canvas-radial: radial-gradient(circle at 50% 20%, #151d32 0%, var(--bg-canvas) 80%)`).
- Cartões com acabamento glassmorphism (`backdrop-filter: blur(20px)`, `border-radius: var(--radius-2xl)`).

## 5. Ambient Background Global & Histórico de Salas Recentes
- Background radial fixo no `body` (`background-attachment: fixed`), garantindo iluminação uniforme em todas as telas (Home e Mesa de Poker).
- Histórico de salas recentes com persistência em `localStorage` (`planningyrd_recent_rooms`), segregando "Salas que Facilitei" (com token de facilitador) e "Salas que Participei" (com papel de avaliador/espectador), com acesso direto, cópia de link e modal de remoção.

## 6. Padronização da Barra Superior e Controles na Landing Page
- A `LandingPage.tsx` incorpora a barra de controles completa no canto superior direito:
  - `EcosystemSwitcher`: navegação cruzada entre os 3 apps.
  - Alternador de Idioma (PT/EN) com ícone de globo e persistência via `i18next`.
  - Alternador de Tema Claro/Escuro com ícones Sol/Lua e persistência em `localStorage`.
  - Link com ícone SVG nativo para o repositório GitHub (`https://github.com/Yared98/planningyrd`).
- Mantém o padrão de layout com Hero banner externo ao card, card de 480px em glassmorphism com abas "Criar Sala" e "Entrar com Código", e histórico de salas recentes segregado.
