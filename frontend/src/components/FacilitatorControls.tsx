import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  RotateCcw,
  SkipForward,
  Clock,
  Pause,
  Sliders,
  ChevronDown,
  Volume2,
  VolumeX,
  Plus,
} from 'lucide-react';
import { soundPlayer } from '../utils/sound';
import type { RoomStatus } from '../types';

interface FacilitatorControlsProps {
  roomStatus: RoomStatus;
  hasStories: boolean;
  timerIsRunning: boolean;
  onRevealCards: () => void;
  onResetRound: () => void;
  onNextStory: () => void;
  onTimerAction: (action: 'start' | 'pause' | 'reset' | 'add_seconds', durationSeconds?: number) => void;
  onChangeDeck: (deckType: string) => void;
}

export const FacilitatorControls: React.FC<FacilitatorControlsProps> = ({
  roomStatus,
  hasStories,
  timerIsRunning,
  onRevealCards,
  onResetRound,
  onNextStory,
  onTimerAction,
  onChangeDeck,
}) => {
  const { t } = useTranslation();
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showDeckMenu, setShowDeckMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(soundPlayer.isMuted);
  const timerMenuRef = useRef<HTMLDivElement>(null);
  const deckMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setShowTimerMenu(false);
      }
      if (deckMenuRef.current && !deckMenuRef.current.contains(e.target as Node)) {
        setShowDeckMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleMute = () => {
    const next = soundPlayer.toggleMute();
    setIsMuted(next);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0.4rem 1rem',
        width: '100%',
        zIndex: 35,
      }}
    >
      <div className="facilitator-bar">
        {roomStatus === 'voting' ? (
          <button className="btn-primary" onClick={onRevealCards}>
            <Eye size={16} />
            {t('facilitator.revealButton')}
          </button>
        ) : (
          <button className="btn-primary" onClick={onResetRound}>
            <RotateCcw size={16} />
            {t('facilitator.resetButton')}
          </button>
        )}

        {hasStories && (
          <button className="btn-secondary" onClick={onNextStory}>
            <SkipForward size={16} />
            {t('facilitator.nextStoryButton')}
          </button>
        )}

        {/* Timer Control Group */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={timerMenuRef}>
          <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              className={timerIsRunning ? 'btn-danger' : 'btn-secondary'}
              onClick={() => onTimerAction(timerIsRunning ? 'pause' : 'start')}
              title={timerIsRunning ? t('facilitator.timerPause') : t('facilitator.timerStart')}
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            >
              {timerIsRunning ? <Pause size={16} /> : <Clock size={16} />}
              <span>{timerIsRunning ? t('facilitator.timerPause') : t('facilitator.timerStart')}</span>
            </button>
            <button
              className={timerIsRunning ? 'btn-danger' : 'btn-secondary'}
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              title={t('facilitator.timer')}
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
                padding: '0 0.4rem',
              }}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {showTimerMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '48px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                minWidth: '150px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.3rem 0.4rem' }}
                  onClick={() => {
                    onTimerAction('start', 60);
                    setShowTimerMenu(false);
                  }}
                >
                  1 min
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.3rem 0.4rem' }}
                  onClick={() => {
                    onTimerAction('start', 120);
                    setShowTimerMenu(false);
                  }}
                >
                  2 min
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.3rem 0.4rem' }}
                  onClick={() => {
                    onTimerAction('start', 180);
                    setShowTimerMenu(false);
                  }}
                >
                  3 min
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.3rem 0.4rem' }}
                  onClick={() => {
                    onTimerAction('start', 300);
                    setShowTimerMenu(false);
                  }}
                >
                  5 min
                </button>
              </div>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', gap: '0.35rem' }}
                onClick={() => {
                  onTimerAction('add_seconds', 60);
                  setShowTimerMenu(false);
                }}
              >
                <Plus size={13} />
                <span>{t('facilitator.timerAddMinute')}</span>
              </button>

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.1rem 0' }} />

              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', gap: '0.35rem' }}
                onClick={handleToggleMute}
                title={isMuted ? t('facilitator.timerSoundMuted') : t('facilitator.timerSoundOn')}
              >
                {isMuted ? <VolumeX size={13} color="var(--color-danger)" /> : <Volume2 size={13} color="var(--color-success)" />}
                <span>{isMuted ? t('facilitator.timerSoundMuted') : t('facilitator.timerSoundOn')}</span>
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', gap: '0.35rem' }}
                onClick={() => soundPlayer.playAlarm(3)}
              >
                <Volume2 size={13} />
                <span>{t('facilitator.timerTestSound')}</span>
              </button>

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.1rem 0' }} />

              {timerIsRunning ? (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.75rem', justifyContent: 'flex-start', gap: '0.35rem' }}
                  onClick={() => {
                    onTimerAction('pause');
                    setShowTimerMenu(false);
                  }}
                >
                  <Pause size={12} />
                  <span>{t('facilitator.timerPause')}</span>
                </button>
              ) : (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.75rem', justifyContent: 'flex-start', gap: '0.35rem' }}
                  onClick={() => {
                    onTimerAction('reset');
                    setShowTimerMenu(false);
                  }}
                >
                  <RotateCcw size={12} />
                  <span>{t('facilitator.timerReset')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Change Deck */}
        <div style={{ position: 'relative' }} ref={deckMenuRef}>
          <button
            className="btn-icon"
            onClick={() => setShowDeckMenu(!showDeckMenu)}
            title={t('facilitator.settingsButton')}
          >
            <Sliders size={16} />
          </button>

          {showDeckMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '48px',
                right: 0,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                minWidth: '160px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '2px 6px' }}>
                Trocar Baralho
              </span>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onChangeDeck('fibonacci');
                  setShowDeckMenu(false);
                }}
              >
                Fibonacci
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onChangeDeck('modified_fibonacci');
                  setShowDeckMenu(false);
                }}
              >
                Fibonacci Modificado
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onChangeDeck('tshirt');
                  setShowDeckMenu(false);
                }}
              >
                T-Shirt Sizes
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onChangeDeck('powers_of_2');
                  setShowDeckMenu(false);
                }}
              >
                Potências de 2
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onChangeDeck('one_to_ten');
                  setShowDeckMenu(false);
                }}
              >
                1 a 10 (Sequencial)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
