import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, TrendingUp, Users, Eye, X, BarChart3 } from 'lucide-react';
import type { ConsensusStats, Story, Participant } from '../types';

interface RevealAnalyticsProps {
  stats: ConsensusStats;
  currentStory: Story | null;
  isFacilitator: boolean;
  deckCards: string[];
  onConfirmScore: (storyId: string, score: string) => void;
  participants?: Participant[];
}

export const RevealAnalytics: React.FC<RevealAnalyticsProps> = ({
  stats,
  currentStory,
  isFacilitator,
  deckCards,
  onConfirmScore,
  participants = [],
}) => {
  const { t } = useTranslation();
  const initialScore = stats.mode[0] || (stats.median ? String(stats.median) : deckCards[0]);
  const [selectedScore, setSelectedScore] = useState<string>(initialScore);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setSelectedScore(stats.mode[0] || (stats.median ? String(stats.median) : deckCards[0]));
  }, [stats, deckCards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const estimators = participants.filter((p) => p.role === 'estimator');

  const getConsensusClass = () => {
    if (stats.unanimous) return 'unanimous';
    if (stats.agreement_percentage >= 70) return 'high';
    return 'divergent';
  };

  const getConsensusText = () => {
    if (stats.unanimous) return t('analytics.unanimous');
    if (stats.agreement_percentage >= 70)
      return t('analytics.highConsensus', { pct: stats.agreement_percentage });
    return t('analytics.divergent', { pct: stats.agreement_percentage });
  };

  return (
    <>
      {/* Centro da Mesa: Widget Compacto (Não sobrepõe participantes nem cartas) */}
      <div className="analytics-compact-hub">
        <div className={`compact-consensus-badge ${getConsensusClass()}`}>
          <span>{stats.unanimous ? '🎉' : stats.agreement_percentage >= 70 ? '⚡' : '⚠️'}</span>
          <span>{getConsensusText()}</span>
        </div>

        <div className="compact-metrics-row">
          {stats.average !== null && stats.average !== undefined && (
            <span className="compact-metric">
              <span className="metric-label">{t('analytics.average')}:</span>
              <span className="metric-val">{stats.average}</span>
            </span>
          )}
          {stats.median !== null && stats.median !== undefined && (
            <span className="compact-metric">
              <span className="metric-label">{t('analytics.median')}:</span>
              <span className="metric-val">{stats.median}</span>
            </span>
          )}
          {stats.mode.length > 0 && (
            <span className="compact-metric">
              <span className="metric-label">{t('analytics.mode')}:</span>
              <span className="metric-val">{stats.mode.join(', ')}</span>
            </span>
          )}
        </div>

        <div className="compact-hub-actions">
          {isFacilitator && currentStory && (
            <button
              className="btn-primary btn-sm"
              onClick={() => onConfirmScore(currentStory.id, selectedScore)}
              title={t('analytics.quickConfirm', { val: selectedScore })}
            >
              <CheckCircle2 size={14} />
              <span>{t('analytics.quickConfirm', { val: selectedScore })}</span>
            </button>
          )}

          <button
            className="btn-secondary btn-sm"
            onClick={() => setIsModalOpen(true)}
            title={t('analytics.detailsButton')}
          >
            <BarChart3 size={14} />
            <span>{t('analytics.detailsButton')}</span>
          </button>
        </div>
      </div>

      {/* Modal Completo de Estatísticas & Votos (Abre apenas sob demanda) */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="analytics-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="analytics-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="analytics-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                  }}
                >
                  <TrendingUp size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    {t('analytics.title')}
                  </h3>
                  {currentStory && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                      📌 {currentStory.title}
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn-icon"
                onClick={() => setIsModalOpen(false)}
                title={t('analytics.closeModal')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="analytics-modal-body">
              <div className={`consensus-banner ${getConsensusClass()}`}>
                <span>{stats.unanimous ? '🎉' : stats.agreement_percentage >= 70 ? '⚡' : '⚠️'}</span>
                <span>{getConsensusText()}</span>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-label">{t('analytics.average')}</div>
                  <div className="stat-value">{stats.average !== null && stats.average !== undefined ? stats.average : '-'}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">{t('analytics.median')}</div>
                  <div className="stat-value">{stats.median !== null && stats.median !== undefined ? stats.median : '-'}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">{t('analytics.mode')}</div>
                  <div className="stat-value">{stats.mode.length > 0 ? stats.mode.join(', ') : '-'}</div>
                </div>
              </div>

              {/* Lista dos Votos Individuais de cada Participante */}
              {estimators.length > 0 && (
                <div className="voters-breakdown-box">
                  <div className="voters-breakdown-title">
                    <Users size={14} />
                    <span>{t('analytics.participantVotes')} ({stats.total_votes})</span>
                  </div>
                  <div className="voters-chip-grid">
                    {estimators.map((p) => (
                      <div key={p.id} className="voter-chip-card">
                        <span className="voter-avatar">{p.avatar}</span>
                        <span className="voter-name" title={p.name}>{p.name}</span>
                        <span className="voter-val">{p.card || '?'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt de Divergência se aplicável */}
              {!stats.unanimous && stats.lowest_vote && stats.highest_vote && stats.lowest_vote !== stats.highest_vote && (
                <div className="divergence-box">
                  <div className="divergence-title">
                    <Users size={14} />
                    {t('analytics.divergentPrompt')}
                  </div>
                  <div className="divergence-item">
                    • {t('analytics.lowestVoter', { val: stats.lowest_vote, voters: stats.lowest_voters.join(', ') })}
                  </div>
                  <div className="divergence-item">
                    • {t('analytics.highestVoter', { val: stats.highest_vote, voters: stats.highest_voters.join(', ') })}
                  </div>
                </div>
              )}

              {/* Facilitador: Seleção e Confirmação de Nota */}
              {isFacilitator && currentStory && (
                <div className="facilitator-score-confirm-section">
                  <div className="confirm-section-title">
                    {t('analytics.confirmScoreTitle')}
                  </div>

                  <div className="deck-card-picker-row">
                    {deckCards.filter((c) => c !== '?' && c !== '☕').map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedScore(c)}
                        className={`deck-score-pill ${selectedScore === c ? 'is-selected' : ''}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      onConfirmScore(currentStory.id, selectedScore);
                      setIsModalOpen(false);
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {t('analytics.confirmScoreButton')} ({selectedScore})
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="analytics-modal-footer">
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setIsModalOpen(false)}
              >
                <Eye size={15} />
                <span>{t('analytics.closeModal')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
