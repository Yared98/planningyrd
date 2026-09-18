import { useState, useEffect } from 'react';
import './i18n';
import { usePlanningSocket } from './hooks/usePlanningSocket';
import { Header } from './components/Header';
import { PokerTable } from './components/PokerTable';
import { VotingDeck } from './components/VotingDeck';
import { FacilitatorControls } from './components/FacilitatorControls';
import { BacklogDrawer } from './components/BacklogDrawer';
import { ExportModal } from './components/ExportModal';
import { LandingPage } from './components/LandingPage';
import type { ParticipantRole } from './types';
import { initAnalytics, trackPageView } from './utils/analytics';
import { saveRecentRoom } from './utils/recentRooms';

export function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  // Read URL query parameter for room
  const [urlRoomId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('room');
  });

  // Active user session state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (activeRoomId) {
      trackPageView('/room', 'PlanningYrd — Sala de Votação');
    } else {
      trackPageView('/', 'PlanningYrd — Início');
    }
  }, [activeRoomId]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('planningyrd_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('planningyrd_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [participantId] = useState<string>(() => {
    let pid = localStorage.getItem('planningyrd_participant_id');
    if (!pid) {
      pid = `usr_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('planningyrd_participant_id', pid);
    }
    return pid;
  });

  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('🦊');
  const [userRole, setUserRole] = useState<ParticipantRole>('estimator');
  const [facilitatorToken, setFacilitatorToken] = useState<string | null>(null);

  // Modals / Drawers state
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleJoinRoom = (
    roomId: string,
    name: string,
    avatar: string,
    role: ParticipantRole,
    token?: string
  ) => {
    setActiveRoomId(roomId);
    setUserName(name);
    setUserAvatar(avatar);
    setUserRole(role);
    if (token) setFacilitatorToken(token);

    // Update URL without full refresh
    const newUrl = `${window.location.pathname}?room=${roomId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  // WebSocket connection when activeRoomId is set
  const socket = usePlanningSocket({
    roomId: activeRoomId || '',
    participantId,
    name: userName,
    avatar: userAvatar,
    role: userRole,
    facilitatorToken,
  });

  const me = socket.participants.find((p) => p.id === participantId) || {
    id: participantId,
    name: userName,
    avatar: userAvatar,
    role: userRole,
    is_facilitator: !!facilitatorToken,
    has_voted: false,
  };

  const isFacilitator = me.is_facilitator;
  const currentRoom = socket.room || {
    id: activeRoomId || '',
    name: 'Carregando...',
    deck_type: 'fibonacci',
    status: 'voting',
    auto_reveal: false,
    show_average: true,
    timer_seconds_remaining: 0,
    timer_is_running: false,
    created_at: 0,
  };

  useEffect(() => {
    if (activeRoomId && socket.room && socket.room.id) {
      saveRecentRoom({
        id: socket.room.id,
        name: socket.room.name,
        facilitatorToken: facilitatorToken || undefined,
        role: userRole === 'spectator' ? 'spectator' : (isFacilitator ? 'facilitator' : 'estimator'),
      });
    }
  }, [activeRoomId, socket.room, facilitatorToken, userRole, isFacilitator]);

  if (!activeRoomId) {
    return (
      <LandingPage
        initialRoomId={urlRoomId}
        onJoinRoom={handleJoinRoom}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const handleNextStory = () => {
    const pendingStories = socket.stories.filter((s) => s.status === 'pending');
    if (pendingStories.length > 0) {
      socket.selectStory(pendingStories[0].id);
    } else {
      socket.resetRound();
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Header
        room={currentRoom}
        currentStory={socket.currentStory}
        me={me}
        timer={socket.timer}
        onOpenBacklog={() => setIsBacklogOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onSendReaction={socket.sendReaction}
        onLeaveRoom={handleLeaveRoom}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Stage & Poker Table */}
      <main className="main-stage">
        <PokerTable
          room={currentRoom}
          participants={socket.participants}
          currentStory={socket.currentStory}
          stats={socket.stats}
          deckCards={socket.cards}
          isFacilitator={isFacilitator}
          onConfirmScore={socket.saveStoryScore}
        />
      </main>

      {/* Facilitator Controls Floating Bar */}
      {isFacilitator && (
        <FacilitatorControls
          roomStatus={currentRoom.status}
          hasStories={socket.stories.length > 0}
          timerIsRunning={socket.timer.isRunning}
          onRevealCards={socket.revealCards}
          onResetRound={socket.resetRound}
          onNextStory={handleNextStory}
          onTimerAction={socket.timerAction}
          onChangeDeck={socket.changeDeck}
        />
      )}

      {/* Bottom Deck for card selection */}
      <VotingDeck
        cards={socket.cards}
        selectedCard={me.card}
        role={userRole}
        roomStatus={currentRoom.status}
        onSelectCard={socket.castVote}
        onRetractVote={socket.retractVote}
      />

      {/* Backlog Slide-over Drawer */}
      <BacklogDrawer
        isOpen={isBacklogOpen}
        stories={socket.stories}
        currentStoryId={socket.currentStory?.id}
        onClose={() => setIsBacklogOpen(false)}
        onAddStory={socket.addStory}
        onSelectStory={socket.selectStory}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        room={currentRoom}
        stories={socket.stories}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Floating Reactions Layer */}
      {socket.reactions.map((r) => (
        <div
          key={r.id}
          className="floating-reaction"
          style={{
            left: `${r.x}%`,
            bottom: '120px',
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}

export default App;
