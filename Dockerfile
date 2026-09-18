# ==============================================================================
# Stage 1: Build Frontend (React + Vite)
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Build Backend (Rust + Axum)
# ==============================================================================
FROM rust:1.80-alpine AS backend-builder
RUN apk add --no-cache musl-dev sqlite-dev build-base

WORKDIR /app/backend
COPY backend/Cargo.toml backend/Cargo.lock* ./
# Cache de dependencias criando dummy main
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY backend/src ./src
RUN touch src/main.rs && cargo build --release

# ==============================================================================
# Stage 3: Minimal Runtime
# ==============================================================================
FROM alpine:3.20 AS runner
RUN apk add --no-cache ca-certificates libgcc

WORKDIR /app

# Criar diretorio para banco SQLite persistente
RUN mkdir -p /app/data

# Copiar artefatos compilados
COPY --from=backend-builder /app/backend/target/release/backend /app/planning-backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV PORT=3000
ENV DATABASE_PATH=/app/data/planningyrd.db
ENV RUST_LOG=info,tower_http=info

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["/app/planning-backend"]
