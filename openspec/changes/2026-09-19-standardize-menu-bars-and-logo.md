# Padronização de Menu Bars e Navegação via Logo no PlanningYrd

## Contexto
No PlanningYrd, o logo no cabeçalho durante a sessão (`Header.tsx`) era uma `div` estática, não permitindo retorno à tela inicial. Além disso, na página inicial (`LandingPage.tsx`), os controles ficavam flutuando de forma absoluta no canto superior sem uma barra de navegação padronizada.

## Mudanças Realizadas
1. **Logo Clicável com Retorno à Home**:
   - Atualizado o elemento da marca em `Header.tsx` para `<a href="/" className="brand-logo">` com handler de clique executando `onLeaveRoom()`, limpando o estado e retornando à tela inicial.
   - Adicionada classe `.brand-title` com suporte a hover e transições suaves.
2. **Menu Bar Padronizado na Página Inicial (`LandingPage.tsx`)**:
   - Substituídos os controles flutuantes absolutos por `<header className="app-header">`.
   - À esquerda: Logo clicável direcionando a `/` e `EcosystemSwitcher`.
   - À direita: Botão MCP, seletor de idiomas (PT/EN), alternador de tema e link GitHub.
4. **Arquitetura Unificada de 2 Níveis (Tier 1 & Tier 2)**:
   - Nível 1 (`.app-header`): Marca `PlanningYrd` clicável para `/`, `EcosystemSwitcher`, código da sala com cópia rápida e utilitários à direita (Avatar, Convidar, MCP, Idioma, Tema, Sair).
   - Nível 2 (`.session-sub-header`): Barra de fluxo da sessão com história ativa em discussão, timer, reações rápidas, botão do backlog e exportação.
   - Ocultação responsiva de rótulos de texto (`.header-btn-text` e `.ecosystem-switcher-label`) em telas `< 768px`.
5. **Correção de Sobreposição dos Controles do Facilitador**:
   - Removido o posicionamento fixo (`position: fixed; bottom: 120px`) do `FacilitatorControls.tsx` que cobria as cartas de estimativa (34, 55, 89, ?, ☕).
   - O dock de ações do facilitador agora flui naturalmente no topo da mesa de votação, prevenindo qualquer obstrução dos votos da equipe.
