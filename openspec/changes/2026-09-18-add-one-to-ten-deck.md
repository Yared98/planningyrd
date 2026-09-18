# Change: Adição do Baralho Sequencial de 1 a 10 no PlanningYrd

- **Data**: 2026-09-18
- **Autor**: Antigravity AI Agent
- **Status**: Implementado & Validado
- **Repositório**: PlanningYrd

## Contexto & Motivação
Adicionar a opção de sistema de pontuação linear/sequencial de 1 a 10 (`["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "☕"]`) para equipes ágeis que preferem estimar tarefas em escala direta de esforço ou complexidade em vez de Fibonacci ou T-Shirt.

## Alterações Realizadas
1. **Backend (`models.rs`)**:
   - Adicionado `DeckType::OneToTen` à enum `DeckType`.
   - Implementado parsing em `from_str` aceitando `"one_to_ten"`, `"sequential"`, `"1-10"` e serialização com `"one_to_ten"`.
   - Adicionada lista de cartas padrão `["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "☕"]`.
2. **Frontend UI (`LandingPage.tsx` & `FacilitatorControls.tsx`)**:
   - Incluída a opção no dropdown de criação de sala em `LandingPage.tsx`.
   - Incluído botão para alternar para o baralho de 1 a 10 no menu flutuante do facilitador (`FacilitatorControls.tsx`).
3. **Internacionalização (i18n)**:
   - Adicionadas chaves `deckOneToTen` nos arquivos de tradução em Português e Inglês.
4. **OpenSpec**:
   - Atualizado `openspec/specs/voting-engine/spec.md` com a especificação do novo baralho.
