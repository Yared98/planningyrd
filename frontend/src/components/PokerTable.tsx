import React from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Eye } from 'lucide-react';
import type { ConsensusStats, Participant, Room, Story } from '../types';
import { RevealAnalytics } from './RevealAnalytics';

interface PokerTableProps {
  room: Room;
  participants: Participant[];
  currentStory: Story | null;
  stats: ConsensusStats | null;
  deckCards: string[];
  isFacilitator: boolean;
  onConfirmScore: (storyId: string, score: string) => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  room,
  participants,
  currentStory,
  stats,
  deckCards,
  isFacilitator,
  onConfirmScore,
}) => {
  const { t } = useTranslation();
  const isRevealed = room.status === 'revealed';

  const estimators = participants.filter((p) => p.role === 'estimator');
  const votedEstimatorsCount = estimators.filter((p) => p.has_voted).length;
  const allVoted = estimators.length > 0 && votedEstimatorsCount === estimators.length;

  // Calculate coordinates on the perimeter of an oval table
  const getSeatStyle = (index: number, total: number) => {
    if (total === 0) return {};
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    // Oval radii as percentage
    const rx = 46;
    const ry = 42;
    const left = 50 + rx * Math.cos(angle);
    const top = 50 + ry * Math.sin(angle);
    return {
      left: `${left}%`,
      top: `${top}%`,
    };
  };

  return (
    <div className="poker-arena">
      <div className="poker-table">
        {/* Ring of participants */}
        <div className="participants-ring">
          {participants.map((p, idx) => {
            const seatStyle = getSeatStyle(idx, participants.length);
            const isEstimator = p.role === 'estimator';

            return (
              <div
                key={p.id}
                className={`seat-node ${p.has_voted ? 'has-voted' : ''}`}
                style={seatStyle}
              >
                <div className="avatar-badge-wrap">
                  <div className="participant-avatar">
                    <span>{p.avatar}</span>
                    {p.is_facilitator && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: 'var(--color-warning)',
                          color: '#000',
                          borderRadius: '50%',
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}
                        title={t('table.facilitator')}
                      >
                        <Crown size={11} />
                      </span>
                    )}

                    {isEstimator ? (
                      <span
                        className={`status-indicator-dot ${
                          p.has_voted ? 'status-dot-voted' : 'status-dot-thinking'
                        }`}
                      />
                    ) : (
                      <span
                        className="status-indicator-dot"
                        style={{ background: 'var(--text-dim)' }}
                        title={t('table.spectator')}
                      >
                        <Eye size={8} color="#fff" style={{ display: 'block', margin: '1px auto' }} />
                      </span>
                    )}
                  </div>
                </div>

                <span className="participant-name-tag">{p.name}</span>

                {/* 3D Poker Card for Estimators */}
                {isEstimator && (
                  <div className="card-seat-slot">
                    {p.has_voted || isRevealed ? (
                      <div className={`poker-card-3d ${isRevealed ? 'is-revealed' : ''}`}>
                        {/* Costas da carta (Face-down) */}
                        <div className="card-face card-face-down">
                          <span className="card-face-down-logo">🃏</span>
                        </div>

                        {/* Frente da carta (Face-up) */}
                        <div className="card-face card-face-up">
                          <span className="card-mini-corner">{p.card || '?'}</span>
                          <span className="card-center-val">{p.card || '?'}</span>
                          <span
                            className="card-mini-corner"
                            style={{ alignSelf: 'flex-end', transform: 'rotate(180deg)' }}
                          >
                            {p.card || '?'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="card-placeholder-thinking" title={t('table.thinking')}>
                        💭
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Central Hub */}
        <div className="table-center-hub">
          {isRevealed && stats ? (
            <RevealAnalytics
              stats={stats}
              currentStory={currentStory}
              isFacilitator={isFacilitator}
              deckCards={deckCards}
              onConfirmScore={onConfirmScore}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {currentStory ? (
                <>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--color-primary)',
                      background: 'var(--color-primary-subtle)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {t('nav.activeStory')}
                  </span>
                  <h2
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      maxWidth: '400px',
                      lineHeight: 1.3,
                    }}
                  >
                    {currentStory.title}
                  </h2>
                  {currentStory.description && (
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        maxWidth: '380px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {currentStory.description}
                    </p>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                  {t('backlog.emptyBacklog')}
                </div>
              )}

              {/* Voting status counters */}
              {estimators.length > 0 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: allVoted ? 'var(--color-success)' : 'var(--text-main)',
                    }}
                  >
                    {votedEstimatorsCount} / {estimators.length}{' '}
                    {votedEstimatorsCount === 1 ? 'voto' : 'votos'}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {allVoted ? t('table.allVoted') : t('table.waitingVotes')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
