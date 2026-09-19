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
3. **Responsividade & Estilos Compartilhados**:
   - Padronizado `.brand-icon-box` com gradiente de destaque e brilho (32x32px).
   - Adicionadas regras para `@media (max-width: 768px)` mantendo consistência e evitando quebras de layout.
