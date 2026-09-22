import { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { soundPlayer } from '../utils/sound';
import type {
  ConsensusStats,
  Participant,
  ParticipantRole,
  Room,
  ServerMessage,
  Story,
  VoteInfo,
} from '../types';

interface UsePlanningSocketProps {
  roomId: string;
  participantId: string;
  name: string;
  avatar: string;
  role: ParticipantRole;
  facilitatorToken?: string | null;
}

export interface FloatingReaction {
  id: string;
  name: string;
  emoji: string;
  x: number;
}

export function usePlanningSocket({
  roomId,
  participantId,
  name,
  avatar,
  role,
  facilitatorToken,
}: UsePlanningSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cards, setCards] = useState<string[]>([]);
  const [revealedVotes, setRevealedVotes] = useState<VoteInfo[] | null>(null);
  const [stats, setStats] = useState<ConsensusStats | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [timer, setTimer] = useState<{
    isRunning: boolean;
    secondsRemaining: number;
    endsAt?: number | null;
  }>({
    isRunning: false,
    secondsRemaining: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/rooms/${roomId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send join message
      sendMessage({
        type: 'join',
        participant_id: participantId,
        name,
        avatar,
        role,
        facilitator_token: facilitatorToken || undefined,
      });

      // Setup heartbeat ping
      heartbeatIntervalRef.current = window.setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data);
        switch (data.type) {
          case 'room_snapshot':
            setRoom(data.room);
            setStories(data.stories);
            setCurrentStory(data.current_story || null);
            setParticipants(data.participants);
            setCards(data.cards);
            setRevealedVotes(data.revealed_votes || null);
            setStats(data.stats || null);
            setTimer({
              isRunning: data.room.timer_is_running,
              secondsRemaining: data.room.timer_seconds_remaining,
              endsAt: data.room.timer_ends_at,
            });
            break;

          case 'presence_updated':
            setParticipants(data.participants);
            break;

          case 'vote_cast':
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === data.participant_id ? { ...p, has_voted: true } : p
              )
            );
            break;

          case 'vote_retracted':
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === data.participant_id ? { ...p, has_voted: false, card: undefined } : p
              )
            );
            break;

          case 'cards_revealed':
            setRoom((prev) => (prev ? { ...prev, status: 'revealed' } : null));
            setRevealedVotes(data.votes);
            setStats(data.stats);

            // Update participant cards
            setParticipants((prev) =>
              prev.map((p) => {
                const found = data.votes.find((v) => v.participant_id === p.id);
                return found ? { ...p, card: found.card_value, has_voted: true } : p;
              })
            );

            // Celebrate if unanimous or high consensus
            if (data.stats.unanimous) {
              confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#10b981', '#fbbf24', '#f43f5e'],
              });
            }
            break;

          case 'round_reset':
            setRoom((prev) => (prev ? { ...prev, status: 'voting' } : null));
            setRevealedVotes(null);
            setStats(null);
            setParticipants((prev) =>
              prev.map((p) => ({ ...p, has_voted: false, card: undefined }))
            );
            break;

          case 'backlog_updated':
            setStories(data.stories);
            if (data.current_story_id) {
              const active = data.stories.find((s) => s.id === data.current_story_id);
              setCurrentStory(active || null);
            } else {
              setCurrentStory(null);
            }
            break;

          case 'deck_updated':
            setRoom((prev) => (prev ? { ...prev, deck_type: data.deck_type } : null));
            setCards(data.cards);
            break;

          case 'timer_updated':
            setTimer({
              isRunning: data.timer_is_running,
              secondsRemaining: data.timer_seconds_remaining,
              endsAt: data.timer_ends_at,
            });
            break;

          case 'reaction_received': {
            const newReaction: FloatingReaction = {
              id: `${Date.now()}_${Math.random()}`,
              name: data.participant_name,
              emoji: data.emoji,
              x: 20 + Math.random() * 60, // percentage from left
            };
            setReactions((prev) => [...prev, newReaction]);
            setTimeout(() => {
              setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
            }, 2500);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // Reconnect attempt after 2 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectRef.current();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WS error:', err);
    };
  }, [roomId, participantId, name, avatar, role, facilitatorToken, sendMessage]);

  useEffect(() => {
    connectRef.current = connect;
    connect();
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Live timer tick countdown
  useEffect(() => {
    if (!timer.isRunning || !timer.endsAt) {
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const endsAtMs = timer.endsAt! > 1e11 ? timer.endsAt! : timer.endsAt! * 1000;
      const diff = Math.max(0, Math.ceil((endsAtMs - now) / 1000));
      setTimer((prev) => {
        if (!prev.isRunning) return prev;
        if (diff <= 0) {
          if (prev.secondsRemaining === 0 && !prev.isRunning) return prev;
          soundPlayer.playAlarm(5);
          return { ...prev, isRunning: false, secondsRemaining: 0, endsAt: null };
        }
        if (prev.secondsRemaining === diff) return prev;
        return { ...prev, secondsRemaining: diff };
      });
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.endsAt]);

  // Actions
  const castVote = useCallback(
    (card_value: string) => {
      sendMessage({ type: 'vote', card_value });
      // Optimistically update own card
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId ? { ...p, has_voted: true, card: card_value } : p
        )
      );
    },
    [sendMessage, participantId]
  );

  const retractVote = useCallback(() => {
    sendMessage({ type: 'retract_vote' });
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId ? { ...p, has_voted: false, card: undefined } : p
      )
    );
  }, [sendMessage, participantId]);

  const revealCards = useCallback(() => {
    sendMessage({ type: 'reveal_cards' });
  }, [sendMessage]);

  const resetRound = useCallback(() => {
    sendMessage({ type: 'reset_round' });
  }, [sendMessage]);

  const addStory = useCallback(
    (title: string, description?: string) => {
      sendMessage({
        type: 'add_story',
        title: title.trim(),
        description: description?.trim() || null,
      });
    },
    [sendMessage]
  );

  const selectStory = useCallback(
    (story_id: string) => {
      sendMessage({ type: 'select_story', story_id });
    },
    [sendMessage]
  );

  const saveStoryScore = useCallback(
    (story_id: string, score: string) => {
      sendMessage({ type: 'save_story_score', story_id, score });
    },
    [sendMessage]
  );

  const changeDeck = useCallback(
    (deck_type: string, custom_cards?: string[]) => {
      sendMessage({ type: 'change_deck', deck_type, custom_cards });
    },
    [sendMessage]
  );

  const timerAction = useCallback(
    (action: 'start' | 'pause' | 'reset' | 'add_seconds', duration_seconds?: number) => {
      if (action === 'reset' || action === 'add_seconds' || action === 'start') {
        soundPlayer.stop();
      }
      sendMessage({ type: 'timer_action', action, duration_seconds });
    },
    [sendMessage]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      sendMessage({ type: 'reaction', emoji });
    },
    [sendMessage]
  );

  return {
    isConnected,
    room,
    stories,
    currentStory,
    participants,
    cards,
    revealedVotes,
    stats,
    timer,
    reactions,
    castVote,
    retractVote,
    revealCards,
    resetRound,
    addStory,
    selectStory,
    saveStoryScore,
    changeDeck,
    timerAction,
    sendReaction,
  };
}
