mod admin;
mod db;
mod mcp;
mod models;
mod state;
mod ws;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;
use tracing::info;
use ulid::Ulid;

use crate::db::Database;
use crate::models::{Room, RoomPublic, RoomStatus, Story};
use crate::state::AppState;
use crate::ws::ws_handler;

#[derive(Debug, Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
    pub deck_type: Option<String>,
    pub custom_deck: Option<Vec<String>>,
    pub auto_reveal: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct CreateRoomResponse {
    pub id: String,
    pub name: String,
    pub deck_type: String,
    pub facilitator_token: String,
}

#[derive(Debug, Serialize)]
pub struct RoomDetailResponse {
    pub room: RoomPublic,
    pub stories: Vec<Story>,
    pub current_story: Option<Story>,
}

#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>, // "markdown", "csv", "json"
}

#[derive(Debug, Serialize)]
pub struct ClientConfigResponse {
    pub umami_script_url: Option<String>,
    pub umami_website_id: Option<String>,
}

async fn client_config_handler() -> Json<ClientConfigResponse> {
    Json(ClientConfigResponse {
        umami_script_url: std::env::var("UMAMI_SCRIPT_URL").ok().filter(|s| !s.trim().is_empty()),
        umami_website_id: std::env::var("UMAMI_WEBSITE_ID").ok().filter(|s| !s.trim().is_empty()),
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .init();

    // Compatibilidade com DATABASE_URL (padrão da suíte) e DATABASE_PATH legada
    let db_path = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_PATH"))
        .unwrap_or_else(|_| {
            if std::path::Path::new("planningyrd.db").exists() {
                "planningyrd.db".to_string()
            } else {
                std::fs::create_dir_all("data").ok();
                "data/planning.db".to_string()
            }
        });

    if let Some(parent) = std::path::Path::new(&db_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).ok();
        }
    }

    let db = Database::new(&db_path).expect("Failed to initialize SQLite database");
    let state = AppState::new(db);

    // Inicializa o token de admin (se não definido no .env, gera aleatório e exibe no console)
    admin::get_or_init_admin_token("PlanningYrd");

    // Rotina periódica de auto-purge para higienização de salas antigas (Padrão: 60 dias)
    // Aceita RETENTION_DAYS unificada ou ROOM_RETENTION_DAYS específica
    let retention_days: i64 = std::env::var("RETENTION_DAYS")
        .or_else(|_| std::env::var("ROOM_RETENTION_DAYS"))
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60);

    let cleanup_state = state.clone();
    tokio::spawn(async move {
        // Checar na inicialização e a cada 24 horas
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(24 * 3600));
        loop {
            interval.tick().await;
            match cleanup_state.db.cleanup_expired_rooms(retention_days) {
                Ok(count) if count > 0 => {
                    tracing::info!(
                        purged_rooms = count,
                        retention_days = retention_days,
                        "Auto-purge: salas com mais de {} dias removidas com sucesso",
                        retention_days
                    );
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::warn!(error = %e, "Erro ao executar rotina de auto-purge de salas no PlanningYrd");
                }
            }
        }
    });

    let cors = CorsLayer::permissive();

    let api_routes = Router::new()
        .route("/config", get(client_config_handler))
        .route("/rooms", post(create_room_handler))
        .route("/rooms/{id}", get(get_room_handler))
        .route("/rooms/{id}/export", get(export_room_handler));

    let mut app = Router::new()
        .route("/health", get(health_check))
        .nest("/api", api_routes)
        .nest("/api/admin", admin::admin_routes())
        .route("/mcp", post(mcp::handle_mcp_request))
        .route("/robots.txt", get(robots_txt_handler))
        .route("/ws/rooms/{id}", get(ws_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Serve frontend build if frontend/dist exists
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "frontend/dist".to_string());
    let mut dist_path = PathBuf::from(&static_dir);
    if !dist_path.exists() {
        dist_path = PathBuf::from("../frontend/dist");
    }

    if dist_path.exists() {
        info!("Serving static frontend files from {:?}", dist_path);
        let serve_dir = ServeDir::new(&dist_path)
            .not_found_service(ServeFile::new(dist_path.join("index.html")));
        app = app.fallback_service(serve_dir);
    }

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("🚀 PlanningYrd backend rodando em http://{}", addr);
    info!("🔗 WebSocket disponível em ws://{}/ws/rooms/{{id}}", addr);
    info!("🤖 Servidor MCP disponível em http://{}/mcp", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP listener");

    axum::serve(listener, app)
        .await
        .expect("Axum server crashed");
}

async fn health_check() -> &'static str {
    "OK"
}

