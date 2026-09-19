use axum::{
    extract::{
        ws::{Message, WebSocket},
        Path, State, WebSocketUpgrade,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{error, info, warn};
use ulid::Ulid;

use crate::models::{
    ClientMessage, DeckType, Participant, ParticipantRole, RoomPublic,
    RoomStatus, ServerMessage, Story, VoteInfo, VoteRecord,
};
use crate::state::AppState;

pub async fn ws_handler(
    Path(room_id): Path<String>,
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, room_id, state))
}

async fn handle_socket(socket: WebSocket, room_id: String, state: AppState) {
    let connection_id = Ulid::new().to_string();
    let (mut sender, mut receiver) = socket.split();
    let session = state.get_or_create_room_session(&room_id);
    let mut rx = session.tx.subscribe();
    let (direct_tx, mut direct_rx) = tokio::sync::mpsc::channel::<ServerMessage>(32);

    let mut current_participant_id: Option<String> = None;

    // Task to forward broadcast and direct unicast messages to this client WebSocket
    let send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                res = rx.recv() => {
                    match res {
                        Ok(msg) => {
                            if let Ok(json) = serde_json::to_string(&msg) {
                                if sender.send(Message::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            warn!("Client lagged behind by {} broadcast messages in room", skipped);
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            break;
                        }
                    }
                }
                Some(direct_msg) = direct_rx.recv() => {
                    if let Ok(json) = serde_json::to_string(&direct_msg) {
                        if sender.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    });

    // Handle incoming client messages
    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                // Limite de tamanho: previne DoS por mensagens gigantes
                if text.len() > 65_536 {
                    warn!("Mensagem WebSocket excessivamente grande descartada ({} bytes)", text.len());
                    continue;
                }
                let parsed: Result<ClientMessage, _> = serde_json::from_str(&text);
                match parsed {
                    Ok(client_msg) => {
                        handle_client_message(
                            client_msg,
                            &room_id,
                            &state,
                            &session,
                            &direct_tx,
                            &mut current_participant_id,
                            &connection_id,
                        )
                        .await;
                    }
                    Err(e) => {
                        warn!("Failed to parse client message: {:?}", e);
                        // Do not broadcast client parsing errors to the whole room to avoid spam/DoS
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    send_task.abort();

    // Handle participant disconnect safely using connection_id
    if let Some(p_id) = current_participant_id {
        let is_latest = session
            .participant_connections
            .get(&p_id)
            .map(|val| *val == connection_id)
            .unwrap_or(false);

        if is_latest {
            info!("Participant {} disconnected from room {}", p_id, room_id);
            session.participant_connections.remove(&p_id);
            session.participants.remove(&p_id);

            let active_participants: Vec<Participant> = session
                .participants
                .iter()
                .map(|p| p.value().clone())
                .collect();

            if active_participants.is_empty() {
                state.remove_room_if_empty(&room_id);
                info!("Room {} memory session cleaned up (no remaining participants)", room_id);
            } else {
                state.broadcast_to_room(
                    &room_id,
                    ServerMessage::PresenceUpdated {
                        participants: active_participants,
                    },
                );
            }
        } else {
            info!("Ignored disconnect cleanup for participant {} because a newer connection is active", p_id);
        }
    }
}

async fn handle_client_message(
    msg: ClientMessage,
    room_id: &str,
    state: &AppState,
    session: &crate::state::RoomSession,
    direct_tx: &tokio::sync::mpsc::Sender<ServerMessage>,
    current_participant_id: &mut Option<String>,
    connection_id: &str,
) {
    match msg {
        ClientMessage::Join {
            participant_id,
            name,
            avatar,
            role,
            facilitator_token,
        } => {
            *current_participant_id = Some(participant_id.clone());
            session
                .participant_connections
                .insert(participant_id.clone(), connection_id.to_string());

            let name = name.trim();
            let name = if name.is_empty() {
                "Participante".to_string()
            } else if name.chars().count() > 50 {
                name.chars().take(50).collect()
            } else {
                name.to_string()
            };

            let avatar = if avatar.chars().count() > 200 {
                avatar.chars().take(200).collect()
            } else {
                avatar
            };

            let room_db = match state.db.get_room(room_id) {
                Ok(Some(r)) => r,
                Ok(None) => {
                    let _ = direct_tx.send(ServerMessage::Error {
                        message: "Sala não encontrada".to_string(),
                    }).await;
                    return;
                }
                Err(e) => {
                    error!("DB error getting room: {:?}", e);
                    return;
                }
            };

            let is_facilitator = if let Some(token) = facilitator_token {
                token == room_db.facilitator_token
            } else {
                false
            };

            let participant_role = ParticipantRole::from_str(&role);

            // Check if user already voted in this room for current story
            let existing_votes = state
                .db
                .get_votes(room_id, room_db.current_story_id.as_deref())
                .unwrap_or_default();

            let my_vote = existing_votes
                .iter()
                .find(|v| v.participant_id == participant_id);

            let has_voted = my_vote.is_some();
            let my_card = my_vote.map(|v| v.card_value.clone());

            let participant = Participant {
                id: participant_id.clone(),
                name,
                avatar,
                role: participant_role,
                is_facilitator,
                has_voted,
                card: my_card.clone(),
            };

            session
                .participants
                .insert(participant_id.clone(), participant);

            // Load stories
            let stories = state.db.get_stories(room_id).unwrap_or_default();
            let current_story = if let Some(ref s_id) = room_db.current_story_id {
                stories.iter().find(|s| s.id == *s_id).cloned()
            } else {
                stories.first().cloned()
            };

            // Get cards for current deck
            let deck = DeckType::from_str(&room_db.deck_type);
            let cards = if let Some(ref custom_json) = room_db.custom_deck {
                serde_json::from_str(custom_json).unwrap_or_else(|_| deck.default_cards())
            } else {
                deck.default_cards()
            };

            // Build participant list (masked according to room status - cards remain hidden until revealed)
            let is_revealed = room_db.status == RoomStatus::Revealed;
            let participants: Vec<Participant> = session
                .participants
                .iter()
                .map(|item| {
                    let p = item.value();
                    Participant {
                        id: p.id.clone(),
                        name: p.name.clone(),
                        avatar: p.avatar.clone(),
                        role: p.role,
                        is_facilitator: p.is_facilitator,
                        has_voted: p.has_voted,
                        card: if is_revealed { p.card.clone() } else { None },
                    }
                })
                .collect();

            let (revealed_votes, stats) = if is_revealed {
                let votes_info: Vec<VoteInfo> = existing_votes
                    .iter()
                    .map(|v| {
                        let av = session
                            .participants
                            .get(&v.participant_id)
                            .map(|p| p.avatar.clone())
                            .unwrap_or_else(|| "👤".to_string());
                        VoteInfo {
                            participant_id: v.participant_id.clone(),
                            participant_name: v.participant_name.clone(),
                            avatar: av,
                            card_value: v.card_value.clone(),
                        }
                    })
                    .collect();
                let st = Database::calculate_consensus(&existing_votes);
                (Some(votes_info), Some(st))
            } else {
                (None, None)
            };

            // Send full snapshot directly to this participant only
            let room_public: RoomPublic = room_db.into();
            let snapshot = ServerMessage::RoomSnapshot {
                room: room_public,
                stories,
                current_story,
                participants: participants.clone(),
                cards,
                revealed_votes,
                stats,
            };
            let _ = direct_tx.send(snapshot).await;

            // Broadcast presence to all
            let presence_list: Vec<Participant> = session
                .participants
                .iter()
                .map(|item| {
                    let p = item.value();
                    Participant {
                        id: p.id.clone(),
                        name: p.name.clone(),
                        avatar: p.avatar.clone(),
                        role: p.role,
                        is_facilitator: p.is_facilitator,
                        has_voted: p.has_voted,
                        card: if is_revealed { p.card.clone() } else { None },
                    }
                })
                .collect();

            state.broadcast_to_room(
                room_id,
                ServerMessage::PresenceUpdated {
                    participants: presence_list,
                },
            );
        }

        ClientMessage::Vote { card_value } => {
            let card_value = if card_value.chars().count() > 20 {
                card_value.chars().take(20).collect()
            } else {
                card_value
            };
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };

            let room_db = match state.db.get_room(room_id) {
                Ok(Some(r)) => r,
                _ => return,
            };

            if room_db.status == RoomStatus::Revealed {
                return; // Round is already revealed
            }

            let participant_name = session
                .participants
                .get(&p_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| "Anônimo".to_string());

            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            let vote = VoteRecord {
                id: Ulid::new().to_string(),
                room_id: room_id.to_string(),
                story_id: room_db.current_story_id.clone(),
                participant_id: p_id.clone(),
                participant_name,
                card_value: card_value.clone(),
                created_at: now,
            };

            if let Err(e) = state.db.upsert_vote(&vote) {
                error!("Error upserting vote: {:?}", e);
                return;
            }

            if let Some(mut p) = session.participants.get_mut(&p_id) {
                p.has_voted = true;
                p.card = Some(card_value);
            }

            // Check if all estimators have voted
            let estimators: Vec<_> = session
                .participants
                .iter()
                .filter(|p| p.role == ParticipantRole::Estimator)
                .collect();

            let all_voted = !estimators.is_empty() && estimators.iter().all(|p| p.has_voted);

            state.broadcast_to_room(
                room_id,
                ServerMessage::VoteCast {
                    participant_id: p_id,
                    all_voted,
                },
            );

            // Auto-reveal if enabled and all estimators voted
            if room_db.auto_reveal && all_voted {
                reveal_round(room_id, state, session, &room_db.current_story_id).await;
            }
        }

        ClientMessage::RetractVote => {
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };

            let room_db = match state.db.get_room(room_id) {
                Ok(Some(r)) => r,
                _ => return,
            };

            if room_db.status == RoomStatus::Revealed {
                return;
            }

            let _ = state
                .db
                .delete_vote(room_id, room_db.current_story_id.as_deref(), &p_id);

            if let Some(mut p) = session.participants.get_mut(&p_id) {
                p.has_voted = false;
                p.card = None;
            }

            state.broadcast_to_room(
                room_id,
                ServerMessage::VoteRetracted {
                    participant_id: p_id,
                },
            );
        }

        ClientMessage::RevealCards => {
            // Apenas facilitador pode revelar as cartas
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };
            let is_fac = session.participants.get(&p_id).map(|p| p.is_facilitator).unwrap_or(false);
            if !is_fac {
                warn!("Participante {} tentou revelar cartas sem ser facilitador na sala {}", p_id, room_id);
                return;
            }
            let room_db = match state.db.get_room(room_id) {
                Ok(Some(r)) => r,
                _ => return,
            };
            reveal_round(room_id, state, session, &room_db.current_story_id).await;
        }

        ClientMessage::ResetRound => {
            // Apenas facilitador pode resetar a rodada
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };
            let is_fac = session.participants.get(&p_id).map(|p| p.is_facilitator).unwrap_or(false);
            if !is_fac {
                warn!("Participante {} tentou resetar rodada sem ser facilitador na sala {}", p_id, room_id);
                return;
            }
            let room_db = match state.db.get_room(room_id) {
                Ok(Some(r)) => r,
                _ => return,
            };

            let _ = state.db.update_room_status(room_id, RoomStatus::Voting);
            let _ = state
                .db
                .clear_votes(room_id, room_db.current_story_id.as_deref());

            for mut p in session.participants.iter_mut() {
                p.has_voted = false;
                p.card = None;
            }

            state.broadcast_to_room(room_id, ServerMessage::RoundReset);

            let presence_list: Vec<Participant> = session
                .participants
                .iter()
                .map(|p| p.value().clone())
                .collect();

            state.broadcast_to_room(
                room_id,
                ServerMessage::PresenceUpdated {
                    participants: presence_list,
                },
            );
        }

        ClientMessage::AddStory { title, description } => {
            let title = title.trim();
            if title.is_empty() {
                let _ = direct_tx.send(ServerMessage::Error {
                    message: "Título da história não pode ser vazio".to_string(),
                }).await;
                return;
            }
            let title = if title.chars().count() > 150 {
                title.chars().take(150).collect()
            } else {
                title.to_string()
            };
            let description = description.map(|d| {
                if d.chars().count() > 2000 {
                    d.chars().take(2000).collect()
                } else {
                    d
                }
            });

            let stories = state.db.get_stories(room_id).unwrap_or_default();
            let next_index = stories.len() as i64;
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            let story = Story {
                id: Ulid::new().to_string(),
                room_id: room_id.to_string(),
                title,
                description: description.unwrap_or_default(),
                order_index: next_index,
                final_score: None,
                status: if stories.is_empty() {
                    crate::models::StoryStatus::Active
                } else {
                    crate::models::StoryStatus::Pending
                },
                created_at: now,
                estimated_at: None,
            };

            if let Err(e) = state.db.add_story(&story) {
                error!("Error adding story: {:?}", e);
                return;
            }

            // If it's the first story, set as current
            let current_story_id = if stories.is_empty() {
                let _ = state
                    .db
                    .update_room_current_story(room_id, Some(&story.id));
                Some(story.id.clone())
            } else {
                state
                    .db
                    .get_room(room_id)
                    .ok()
                    .flatten()
                    .and_then(|r| r.current_story_id)
            };

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories,
                    current_story_id,
                },
            );
        }

        ClientMessage::SelectStory { story_id } => {
            // Apenas facilitador pode alterar a história ativa
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };
            let is_fac = session.participants.get(&p_id).map(|p| p.is_facilitator).unwrap_or(false);
            if !is_fac {
                warn!("Participante {} tentou alterar história sem ser facilitador na sala {}", p_id, room_id);
                return;
            }
            let _ = state
                .db
                .update_room_current_story(room_id, Some(&story_id));
            let _ = state.db.update_room_status(room_id, RoomStatus::Voting);
            let _ = state.db.clear_votes(room_id, Some(&story_id));

            for mut p in session.participants.iter_mut() {
                p.has_voted = false;
                p.card = None;
            }

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories,
                    current_story_id: Some(story_id),
                },
            );

            state.broadcast_to_room(room_id, ServerMessage::RoundReset);

            let presence_list: Vec<Participant> = session
                .participants
                .iter()
                .map(|p| p.value().clone())
                .collect();

            state.broadcast_to_room(
                room_id,
                ServerMessage::PresenceUpdated {
                    participants: presence_list,
                },
            );
        }

        ClientMessage::SaveStoryScore { story_id, score } => {
            // Apenas facilitador pode salvar pontuação final
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };
            let is_fac = session.participants.get(&p_id).map(|p| p.is_facilitator).unwrap_or(false);
            if !is_fac {
                warn!("Participante {} tentou salvar pontuação sem ser facilitador na sala {}", p_id, room_id);
                return;
            }
            let score = if score.chars().count() > 20 {
                score.chars().take(20).collect()
            } else {
                score
            };
            let _ = state.db.update_story_score(&story_id, &score);

            let stories = state.db.get_stories(room_id).unwrap_or_default();
            // Find next pending story
            let next_pending = stories
                .iter()
                .find(|s| s.status == crate::models::StoryStatus::Pending && s.id != story_id);

            let next_story_id = next_pending.map(|s| s.id.clone());

            let _ = state
                .db
                .update_room_current_story(room_id, next_story_id.as_deref());
            let _ = state.db.update_room_status(room_id, RoomStatus::Voting);
            let _ = state.db.clear_votes(room_id, next_story_id.as_deref());

            for mut p in session.participants.iter_mut() {
                p.has_voted = false;
                p.card = None;
            }

            let updated_stories = state.db.get_stories(room_id).unwrap_or_default();
            state.broadcast_to_room(
                room_id,
                ServerMessage::BacklogUpdated {
                    stories: updated_stories,
                    current_story_id: next_story_id,
                },
            );

            state.broadcast_to_room(room_id, ServerMessage::RoundReset);

            let presence_list: Vec<Participant> = session
                .participants
                .iter()
                .map(|p| p.value().clone())
                .collect();

            state.broadcast_to_room(
                room_id,
                ServerMessage::PresenceUpdated {
                    participants: presence_list,
                },
            );
        }

        ClientMessage::ChangeDeck {
            deck_type,
            custom_cards,
        } => {
            // Apenas facilitador pode trocar o baralho
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };
            let is_fac = session.participants.get(&p_id).map(|p| p.is_facilitator).unwrap_or(false);
            if !is_fac {
                warn!("Participante {} tentou trocar baralho sem ser facilitador na sala {}", p_id, room_id);
                return;
            }
            let custom_json = custom_cards
                .as_ref()
                .and_then(|cards| serde_json::to_string(cards).ok());

            let _ = state
                .db
                .update_room_deck(room_id, &deck_type, custom_json.as_deref());

            let deck = DeckType::from_str(&deck_type);
            let cards = custom_cards.unwrap_or_else(|| deck.default_cards());

            state.broadcast_to_room(
                room_id,
                ServerMessage::DeckUpdated {
                    deck_type,
                    cards,
                },
            );
        }

        ClientMessage::TimerAction {
            action,
            duration_seconds,
        } => {
            // Apenas facilitador pode controlar o timer
            let p_id = match current_participant_id {
                Some(ref id) => id.clone(),
                None => return,
            };
            let is_fac = session.participants.get(&p_id).map(|p| p.is_facilitator).unwrap_or(false);
            if !is_fac {
                warn!("Participante {} tentou controlar timer sem ser facilitador na sala {}", p_id, room_id);
                return;
            }
            let dur = duration_seconds.unwrap_or(120);
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            let (is_running, remaining, ends_at) = match action.as_str() {
                "start" => (true, dur, Some(now + dur)),
                "pause" => (false, dur, None),
                "reset" => (false, 0, None),
                _ => (false, dur, None),
            };

            let _ = state
                .db
                .update_room_timer(room_id, is_running, remaining, ends_at);

            state.broadcast_to_room(
                room_id,
                ServerMessage::TimerUpdated {
                    timer_is_running: is_running,
                    timer_seconds_remaining: remaining,
                    timer_ends_at: ends_at,
                },
            );
        }

        ClientMessage::Reaction { emoji } => {
            let emoji = if emoji.chars().count() > 20 {
                emoji.chars().take(20).collect()
            } else {
                emoji
            };
            let (p_id, p_name) = match current_participant_id {
                Some(ref id) => {
                    let name = session
                        .participants
                        .get(id)
                        .map(|p| p.name.clone())
                        .unwrap_or_else(|| "Anônimo".to_string());
                    (id.clone(), name)
                }
                None => return,
            };

            state.broadcast_to_room(
                room_id,
                ServerMessage::ReactionReceived {
                    participant_id: p_id,
                    participant_name: p_name,
                    emoji,
                },
            );
        }

        ClientMessage::Ping => {
            let _ = direct_tx.send(ServerMessage::Pong).await;
        }
    }
}

async fn reveal_round(
    room_id: &str,
    state: &AppState,
    session: &crate::state::RoomSession,
    current_story_id: &Option<String>,
) {
    let _ = state.db.update_room_status(room_id, RoomStatus::Revealed);

    let votes = state
        .db
        .get_votes(room_id, current_story_id.as_deref())
        .unwrap_or_default();

    // Update in-memory participant cards
    for v in &votes {
        if let Some(mut p) = session.participants.get_mut(&v.participant_id) {
            p.card = Some(v.card_value.clone());
        }
    }

    let votes_info: Vec<VoteInfo> = votes
        .iter()
        .map(|v| {
            let av = session
                .participants
                .get(&v.participant_id)
                .map(|p| p.avatar.clone())
                .unwrap_or_else(|| "👤".to_string());
            VoteInfo {
                participant_id: v.participant_id.clone(),
                participant_name: v.participant_name.clone(),
                avatar: av,
                card_value: v.card_value.clone(),
            }
        })
        .collect();

    let stats = Database::calculate_consensus(&votes);

    state.broadcast_to_room(
        room_id,
        ServerMessage::CardsRevealed {
            votes: votes_info,
            stats,
        },
    );
}
use crate::db::Database;
