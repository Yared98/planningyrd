import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  RotateCcw,
  SkipForward,
  Clock,
  Pause,
  Sliders,
} from 'lucide-react';
import type { RoomStatus } from '../types';

interface FacilitatorControlsProps {
  roomStatus: RoomStatus;
  hasStories: boolean;
  timerIsRunning: boolean;
  onRevealCards: () => void;
  onResetRound: () => void;
  onNextStory: () => void;
  onTimerAction: (action: 'start' | 'pause' | 'reset', durationSeconds?: number) => void;
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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
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

        {/* Timer Control */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            title={t('facilitator.timer')}
          >
            <Clock size={16} />
            {timerIsRunning ? t('facilitator.timerPause') : t('facilitator.timerStart')}
          </button>

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
                minWidth: '130px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onTimerAction('start', 60);
                  setShowTimerMenu(false);
                }}
              >
                1 min
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onTimerAction('start', 120);
                  setShowTimerMenu(false);
                }}
              >
                2 min
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onTimerAction('start', 180);
                  setShowTimerMenu(false);
                }}
              >
                3 min
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                onClick={() => {
                  onTimerAction('start', 300);
                  setShowTimerMenu(false);
                }}
              >
                5 min
              </button>
              {timerIsRunning ? (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                  onClick={() => {
                    onTimerAction('pause');
                    setShowTimerMenu(false);
                  }}
                >
                  <Pause size={12} />
                  {t('facilitator.timerPause')}
                </button>
              ) : (
                <button
                  className="btn-danger"
                  style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
                  onClick={() => {
                    onTimerAction('reset');
                    setShowTimerMenu(false);
                  }}
                >
                  <RotateCcw size={12} />
                  {t('facilitator.timerReset')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Change Deck */}
        <div style={{ position: 'relative' }}>
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
