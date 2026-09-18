export type ParticipantRole = 'estimator' | 'spectator';
export type RoomStatus = 'voting' | 'revealed';
export type StoryStatus = 'pending' | 'active' | 'estimated' | 'skipped';

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  role: ParticipantRole;
  is_facilitator: boolean;
  has_voted: boolean;
  card?: string;
}

export interface Story {
  id: string;
  room_id: string;
  title: string;
  description: string;
  order_index: number;
  final_score?: string | null;
  status: StoryStatus;
  created_at: number;
  estimated_at?: number | null;
}

export interface Room {
  id: string;
  name: string;
  deck_type: string;
  custom_deck?: string | null;
  status: RoomStatus;
  auto_reveal: boolean;
  show_average: boolean;
  current_story_id?: string | null;
  timer_seconds_remaining: number;
  timer_is_running: boolean;
  timer_ends_at?: number | null;
  created_at: number;
}

export interface VoteInfo {
  participant_id: string;
  participant_name: string;
  avatar: string;
  card_value: string;
}

export interface ConsensusStats {
  average?: number | null;
  median?: number | null;
  mode: string[];
  agreement_percentage: number;
  unanimous: boolean;
  lowest_vote?: string | null;
  lowest_voters: string[];
  highest_vote?: string | null;
  highest_voters: string[];
  distribution: Record<string, number>;
  total_votes: number;
}

export type ServerMessage =
  | {
      type: 'room_snapshot';
      room: Room;
      stories: Story[];
      current_story?: Story | null;
      participants: Participant[];
      cards: string[];
      revealed_votes?: VoteInfo[] | null;
      stats?: ConsensusStats | null;
    }
  | {
      type: 'presence_updated';
      participants: Participant[];
    }
  | {
      type: 'vote_cast';
      participant_id: string;
      all_voted: boolean;
    }
  | {
      type: 'vote_retracted';
      participant_id: string;
    }
  | {
      type: 'cards_revealed';
      votes: VoteInfo[];
      stats: ConsensusStats;
    }
  | {
      type: 'round_reset';
    }
  | {
      type: 'backlog_updated';
      stories: Story[];
      current_story_id?: string | null;
    }
  | {
      type: 'deck_updated';
      deck_type: string;
      cards: string[];
    }
  | {
      type: 'timer_updated';
      timer_is_running: boolean;
      timer_seconds_remaining: number;
      timer_ends_at?: number | null;
    }
  | {
      type: 'reaction_received';
      participant_id: string;
      participant_name: string;
      emoji: string;
    }
  | {
      type: 'pong';
    }
  | {
      type: 'error';
      message: string;
    };
