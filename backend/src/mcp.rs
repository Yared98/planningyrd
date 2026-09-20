use axum::{
    extract::State,
    http::HeaderMap,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::info;
use ulid::Ulid;

use crate::{
    models::{Participant, RoomStatus, ServerMessage, Story, StoryStatus},
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct JsonRpcRequest {
    #[allow(dead_code)]
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

fn extract_facilitator_token(headers: &HeaderMap, args: &Value) -> Option<String> {
    if let Some(arg_token) = args.get("facilitator_token").and_then(|t| t.as_str()) {
        if !arg_token.trim().is_empty() {
            return Some(arg_token.trim().to_string());
        }
    }
    if let Some(auth) = headers.get("authorization").and_then(|h| h.to_str().ok()) {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            return Some(token.trim().to_string());
        }
        return Some(auth.trim().to_string());
    }
    if let Some(token) = headers.get("x-facilitator-token").and_then(|h| h.to_str().ok()) {
        return Some(token.trim().to_string());
    }
    None
}

pub async fn handle_mcp_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<JsonRpcRequest>,
) -> impl IntoResponse {
    let id = req.id.clone();
    let result = match req.method.as_str() {
        "initialize" => Ok(json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": { "subscribe": false, "listChanged": true },
                "tools": { "listChanged": true }
            },
            "serverInfo": {
                "name": "planningyrd-mcp",
                "version": "1.0.0"
            }
        })),

        "resources/list" => {
            Ok(json!({
                "resources": [
                    {
                        "uri": "planning://room/{room_id}/backlog",
                        "name": "Planning Room Backlog",
                        "description": "Full structured list of stories, estimates, statuses and current active story for a planning poker room.",
                        "mimeType": "application/json"
                    },
                    {
                        "uri": "planning://room/{room_id}/consensus",
                        "name": "Planning Room Consensus & Votes",
                        "description": "Current voting statistics, agreement percentage, mode, average and vote breakdown. Votes are masked during active voting unless authorized as facilitator.",
                        "mimeType": "application/json"
                    }
                ]
            }))
        }

        "resources/read" => {
            let uri = req.params.as_ref()
                .and_then(|p| p.get("uri"))
                .and_then(|u| u.as_str())
                .unwrap_or("");
            read_resource(&state, &headers, uri).await
        }

        "tools/list" => {
            Ok(json!({
                "tools": [
                    {
                        "name": "planning_import_stories",
                        "description": "Imports a batch of stories into the room backlog. Requer token de Facilitador.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "room_id": { "type": "string", "description": "The ULID or identifier of the planning room" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (optional if provided via Authorization header)" },
                                "stories": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "title": { "type": "string", "description": "Title of the story/ticket (max 150 chars)" },
                                            "description": { "type": "string", "description": "Description or acceptance criteria (optional, max 2000 chars)" }
                                        },
                                        "required": ["title"]
                                    },
                                    "description": "List of stories to populate into the backlog"
                                }
                            },
                            "required": ["room_id", "stories"]
                        }
                    },
                    {
                        "name": "planning_add_story",
                        "description": "Adds a single user story or task to the room backlog with real-time broadcast.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "room_id": { "type": "string", "description": "The ULID of the planning room" },
                                "title": { "type": "string", "description": "Title of the story (max 150 chars)" },
                                "description": { "type": "string", "description": "Optional description (max 2000 chars)" }
                            },
                            "required": ["room_id", "title"]
                        }
                    },
                    {
                        "name": "planning_select_story",
                        "description": "Sets the active story being estimated and resets the voting round for all participants. Requer token de Facilitador.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "room_id": { "type": "string", "description": "The ULID of the planning room" },
                                "story_id": { "type": "string", "description": "ID of the story to select as active" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (optional if provided via Authorization header)" }
                            },
                            "required": ["room_id", "story_id"]
                        }
                    },
                    {
                        "name": "planning_save_estimate",
                        "description": "Records the consensus final score for a story and advances the backlog to the next pending story. Requer token de Facilitador.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "room_id": { "type": "string", "description": "The ULID of the planning room" },
                                "story_id": { "type": "string", "description": "ID of the estimated story" },
                                "score": { "type": "string", "description": "Final story points / estimate value (e.g., '5', '8', 'M', '☕')" },
                                "facilitator_token": { "type": "string", "description": "Facilitator token (optional if provided via Authorization header)" }
                            },
                            "required": ["room_id", "story_id", "score"]
                        }
                    },
                    {
                        "name": "planning_get_room_state",
                        "description": "Fetches the full public snapshot of a planning room, including participants, stories, current story, and room status.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "room_id": { "type": "string", "description": "The ULID of the planning room" }
                            },
                            "required": ["room_id"]
                        }
                    }
                ]
            }))
        }

        "tools/call" => {
            let params = req.params.as_ref().unwrap_or(&Value::Null);
            let tool_name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

            call_tool(&state, &headers, tool_name, arguments).await
        }

        unknown => Err(JsonRpcError {
            code: -32601,
            message: format!("Method '{}' not found", unknown),
            data: None,
        }),
    };

    let resp = match result {
        Ok(val) => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(val),
            error: None,
        },
        Err(err) => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(err),
        },
    };

    Json(resp)
}

