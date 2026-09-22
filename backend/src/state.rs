#![allow(dead_code)]

use dashmap::DashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;
use crate::db::Database;
use crate::models::{Participant, ServerMessage};

#[derive(Clone)]
pub struct RoomSession {
    pub room_id: String,
    pub tx: broadcast::Sender<ServerMessage>,
    pub participants: Arc<DashMap<String, Participant>>,
    pub participant_connections: Arc<DashMap<String, String>>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub rooms: Arc<DashMap<String, RoomSession>>,
    pub admin_sessions: Arc<DashMap<String, Instant>>,
    pub admin_rate_limiter: Arc<DashMap<String, (u32, Instant)>>,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            rooms: Arc::new(DashMap::new()),
            admin_sessions: Arc::new(DashMap::new()),
            admin_rate_limiter: Arc::new(DashMap::new()),
        }
    }

    pub fn get_or_create_room_session(&self, room_id: &str) -> RoomSession {
        if let Some(session) = self.rooms.get(room_id) {
            session.clone()
        } else {
            let (tx, _) = broadcast::channel(100);
            let session = RoomSession {
                room_id: room_id.to_string(),
                tx,
                participants: Arc::new(DashMap::new()),
                participant_connections: Arc::new(DashMap::new()),
            };
            self.rooms.insert(room_id.to_string(), session.clone());
            session
        }
    }

    pub fn broadcast_to_room(&self, room_id: &str, msg: ServerMessage) {
        if let Some(session) = self.rooms.get(room_id) {
            let _ = session.tx.send(msg);
        }
    }

    pub fn remove_room_if_empty(&self, room_id: &str) -> bool {
        if let Some(session) = self.rooms.get(room_id) {
            if session.participants.is_empty() {
                drop(session);
                self.rooms.remove(room_id);
                return true;
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_room_cleanup() {
        let db = Database::new(":memory:").unwrap();
        let state = AppState::new(db);

        let room_id = "test_cleanup_room";
        let _session = state.get_or_create_room_session(room_id);
        assert_eq!(state.rooms.len(), 1);

        // Room has no participants, should be removed
        assert!(state.remove_room_if_empty(room_id));
        assert_eq!(state.rooms.len(), 0);

        // Add participant to session
        let session = state.get_or_create_room_session(room_id);
        session.participants.insert(
            "p1".into(),
            crate::models::Participant {
                id: "p1".into(),
                name: "Alice".into(),
                avatar: "".into(),
                role: crate::models::ParticipantRole::Estimator,
                is_facilitator: false,
                has_voted: false,
                card: None,
            },
        );

        // Room has participants, should NOT be removed
        assert!(!state.remove_room_if_empty(room_id));
        assert_eq!(state.rooms.len(), 1);

        // Remove participant
        session.participants.remove("p1");
        assert!(state.remove_room_if_empty(room_id));
        assert_eq!(state.rooms.len(), 0);
    }
}


