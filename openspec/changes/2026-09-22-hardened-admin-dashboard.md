# Painel Administrativo com Hardening Criptográfico e Observabilidade (PlanningYrd)

## Contexto
Para fornecer observabilidade sobre o volume de salas, taxa de uso e manutenção da integridade do banco de dados SQLite sem comprometer a privacidade das equipes, foi implementado um console administrativo protegido (`/admin` no frontend e `/api/admin/*` no backend).

## Mudanças Realizadas

1. **Módulo de Administração Backend (`backend/src/admin.rs`)**:
   - **Hardening Criptográfico:** Validação de token secreto (`ADMIN_TOKEN`) utilizando comparação em tempo constante (`constant_time_eq`) para prevenção contra *timing attacks*.
   - **Rate Limiting Anti-Força-Bruta:** Rastreamento em memória por IP (`DashMap<String, (u32, Instant)>`) que bloqueia o acesso após 5 tentativas incorretas em uma janela de 15 minutos (retornando HTTP 429).
   - **Cookies de Sessão Seguros:** Emissão de cookies `HttpOnly; SameSite=Strict` com TTL de 2 horas após login bem-sucedido.
   - **Suporte Híbrido:** Suporte tanto a cookies de sessão quanto a cabeçalhos `Authorization: Bearer <ADMIN_TOKEN>` para automações.
   - **Endpoints Administrativos:**
     - `POST /api/admin/login`: Autenticação e emissão de cookie.
     - `POST /api/admin/logout`: Encerramento da sessão.
     - `GET /api/admin/verify`: Verificação do status de autenticação.
     - `GET /api/admin/metrics`: Estatísticas agregadas (salas totais, salas ativas 30d, salas em memória, histórias, votos, tamanho em bytes do banco SQLite) e listagem das últimas 50 salas.
     - `POST /api/admin/purge`: Disparo manual da rotina de retenção e expurgo de salas.
     - `DELETE /api/admin/rooms/:id`: Exclusão manual pontual de salas em cascata.

2. **Interface do Painel Administrativo (`frontend/src/components/AdminDashboard.tsx`)**:
   - **Tela de Bloqueio Elegante (Lock Screen):** Campo de token com alternador de visibilidade, validação e feedback de rate limit.
   - **Cards de Métricas de Alto Nível (KPIs):** Total de salas, ativas no mês, sessões ativas com WebSocket em memória, histórias/votos e tamanho físico do arquivo SQLite.
   - **Tabela de Salas Recentes:** IDs de salas com cópia rápida em 1 clique, nomes, baralhos, status e botão de exclusão manual.
   - **Ação de Purge Manual:** Gatilho operacional para acionar o ciclo de expurgo com aviso de confirmação.

3. **Governança & Privacidade**:
   - Total respeito aos princípios de privacidade do `AGENTS.md`: nenhum voto individual anônimo, anotação privada ou token de facilitador é revelado no painel.
   - Proteção de indexação já coberta via `robots.txt` (`Disallow: /`).