async fn read_resource(state: &AppState, headers: &HeaderMap, uri: &str) -> Result<Value, JsonRpcError> {
    if let Some(room_part) = uri.strip_prefix("planning://room/") {
        let (path_part, query_part) = match room_part.split_once('?') {
            Some((p, q)) => (p, Some(q)),
            None => (room_part, None),
        };

        if let Some(room_id) = path_part.strip_suffix("/backlog") {
            let room = state.db.get_room(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("Database error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Room '{}' not found", room_id),
                data: None,
            })?;

            let stories = state.db.get_stories(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("Failed to read stories: {}", e),
                data: None,
            })?;

            return Ok(json!({
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": serde_json::to_string_pretty(&json!({
                        "room_id": room.id,
                        "room_name": room.name,
                        "deck_type": room.deck_type,
                        "status": room.status.to_str(),
                        "current_story_id": room.current_story_id,
                        "stories_count": stories.len(),
                        "stories": stories
                    })).unwrap()
                }]
            }));
        }

        if let Some(room_id) = path_part.strip_suffix("/consensus") {
            let room = state.db.get_room(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("Database error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Room '{}' not found", room_id),
                data: None,
            })?;

            let query_token = query_part.and_then(|q| {
                q.split('&').find_map(|pair| {
                    let mut split = pair.split('=');
                    let key = split.next()?;
                    let val = split.next()?;
                    if key == "token" || key == "facilitator_token" {
                        Some(val.to_string())
                    } else {
                        None
                    }
                })
            });

            let is_facilitator = query_token
                .or_else(|| extract_facilitator_token(headers, &json!({})))
                .map(|t| t == room.facilitator_token)
                .unwrap_or(false);

            let votes = state.db.get_votes(room_id, room.current_story_id.as_deref()).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("Failed to get votes: {}", e),
                data: None,
            })?;

            let content_val = if room.status == RoomStatus::Voting && !is_facilitator {
                json!({
                    "room_id": room.id,
                    "current_story_id": room.current_story_id,
                    "status": room.status.to_str(),
                    "votes_count": votes.len(),
                    "message": "Votes are hidden until cards are revealed by the facilitator."
                })
            } else {
                let stats = crate::db::Database::calculate_consensus(&votes);
                json!({
                    "room_id": room.id,
                    "current_story_id": room.current_story_id,
                    "status": room.status.to_str(),
                    "stats": stats,
                    "votes_count": votes.len()
                })
            };

            return Ok(json!({
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": serde_json::to_string_pretty(&content_val).unwrap()
                }]
            }));
        }
    }

    Err(JsonRpcError {
        code: -32002,
        message: format!("Invalid or unsupported URI: '{}'", uri),
        data: None,
    })
}

