import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Eye } from 'lucide-react';
import type { ParticipantRole, RoomStatus } from '../types';

interface VotingDeckProps {
  cards: string[];
  selectedCard?: string;
  role: ParticipantRole;
  roomStatus: RoomStatus;
  onSelectCard: (val: string) => void;
  onRetractVote: () => void;
}

export const VotingDeck: React.FC<VotingDeckProps> = ({
  cards,
  selectedCard,
  role,
  roomStatus,
  onSelectCard,
  onRetractVote,
}) => {
  const { t } = useTranslation();
  const isSpectator = role === 'spectator';
  const isRevealed = roomStatus === 'revealed';

  if (isSpectator) {
    return (
      <div className="bottom-dock">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            background: 'var(--bg-subtle)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <Eye size={16} />
          {t('deck.spectatorNotice')}
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-dock">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1080px',
        }}
      >
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {isRevealed ? t('deck.waitingNextRound') : t('deck.chooseCardPrompt')}
        </span>

        {selectedCard && !isRevealed && (
          <button
            onClick={onRetractVote}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-danger)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 8px',
            }}
          >
            <RotateCcw size={12} />
            {t('deck.retractVote')}
          </button>
        )}
      </div>

      <div className="deck-cards-row">
        {cards.map((cardVal) => {
          const isSelected = selectedCard === cardVal;
          return (
            <button
              key={cardVal}
              className={`deck-card-btn ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectCard(cardVal)}
              disabled={isRevealed}
              title={`Votar ${cardVal}`}
            >
              <span style={{ fontSize: '0.625rem', alignSelf: 'flex-start', lineHeight: 1 }}>
                {cardVal}
              </span>
              <span style={{ alignSelf: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                {cardVal}
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  alignSelf: 'flex-end',
                  lineHeight: 1,
                  transform: 'rotate(180deg)',
                }}
              >
                {cardVal}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
