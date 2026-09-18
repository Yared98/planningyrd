#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DeckType {
    Fibonacci,
    ModifiedFibonacci,
    TShirt,
    PowersOf2,
    OneToTen,
    Custom,
}

impl DeckType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "modified_fibonacci" => DeckType::ModifiedFibonacci,
            "tshirt" => DeckType::TShirt,
            "powers_of_2" => DeckType::PowersOf2,
            "one_to_ten" | "sequential" | "1-10" | "1_to_10" => DeckType::OneToTen,
            "custom" => DeckType::Custom,
            _ => DeckType::Fibonacci,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            DeckType::Fibonacci => "fibonacci",
            DeckType::ModifiedFibonacci => "modified_fibonacci",
            DeckType::TShirt => "tshirt",
            DeckType::PowersOf2 => "powers_of_2",
            DeckType::OneToTen => "one_to_ten",
            DeckType::Custom => "custom",
        }
    }

    pub fn default_cards(&self) -> Vec<String> {
        match self {
            DeckType::Fibonacci => vec![
                "0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
            DeckType::ModifiedFibonacci => vec![
                "0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
            DeckType::TShirt => vec!["XS", "S", "M", "L", "XL", "XXL", "?"]
                .into_iter()
                .map(String::from)
                .collect(),
            DeckType::PowersOf2 => vec!["1", "2", "4", "8", "16", "32", "64", "?"]
                .into_iter()
                .map(String::from)
                .collect(),
            DeckType::OneToTen => vec![
                "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "☕",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
            DeckType::Custom => vec!["1", "2", "3", "5", "8", "?"]
                .into_iter()
                .map(String::from)
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ParticipantRole {
    Estimator,
    Spectator,
}

impl ParticipantRole {
    pub fn from_str(s: &str) -> Self {
        match s {
            "spectator" => ParticipantRole::Spectator,
            _ => ParticipantRole::Estimator,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            ParticipantRole::Estimator => "estimator",
            ParticipantRole::Spectator => "spectator",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RoomStatus {
    Voting,
    Revealed,
}

impl RoomStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "revealed" => RoomStatus::Revealed,
            _ => RoomStatus::Voting,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            RoomStatus::Voting => "voting",
            RoomStatus::Revealed => "revealed",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StoryStatus {
    Pending,
    Active,
    Estimated,
    Skipped,
}

impl StoryStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "active" => StoryStatus::Active,
            "estimated" => StoryStatus::Estimated,
            "skipped" => StoryStatus::Skipped,
            _ => StoryStatus::Pending,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            StoryStatus::Pending => "pending",
            StoryStatus::Active => "active",
            StoryStatus::Estimated => "estimated",
            StoryStatus::Skipped => "skipped",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub deck_type: String,
    pub custom_deck: Option<String>,
    pub facilitator_token: String,
    pub status: RoomStatus,
    pub auto_reveal: bool,
    pub show_average: bool,
    pub current_story_id: Option<String>,
    pub timer_seconds_remaining: i64,
    pub timer_is_running: bool,
    pub timer_ends_at: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Story {
    pub id: String,
    pub room_id: String,
    pub title: String,
    pub description: String,
    pub order_index: i64,
    pub final_score: Option<String>,
    pub status: StoryStatus,
    pub created_at: i64,
    pub estimated_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub role: ParticipantRole,
    pub is_facilitator: bool,
    pub has_voted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub card: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteRecord {
    pub id: String,
    pub room_id: String,
    pub story_id: Option<String>,
    pub participant_id: String,
    pub participant_name: String,
    pub card_value: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusStats {
    pub average: Option<f64>,
    pub median: Option<f64>,
    pub mode: Vec<String>,
    pub agreement_percentage: f64,
    pub unanimous: bool,
    pub lowest_vote: Option<String>,
    pub lowest_voters: Vec<String>,
    pub highest_vote: Option<String>,
    pub highest_voters: Vec<String>,
    pub distribution: HashMap<String, usize>,
    pub total_votes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Join {
        participant_id: String,
        name: String,
        avatar: String,
        role: String,
        facilitator_token: Option<String>,
    },
    Vote {
        card_value: String,
    },
    RetractVote,
    RevealCards,
    ResetRound,
    AddStory {
        title: String,
        description: Option<String>,
    },
    SelectStory {
        story_id: String,
    },
    SaveStoryScore {
        story_id: String,
        score: String,
    },
    ChangeDeck {
        deck_type: String,
        custom_cards: Option<Vec<String>>,
    },
    TimerAction {
        action: String,
        duration_seconds: Option<i64>,
    },
    Reaction {
        emoji: String,
    },
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteInfo {
    pub participant_id: String,
    pub participant_name: String,
    pub avatar: String,
    pub card_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    RoomSnapshot {
        room: RoomPublic,
        stories: Vec<Story>,
        current_story: Option<Story>,
        participants: Vec<Participant>,
        cards: Vec<String>,
        revealed_votes: Option<Vec<VoteInfo>>,
        stats: Option<ConsensusStats>,
    },
    PresenceUpdated {
        participants: Vec<Participant>,
    },
    VoteCast {
        participant_id: String,
        all_voted: bool,
    },
    VoteRetracted {
        participant_id: String,
    },
    CardsRevealed {
        votes: Vec<VoteInfo>,
        stats: ConsensusStats,
    },
    RoundReset,
    BacklogUpdated {
        stories: Vec<Story>,
        current_story_id: Option<String>,
    },
    DeckUpdated {
        deck_type: String,
        cards: Vec<String>,
    },
    TimerUpdated {
        timer_is_running: bool,
        timer_seconds_remaining: i64,
        timer_ends_at: Option<i64>,
    },
    ReactionReceived {
        participant_id: String,
        participant_name: String,
        emoji: String,
    },
    Pong,
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomPublic {
    pub id: String,
    pub name: String,
    pub deck_type: String,
    pub custom_deck: Option<String>,
    pub status: RoomStatus,
    pub auto_reveal: bool,
    pub show_average: bool,
    pub current_story_id: Option<String>,
    pub timer_seconds_remaining: i64,
    pub timer_is_running: bool,
    pub timer_ends_at: Option<i64>,
    pub created_at: i64,
}

impl From<Room> for RoomPublic {
    fn from(r: Room) -> Self {
        Self {
            id: r.id,
            name: r.name,
            deck_type: r.deck_type,
            custom_deck: r.custom_deck,
            status: r.status,
            auto_reveal: r.auto_reveal,
            show_average: r.show_average,
            current_story_id: r.current_story_id,
            timer_seconds_remaining: r.timer_seconds_remaining,
            timer_is_running: r.timer_is_running,
            timer_ends_at: r.timer_ends_at,
            created_at: r.created_at,
        }
    }
}