async fn call_tool(
    state: &AppState,
    headers: &HeaderMap,
    name: &str,
    args: Value,
) -> Result<Value, JsonRpcError> {
    match name {
        "planning_import_stories" => {
            let room_id = args.get("room_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'room_id' argument".to_string(),
                data: None,
            })?;

            let room = state.db.get_room(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("DB error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Room '{}' not found", room_id),
                data: None,
            })?;

            let provided_token = extract_facilitator_token(headers, &args);
            if provided_token.as_deref() != Some(&room.facilitator_token) {
                return Err(JsonRpcError {
                    code: -32003,
                    message: "Unauthorized: facilitator_token required to import stories into room".to_string(),
                    data: None,
                });
            }

            let stories_val = args.get("stories").and_then(|v| v.as_array()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'stories' array argument".to_string(),
                data: None,
            })?;

            let existing_stories = state.db.get_stories(room_id).unwrap_or_default();
            let mut imported_count = 0;
            let mut first_new_story_id: Option<String> = None;

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            for (idx, item) in stories_val.iter().enumerate() {
                let raw_title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").trim();
                if raw_title.is_empty() {
                    continue;
                }
                let title: String = raw_title.chars().take(150).collect();
                let description = item.get("description")
                    .and_then(|v| v.as_str())
                    .map(|d| d.chars().take(2000).collect::<String>())
                    .unwrap_or_default();

                let story_id = Ulid::new().to_string();
                if first_new_story_id.is_none() {
                    first_new_story_id = Some(story_id.clone());
                }

                let order_index = (existing_stories.len() + idx) as i64;
                let status = if existing_stories.is_empty() && idx == 0 && room.current_story_id.is_none() {
                    StoryStatus::Active
                } else {
                    StoryStatus::Pending
                };

                let story = Story {
                    id: story_id,
                    room_id: room_id.to_string(),
                    title,
                    description,
                    order_index,
                    final_score: None,
                    status,
                    created_at: now + idx as i64,
                    estimated_at: None,
                };

                if state.db.add_story(&story).is_ok() {
                    imported_count += 1;
                }
            }

            // If room had no current story, set the first newly added story as active
            let mut current_story_id = room.current_story_id;
            if current_story_id.is_none() {
                if let Some(ref s_id) = first_new_story_id {
                    let _ = state.db.update_room_current_story(room_id, Some(s_id));
                    current_story_id = Some(s_id.clone());
                }
            }

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();

            // Broadcast backlog update to all connected WebSocket clients
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories.clone(),
                    current_story_id: current_story_id.clone(),
                },
            );

            info!(room_id = %room_id, count = imported_count, "Imported stories via MCP tool");

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Successfully imported {} stories into room '{}'. Total backlog count: {}.", imported_count, room_id, updated_stories.len())
                }],
                "imported_count": imported_count,
                "current_story_id": current_story_id
            }))
        }

        "planning_add_story" => {
            let room_id = args.get("room_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'room_id' argument".to_string(),
                data: None,
            })?;

            let raw_title = args.get("title").and_then(|v| v.as_str()).unwrap_or("").trim();
            if raw_title.is_empty() {
                return Err(JsonRpcError {
                    code: -32602,
                    message: "Story title cannot be empty".to_string(),
                    data: None,
                });
            }
            let title: String = raw_title.chars().take(150).collect();
            let description = args.get("description")
                .and_then(|v| v.as_str())
                .map(|d| d.chars().take(2000).collect::<String>())
                .unwrap_or_default();

            let stories = state.db.get_stories(room_id).unwrap_or_default();
            let next_index = stories.len() as i64;
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            let story = Story {
                id: Ulid::new().to_string(),
                room_id: room_id.to_string(),
                title: title.clone(),
                description,
                order_index: next_index,
                final_score: None,
                status: if stories.is_empty() {
                    StoryStatus::Active
                } else {
                    StoryStatus::Pending
                },
                created_at: now,
                estimated_at: None,
            };

            state.db.add_story(&story).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("Failed to insert story: {}", e),
                data: None,
            })?;

            let current_story_id = if stories.is_empty() {
                let _ = state.db.update_room_current_story(room_id, Some(&story.id));
                Some(story.id.clone())
            } else {
                state.db.get_room(room_id).ok().flatten().and_then(|r| r.current_story_id)
            };

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories,
                    current_story_id: current_story_id.clone(),
                },
            );

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Story '{}' created successfully with ID '{}'.", title, story.id)
                }],
                "story_id": story.id,
                "current_story_id": current_story_id
            }))
        }

        "planning_select_story" => {
            let room_id = args.get("room_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'room_id' argument".to_string(),
                data: None,
            })?;

            let room = state.db.get_room(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("DB error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Room '{}' not found", room_id),
                data: None,
            })?;

            let provided_token = extract_facilitator_token(headers, &args);
            if provided_token.as_deref() != Some(&room.facilitator_token) {
                return Err(JsonRpcError {
                    code: -32003,
                    message: "Unauthorized: facilitator_token required to select active story".to_string(),
                    data: None,
                });
            }

            let story_id = args.get("story_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'story_id' argument".to_string(),
                data: None,
            })?;

            let _ = state.db.update_room_current_story(room_id, Some(story_id));
            let _ = state.db.update_room_status(room_id, RoomStatus::Voting);
            let _ = state.db.clear_votes(room_id, Some(story_id));

            if let Some(session) = state.rooms.get(room_id) {
                for mut p in session.participants.iter_mut() {
                    p.has_voted = false;
                    p.card = None;
                }
            }

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories,
                    current_story_id: Some(story_id.to_string()),
                },
            );
            state.broadcast_to_room(room_id, ServerMessage::RoundReset);

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Story '{}' selected as active in room '{}'. Voting round reset.", story_id, room_id)
                }],
                "active_story_id": story_id
            }))
        }

        "planning_save_estimate" => {
            let room_id = args.get("room_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'room_id' argument".to_string(),
                data: None,
            })?;

            let room = state.db.get_room(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("DB error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Room '{}' not found", room_id),
                data: None,
            })?;

            let provided_token = extract_facilitator_token(headers, &args);
            if provided_token.as_deref() != Some(&room.facilitator_token) {
                return Err(JsonRpcError {
                    code: -32003,
                    message: "Unauthorized: facilitator_token required to record estimate".to_string(),
                    data: None,
                });
            }

            let story_id = args.get("story_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'story_id' argument".to_string(),
                data: None,
            })?;

            let raw_score = args.get("score").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'score' argument".to_string(),
                data: None,
            })?;
            let score: String = raw_score.chars().take(20).collect();

            let _ = state.db.update_story_score(story_id, &score);

            let stories = state.db.get_stories(room_id).unwrap_or_default();
            let next_pending = stories
                .iter()
                .find(|s| s.status == StoryStatus::Pending && s.id != story_id);
            let next_story_id = next_pending.map(|s| s.id.clone());

            let _ = state.db.update_room_current_story(room_id, next_story_id.as_deref());
            let _ = state.db.update_room_status(room_id, RoomStatus::Voting);
            let _ = state.db.clear_votes(room_id, next_story_id.as_deref());

            if let Some(session) = state.rooms.get(room_id) {
                for mut p in session.participants.iter_mut() {
                    p.has_voted = false;
                    p.card = None;
                }
            }

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories,
                    current_story_id: next_story_id.clone(),
                },
            );
            state.broadcast_to_room(room_id, ServerMessage::RoundReset);

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Story '{}' scored with '{}'. Next active story: {:?}.", story_id, score, next_story_id)
                }],
                "story_id": story_id,
                "score": score,
                "next_story_id": next_story_id
            }))
        }

        "planning_get_room_state" => {
            let room_id = args.get("room_id").and_then(|v| v.as_str()).ok_or_else(|| JsonRpcError {
                code: -32602,
                message: "Missing 'room_id' argument".to_string(),
                data: None,
            })?;

            let room = state.db.get_room(room_id).map_err(|e| JsonRpcError {
                code: -32603,
                message: format!("DB error: {}", e),
                data: None,
            })?.ok_or_else(|| JsonRpcError {
                code: -32004,
                message: format!("Room '{}' not found", room_id),
                data: None,
            })?;

            let stories = state.db.get_stories(room_id).unwrap_or_default();
            let current_story = room.current_story_id.as_deref()
                .and_then(|id| stories.iter().find(|s| s.id == id).cloned());

            let participants: Vec<Participant> = state.rooms.get(room_id)
                .map(|session| session.participants.iter().map(|p| p.value().clone()).collect())
                .unwrap_or_default();

            let votes = state.db.get_votes(room_id, room.current_story_id.as_deref()).unwrap_or_default();
            let stats = if room.status == RoomStatus::Revealed {
                Some(crate::db::Database::calculate_consensus(&votes))
            } else {
                None
            };

            let cards = crate::models::DeckType::from_str(&room.deck_type).default_cards();

            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": serde_json::to_string_pretty(&json!({
                        "room": room,
                        "stories": stories,
                        "current_story": current_story,
                        "participants": participants,
                        "cards": cards,
                        "stats": stats,
                        "votes_count": votes.len()
                    })).unwrap()
                }]
            }))
        }

        unknown => Err(JsonRpcError {
            code: -32601,
            message: format!("Tool '{}' not found", unknown),
            data: None,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::models::{Room, RoomStatus};

    fn setup_test_state() -> AppState {
        let db = Database::new(":memory:").unwrap();
        AppState::new(db)
    }

    #[tokio::test]
    async fn test_mcp_initialize() {
        let state = setup_test_state();
        let req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: Some(json!(1)),
            method: "initialize".to_string(),
            params: None,
        };

        let _resp = handle_mcp_request(State(state), HeaderMap::new(), Json(req)).await;
    }

    #[tokio::test]
    async fn test_mcp_import_stories_and_read_backlog() {
        let state = setup_test_state();
        let room_id = "test_mcp_room";
        let facilitator_token = "token_mcp";

        let room = Room {
            id: room_id.to_string(),
            name: "Sprint 42 Planning".to_string(),
            deck_type: "fibonacci".to_string(),
            custom_deck: None,
            facilitator_token: facilitator_token.to_string(),
            status: RoomStatus::Voting,
            auto_reveal: false,
            show_average: true,
            current_story_id: None,
            timer_seconds_remaining: 0,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };
        state.db.create_room(&room).unwrap();

        // 1. Call tool planning_import_stories without token -> should fail
        let mut headers = HeaderMap::new();
        let unauth_args = json!({
            "room_id": room_id,
            "stories": [
                {
                    "title": "Unauthorized Story"
                }
            ]
        });
        let unauth_res = call_tool(&state, &headers, "planning_import_stories", unauth_args).await;
        assert!(unauth_res.is_err());
        assert_eq!(unauth_res.unwrap_err().code, -32003);

        // 2. Call tool planning_import_stories with header Authorization
        headers.insert("authorization", "Bearer token_mcp".parse().unwrap());
        let import_args = json!({
            "room_id": room_id,
            "stories": [
                {
                    "title": "Auth: Implement OAuth2 Login",
                    "description": "Support GitHub and Google providers"
                },
                {
                    "title": "Database: Migrate to WAL Mode",
                    "description": "Optimize concurrency for high traffic"
                }
            ]
        });

        let call_res = call_tool(&state, &headers, "planning_import_stories", import_args).await;
        assert!(call_res.is_ok());
        let val = call_res.unwrap();
        assert_eq!(val["imported_count"], 2);

        // 3. Read resource planning://room/test_mcp_room/backlog
        let uri = "planning://room/test_mcp_room/backlog";
        let res = read_resource(&state, &headers, uri).await;
        assert!(res.is_ok());
        let res_val = res.unwrap();
        let text = res_val["contents"][0]["text"].as_str().unwrap();
        assert!(text.contains("OAuth2 Login"));
        assert!(text.contains("WAL Mode"));

        // 4. Score the first story
        let stories = state.db.get_stories(room_id).unwrap();
        let story_1_id = &stories[0].id;
        let score_args = json!({
            "room_id": room_id,
            "story_id": story_1_id,
            "score": "5"
        });
        let score_res = call_tool(&state, &headers, "planning_save_estimate", score_args).await;
        assert!(score_res.is_ok());

        let updated_story = state.db.get_story(story_1_id).unwrap().unwrap();
        assert_eq!(updated_story.final_score, Some("5".to_string()));
        assert_eq!(updated_story.status, StoryStatus::Estimated);
    }
}