async fn robots_txt_handler() -> impl IntoResponse {
    (
        [(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "User-agent: *\nDisallow: /\n",
    )
}

async fn create_room_handler(
    State(state): State<AppState>,
    Json(req): Json<CreateRoomRequest>,
) -> Result<Json<CreateRoomResponse>, (StatusCode, String)> {
    let name = req.name.trim();
    if name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Nome da sala não pode ser vazio".to_string(),
        ));
    }
    if name.chars().count() > 100 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Nome da sala deve ter no máximo 100 caracteres".to_string(),
        ));
    }

    if let Some(ref cards) = req.custom_deck {
        if cards.len() > 50 {
            return Err((
                StatusCode::BAD_REQUEST,
                "Baralho personalizado pode ter no máximo 50 cartas".to_string(),
            ));
        }
        for card in cards {
            if card.trim().is_empty() || card.chars().count() > 20 {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "Cada carta deve ter entre 1 e 20 caracteres".to_string(),
                ));
            }
        }
    }

    let id = Ulid::new().to_string();
    let facilitator_token = Ulid::new().to_string();

    let deck = req.deck_type.unwrap_or_else(|| "fibonacci".to_string());
    let custom_json = req
        .custom_deck
        .and_then(|cards| serde_json::to_string(&cards).ok());

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let room = Room {
        id: id.clone(),
        name: name.to_string(),
        deck_type: deck.clone(),
        custom_deck: custom_json,
        facilitator_token: facilitator_token.clone(),
        status: RoomStatus::Voting,
        auto_reveal: req.auto_reveal.unwrap_or(false),
        show_average: true,
        current_story_id: None,
        timer_seconds_remaining: 0,
        timer_is_running: false,
        timer_ends_at: None,
        created_at: now,
    };

    if let Err(e) = state.db.create_room(&room) {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao criar sala: {:?}", e),
        ));
    }

    Ok(Json(CreateRoomResponse {
        id,
        name: name.to_string(),
        deck_type: deck,
        facilitator_token,
    }))
}

async fn get_room_handler(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<RoomDetailResponse>, (StatusCode, String)> {
    let room = state
        .db
        .get_room(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Sala não encontrada".to_string()))?;

    let stories = state
        .db
        .get_stories(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let current_story = if let Some(ref s_id) = room.current_story_id {
        stories.iter().find(|s| s.id == *s_id).cloned()
    } else {
        stories.first().cloned()
    };

    Ok(Json(RoomDetailResponse {
        room: room.into(),
        stories,
        current_story,
    }))
}

async fn export_room_handler(
    Path(id): Path<String>,
    Query(q): Query<ExportQuery>,
    State(state): State<AppState>,
) -> Result<Response, (StatusCode, String)> {
    let room = state
        .db
        .get_room(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Sala não encontrada".to_string()))?;

    let stories = state
        .db
        .get_stories(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let format = q.format.unwrap_or_else(|| "markdown".to_string());

    match format.to_lowercase().as_str() {
        "csv" => {
            let mut csv = String::from("id,title,description,status,final_score\n");
            for s in stories {
                csv.push_str(&format!(
                    "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                    s.id,
                    s.title.replace('"', "\"\""),
                    s.description.replace('"', "\"\""),
                    s.status.to_str(),
                    s.final_score.unwrap_or_default()
                ));
            }
            Ok((
                [
                    ("content-type", "text/csv; charset=utf-8"),
                    (
                        "content-disposition",
                        &format!("attachment; filename=\"planning_{}.csv\"", room.id),
                    ),
                ],
                csv,
            )
                .into_response())
        }
        "json" => {
            let json_body = serde_json::json!({
                "room": RoomPublic::from(room),
                "stories": stories
            });
            Ok(Json(json_body).into_response())
        }
        _ => {
            // Markdown default
            let mut md = format!("# Planning Poker - {}\n\n", room.name);
            md.push_str(&format!("**ID da Sala:** `{}`  \n", room.id));
            md.push_str(&format!("**Baralho:** {}  \n\n", room.deck_type));
            md.push_str("## Histórias Estimadas\n\n");
            md.push_str("| # | Título | Pontuação Final | Status |\n");
            md.push_str("|---|---|---|---|\n");

            for (idx, s) in stories.iter().enumerate() {
                md.push_str(&format!(
                    "| {} | {} | **{}** | {} |\n",
                    idx + 1,
                    s.title,
                    s.final_score.as_deref().unwrap_or("-"),
                    s.status.to_str()
                ));
            }

            md.push_str("\n---\n*Gerado por PlanningYrd (Agile Cadence)*\n");

            Ok((
                [("content-type", "text/markdown; charset=utf-8")],
                md,
            )
                .into_response())
        }
    }
}
