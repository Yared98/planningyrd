#![allow(dead_code)]

use rusqlite::{params, Connection, Result};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::models::{ConsensusStats, Room, RoomStatus, Story, StoryStatus, VoteRecord};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;

        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;",
        )?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.migrate()?;
        Ok(db)
    }

    fn get_conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.get_conn();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                deck_type TEXT NOT NULL,
                custom_deck TEXT,
                facilitator_token TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'voting',
                auto_reveal INTEGER NOT NULL DEFAULT 0,
                show_average INTEGER NOT NULL DEFAULT 1,
                current_story_id TEXT,
                timer_seconds_remaining INTEGER NOT NULL DEFAULT 0,
                timer_is_running INTEGER NOT NULL DEFAULT 0,
                timer_ends_at INTEGER,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stories (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                order_index INTEGER NOT NULL,
                final_score TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at INTEGER NOT NULL,
                estimated_at INTEGER,
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS votes (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                story_id TEXT,
                participant_id TEXT NOT NULL,
                participant_name TEXT NOT NULL,
                card_value TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_stories_room ON stories(room_id);
            CREATE INDEX IF NOT EXISTS idx_votes_room ON votes(room_id);
            CREATE INDEX IF NOT EXISTS idx_votes_story ON votes(story_id);",
        )?;
        Ok(())
    }

    pub fn create_room(&self, room: &Room) -> Result<()> {
        let conn = self.get_conn();
        conn.execute(
            "INSERT INTO rooms (
                id, name, deck_type, custom_deck, facilitator_token,
                status, auto_reveal, show_average, current_story_id,
                timer_seconds_remaining, timer_is_running, timer_ends_at, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                room.id,
                room.name,
                room.deck_type,
                room.custom_deck,
                room.facilitator_token,
                room.status.to_str(),
                room.auto_reveal as i32,
                room.show_average as i32,
                room.current_story_id,
                room.timer_seconds_remaining,
                room.timer_is_running as i32,
                room.timer_ends_at,
                room.created_at
            ],
        )?;
        Ok(())
    }

    pub fn get_room(&self, id: &str) -> Result<Option<Room>> {
        let conn = self.get_conn();
        let mut stmt = conn.prepare(
            "SELECT id, name, deck_type, custom_deck, facilitator_token,
                    status, auto_reveal, show_average, current_story_id,
                    timer_seconds_remaining, timer_is_running, timer_ends_at, created_at
             FROM rooms WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let status_str: String = row.get(5)?;
            Ok(Some(Room {
                id: row.get(0)?,
                name: row.get(1)?,
                deck_type: row.get(2)?,
                custom_deck: row.get(3)?,
                facilitator_token: row.get(4)?,
                status: RoomStatus::from_str(&status_str),
                auto_reveal: row.get::<_, i32>(6)? != 0,
                show_average: row.get::<_, i32>(7)? != 0,
                current_story_id: row.get(8)?,
                timer_seconds_remaining: row.get(9)?,
                timer_is_running: row.get::<_, i32>(10)? != 0,
                timer_ends_at: row.get(11)?,
                created_at: row.get(12)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn cleanup_expired_rooms(&self, retention_days: i64) -> Result<usize> {
        let conn = self.get_conn();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        let cutoff_ms = now - (retention_days * 24 * 3600 * 1000);
        let count = conn.execute(
            "DELETE FROM rooms WHERE created_at < ?1",
            params![cutoff_ms],
        )?;
        Ok(count)
    }

    pub fn update_room_status(&self, id: &str, status: RoomStatus) -> Result<()> {
        let conn = self.get_conn();
        conn.execute(
            "UPDATE rooms SET status = ?1 WHERE id = ?2",
            params![status.to_str(), id],
        )?;
        Ok(())
    }

    pub fn update_room_deck(&self, id: &str, deck_type: &str, custom_deck: Option<&str>) -> Result<()> {
        let conn = self.get_conn();
        conn.execute(
            "UPDATE rooms SET deck_type = ?1, custom_deck = ?2 WHERE id = ?3",
            params![deck_type, custom_deck, id],
        )?;
        Ok(())
    }

    pub fn update_room_current_story(&self, room_id: &str, story_id: Option<&str>) -> Result<()> {
        let conn = self.get_conn();
        conn.execute(
            "UPDATE rooms SET current_story_id = ?1 WHERE id = ?2",
            params![story_id, room_id],
        )?;
        Ok(())
    }

    pub fn update_room_timer(&self, room_id: &str, is_running: bool, remaining: i64, ends_at: Option<i64>) -> Result<()> {
        let conn = self.get_conn();
        conn.execute(
            "UPDATE rooms SET timer_is_running = ?1, timer_seconds_remaining = ?2, timer_ends_at = ?3 WHERE id = ?4",
            params![is_running as i32, remaining, ends_at, room_id],
        )?;
        Ok(())
    }

    pub fn add_story(&self, story: &Story) -> Result<()> {
        let conn = self.get_conn();
        conn.execute(
            "INSERT INTO stories (
                id, room_id, title, description, order_index, final_score, status, created_at, estimated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                story.id,
                story.room_id,
                story.title,
                story.description,
                story.order_index,
                story.final_score,
                story.status.to_str(),
                story.created_at,
                story.estimated_at
            ],
        )?;
        Ok(())
    }

    pub fn get_stories(&self, room_id: &str) -> Result<Vec<Story>> {
        let conn = self.get_conn();
        let mut stmt = conn.prepare(
            "SELECT id, room_id, title, description, order_index, final_score, status, created_at, estimated_at
             FROM stories WHERE room_id = ?1 ORDER BY order_index ASC, created_at ASC",
        )?;

        let rows = stmt.query_map(params![room_id], |row| {
            let status_str: String = row.get(6)?;
            Ok(Story {
                id: row.get(0)?,
                room_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                order_index: row.get(4)?,
                final_score: row.get(5)?,
                status: StoryStatus::from_str(&status_str),
                created_at: row.get(7)?,
                estimated_at: row.get(8)?,
            })
        })?;

        let mut stories = Vec::new();
        for s in rows {
            stories.push(s?);
        }
        Ok(stories)
    }

    pub fn get_story(&self, story_id: &str) -> Result<Option<Story>> {
        let conn = self.get_conn();
        let mut stmt = conn.prepare(
            "SELECT id, room_id, title, description, order_index, final_score, status, created_at, estimated_at
             FROM stories WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![story_id])?;
        if let Some(row) = rows.next()? {
            let status_str: String = row.get(6)?;
            Ok(Some(Story {
                id: row.get(0)?,
                room_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                order_index: row.get(4)?,
                final_score: row.get(5)?,
                status: StoryStatus::from_str(&status_str),
                created_at: row.get(7)?,
                estimated_at: row.get(8)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_story_score(&self, story_id: &str, score: &str) -> Result<()> {
        let conn = self.get_conn();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        conn.execute(
            "UPDATE stories SET final_score = ?1, status = 'estimated', estimated_at = ?2 WHERE id = ?3",
            params![score, now, story_id],
        )?;
        Ok(())
    }

    pub fn upsert_vote(&self, vote: &VoteRecord) -> Result<()> {
        let conn = self.get_conn();
        // Remove existing vote by this participant for this story/room
        if let Some(ref s_id) = vote.story_id {
            conn.execute(
                "DELETE FROM votes WHERE room_id = ?1 AND story_id = ?2 AND participant_id = ?3",
                params![vote.room_id, s_id, vote.participant_id],
            )?;
        } else {
            conn.execute(
                "DELETE FROM votes WHERE room_id = ?1 AND story_id IS NULL AND participant_id = ?2",
                params![vote.room_id, vote.participant_id],
            )?;
        }

        conn.execute(
            "INSERT INTO votes (id, room_id, story_id, participant_id, participant_name, card_value, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                vote.id,
                vote.room_id,
                vote.story_id,
                vote.participant_id,
                vote.participant_name,
                vote.card_value,
                vote.created_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_vote(&self, room_id: &str, story_id: Option<&str>, participant_id: &str) -> Result<()> {
        let conn = self.get_conn();
        if let Some(s_id) = story_id {
            conn.execute(
                "DELETE FROM votes WHERE room_id = ?1 AND story_id = ?2 AND participant_id = ?3",
                params![room_id, s_id, participant_id],
            )?;
        } else {
            conn.execute(
                "DELETE FROM votes WHERE room_id = ?1 AND (story_id IS NULL OR story_id = '') AND participant_id = ?2",
                params![room_id, participant_id],
            )?;
        }
        Ok(())
    }

    pub fn get_votes(&self, room_id: &str, story_id: Option<&str>) -> Result<Vec<VoteRecord>> {
        let conn = self.get_conn();
        if let Some(s_id) = story_id {
            let mut stmt = conn.prepare(
                "SELECT id, room_id, story_id, participant_id, participant_name, card_value, created_at
                 FROM votes WHERE room_id = ?1 AND story_id = ?2 ORDER BY created_at ASC",
            )?;
            let rows = stmt.query_map(params![room_id, s_id], |row| {
                Ok(VoteRecord {
                    id: row.get(0)?,
                    room_id: row.get(1)?,
                    story_id: row.get(2)?,
                    participant_id: row.get(3)?,
                    participant_name: row.get(4)?,
                    card_value: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?;
            let mut list = Vec::new();
            for r in rows {
                list.push(r?);
            }
            Ok(list)
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, room_id, story_id, participant_id, participant_name, card_value, created_at
                 FROM votes WHERE room_id = ?1 AND (story_id IS NULL OR story_id = '') ORDER BY created_at ASC",
            )?;
            let rows = stmt.query_map(params![room_id], |row| {
                Ok(VoteRecord {
                    id: row.get(0)?,
                    room_id: row.get(1)?,
                    story_id: row.get(2)?,
                    participant_id: row.get(3)?,
                    participant_name: row.get(4)?,
                    card_value: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?;
            let mut list = Vec::new();
            for r in rows {
                list.push(r?);
            }
            Ok(list)
        }
    }

    pub fn clear_votes(&self, room_id: &str, story_id: Option<&str>) -> Result<()> {
        let conn = self.get_conn();
        if let Some(s_id) = story_id {
            conn.execute(
                "DELETE FROM votes WHERE room_id = ?1 AND story_id = ?2",
                params![room_id, s_id],
            )?;
        } else {
            conn.execute(
                "DELETE FROM votes WHERE room_id = ?1 AND (story_id IS NULL OR story_id = '')",
                params![room_id],
            )?;
        }
        Ok(())
    }

    pub fn calculate_consensus(votes: &[VoteRecord]) -> ConsensusStats {
        if votes.is_empty() {
            return ConsensusStats {
                average: None,
                median: None,
                mode: Vec::new(),
                agreement_percentage: 0.0,
                unanimous: false,
                lowest_vote: None,
                lowest_voters: Vec::new(),
                highest_vote: None,
                highest_voters: Vec::new(),
                distribution: HashMap::new(),
                total_votes: 0,
            };
        }

        let mut distribution: HashMap<String, usize> = HashMap::new();
        let mut numeric_votes: Vec<(f64, String, String)> = Vec::new(); // (numeric_val, original_val, voter_name)

        for v in votes {
            *distribution.entry(v.card_value.clone()).or_insert(0) += 1;

            let parsed = if v.card_value == "½" {
                Some(0.5)
            } else {
                v.card_value.parse::<f64>().ok()
            };

            if let Some(num) = parsed {
                numeric_votes.push((num, v.card_value.clone(), v.participant_name.clone()));
            }
        }

        let total_votes = votes.len();

        // Mode (most frequent cards)
        let max_freq = distribution.values().copied().max().unwrap_or(0);
        let mode: Vec<String> = distribution
            .iter()
            .filter(|(_, &count)| count == max_freq)
            .map(|(val, _)| val.clone())
            .collect();

        // Agreement percentage = highest card vote count / total_votes
        let agreement_percentage = if total_votes > 0 {
            ((max_freq as f64 / total_votes as f64) * 1000.0).round() / 10.0
        } else {
            0.0
        };

        let unanimous = agreement_percentage >= 99.9 && total_votes > 1;

        // Statistics for numeric values
        let (average, median, lowest_vote, lowest_voters, highest_vote, highest_voters) =
            if !numeric_votes.is_empty() {
                numeric_votes.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

                let sum: f64 = numeric_votes.iter().map(|(n, _, _)| *n).sum();
                let avg = sum / (numeric_votes.len() as f64);
                let rounded_avg = (avg * 10.0).round() / 10.0;

                let med = if numeric_votes.len() % 2 == 1 {
                    numeric_votes[numeric_votes.len() / 2].0
                } else {
                    let mid = numeric_votes.len() / 2;
                    (numeric_votes[mid - 1].0 + numeric_votes[mid].0) / 2.0
                };
                let rounded_med = (med * 10.0).round() / 10.0;

                let min_val = numeric_votes.first().unwrap().0;
                let max_val = numeric_votes.last().unwrap().0;

                let min_str = numeric_votes.first().unwrap().1.clone();
                let max_str = numeric_votes.last().unwrap().1.clone();

                let min_voters: Vec<String> = numeric_votes
                    .iter()
                    .filter(|(n, _, _)| (*n - min_val).abs() < f64::EPSILON)
                    .map(|(_, _, name)| name.clone())
                    .collect();

                let max_voters: Vec<String> = numeric_votes
                    .iter()
                    .filter(|(n, _, _)| (*n - max_val).abs() < f64::EPSILON)
                    .map(|(_, _, name)| name.clone())
                    .collect();

                (
                    Some(rounded_avg),
                    Some(rounded_med),
                    Some(min_str),
                    min_voters,
                    Some(max_str),
                    max_voters,
                )
            } else {
                (None, None, None, Vec::new(), None, Vec::new())
            };

        ConsensusStats {
            average,
            median,
            mode,
            agreement_percentage,
            unanimous,
            lowest_vote,
            lowest_voters,
            highest_vote,
            highest_voters,
            distribution,
            total_votes,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consensus_calculation_unanimous() {
        let votes = vec![
            VoteRecord {
                id: "1".into(),
                room_id: "r1".into(),
                story_id: None,
                participant_id: "p1".into(),
                participant_name: "Alice".into(),
                card_value: "5".into(),
                created_at: 100,
            },
            VoteRecord {
                id: "2".into(),
                room_id: "r1".into(),
                story_id: None,
                participant_id: "p2".into(),
                participant_name: "Bob".into(),
                card_value: "5".into(),
                created_at: 101,
            },
        ];

        let stats = Database::calculate_consensus(&votes);
        assert_eq!(stats.average, Some(5.0));
        assert_eq!(stats.median, Some(5.0));
        assert_eq!(stats.mode, vec!["5".to_string()]);
        assert_eq!(stats.agreement_percentage, 100.0);
        assert!(stats.unanimous);
        assert_eq!(stats.lowest_vote, Some("5".to_string()));
        assert_eq!(stats.highest_vote, Some("5".to_string()));
    }

    #[test]
    fn test_consensus_calculation_divergent() {
        let votes = vec![
            VoteRecord {
                id: "1".into(),
                room_id: "r1".into(),
                story_id: None,
                participant_id: "p1".into(),
                participant_name: "Alice".into(),
                card_value: "3".into(),
                created_at: 100,
            },
            VoteRecord {
                id: "2".into(),
                room_id: "r1".into(),
                story_id: None,
                participant_id: "p2".into(),
                participant_name: "Bob".into(),
                card_value: "8".into(),
                created_at: 101,
            },
            VoteRecord {
                id: "3".into(),
                room_id: "r1".into(),
                story_id: None,
                participant_id: "p3".into(),
                participant_name: "Charlie".into(),
                card_value: "8".into(),
                created_at: 102,
            },
            VoteRecord {
                id: "4".into(),
                room_id: "r1".into(),
                story_id: None,
                participant_id: "p4".into(),
                participant_name: "Dana".into(),
                card_value: "☕".into(),
                created_at: 103,
            },
        ];

        let stats = Database::calculate_consensus(&votes);
        assert_eq!(stats.total_votes, 4);
        assert_eq!(stats.mode, vec!["8".to_string()]);
        // 3 numeric votes: 3, 8, 8 -> sum = 19 -> avg = 6.333 -> 6.3
        assert_eq!(stats.average, Some(6.3));
        assert_eq!(stats.median, Some(8.0));
        assert_eq!(stats.lowest_vote, Some("3".to_string()));
        assert_eq!(stats.lowest_voters, vec!["Alice".to_string()]);
        assert_eq!(stats.highest_vote, Some("8".to_string()));
        assert_eq!(stats.highest_voters, vec!["Bob".to_string(), "Charlie".to_string()]);
        assert!(!stats.unanimous);
    }

    #[test]
    fn test_db_room_and_story_flow() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        let room = Room {
            id: "room_test_1".into(),
            name: "Sprint Planning 1".into(),
            deck_type: "fibonacci".into(),
            custom_deck: None,
            facilitator_token: "token123".into(),
            status: RoomStatus::Voting,
            auto_reveal: false,
            show_average: true,
            current_story_id: None,
            timer_seconds_remaining: 0,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 1000,
        };

        db.create_room(&room).unwrap();
        let fetched = db.get_room("room_test_1").unwrap().expect("Room should exist");
        assert_eq!(fetched.name, "Sprint Planning 1");

        let story = Story {
            id: "story_1".into(),
            room_id: "room_test_1".into(),
            title: "Task 1".into(),
            description: "Desc 1".into(),
            order_index: 0,
            final_score: None,
            status: StoryStatus::Pending,
            created_at: 1001,
            estimated_at: None,
        };
        db.add_story(&story).unwrap();

        let stories = db.get_stories("room_test_1").unwrap();
        assert_eq!(stories.len(), 1);
        assert_eq!(stories[0].title, "Task 1");

        db.update_story_score("story_1", "8").unwrap();
        let updated_story = db.get_story("story_1").unwrap().unwrap();
        assert_eq!(updated_story.final_score, Some("8".into()));
        assert_eq!(updated_story.status, StoryStatus::Estimated);
    }

    #[test]
    fn test_db_mutex_poison_recovery() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");

        // Intentionally poison the mutex
        let db_clone = db.clone();
        let _ = std::panic::catch_unwind(move || {
            let _guard = db_clone.conn.lock().unwrap();
            panic!("Intentional panic to poison mutex");
        });

        // The mutex is now poisoned; operations should still succeed via get_conn()
        let room = Room {
            id: "poison_test_room".into(),
            name: "Poison Recovery Room".into(),
            deck_type: "fibonacci".into(),
            custom_deck: None,
            facilitator_token: "token_p".into(),
            status: RoomStatus::Voting,
            auto_reveal: false,
            show_average: true,
            current_story_id: None,
            timer_seconds_remaining: 0,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: 2000,
        };

        assert!(db.create_room(&room).is_ok());
        let fetched = db.get_room("poison_test_room").unwrap();
        assert!(fetched.is_some());
    }

    #[test]
    fn test_cleanup_expired_rooms() {
        let db = Database::new(":memory:").expect("Failed to create in-memory db");
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64;

        // Old room created 70 days ago
        let old_created_at = now - (70 * 24 * 3600 * 1000);
        let old_room = Room {
            id: "old_room".into(),
            name: "Old Sprint Poker".into(),
            deck_type: "fibonacci".into(),
            custom_deck: None,
            facilitator_token: "tok_old".into(),
            status: RoomStatus::Voting,
            auto_reveal: false,
            show_average: true,
            current_story_id: None,
            timer_seconds_remaining: 0,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: old_created_at,
        };
        db.create_room(&old_room).unwrap();

        // Story in old room
        let story = Story {
            id: "story_old".into(),
            room_id: "old_room".into(),
            title: "Old Story".into(),
            description: "".into(),
            order_index: 0,
            final_score: None,
            status: StoryStatus::Pending,
            created_at: old_created_at,
            estimated_at: None,
        };
        db.add_story(&story).unwrap();

        // Fresh room created today
        let fresh_room = Room {
            id: "fresh_room".into(),
            name: "Fresh Sprint Poker".into(),
            deck_type: "fibonacci".into(),
            custom_deck: None,
            facilitator_token: "tok_fresh".into(),
            status: RoomStatus::Voting,
            auto_reveal: false,
            show_average: true,
            current_story_id: None,
            timer_seconds_remaining: 0,
            timer_is_running: false,
            timer_ends_at: None,
            created_at: now,
        };
        db.create_room(&fresh_room).unwrap();

        // Run cleanup with 60 days
        let purged = db.cleanup_expired_rooms(60).unwrap();
        assert_eq!(purged, 1);

        // old_room and its story should be gone via CASCADE
        assert!(db.get_room("old_room").unwrap().is_none());
        assert!(db.get_stories("old_room").unwrap().is_empty());

        // fresh_room should remain
        assert!(db.get_room("fresh_room").unwrap().is_some());
    }
}


