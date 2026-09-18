import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, TrendingUp, Users } from 'lucide-react';
import type { ConsensusStats, Story } from '../types';

interface RevealAnalyticsProps {
  stats: ConsensusStats;
  currentStory: Story | null;
  isFacilitator: boolean;
  deckCards: string[];
  onConfirmScore: (storyId: string, score: string) => void;
}

export const RevealAnalytics: React.FC<RevealAnalyticsProps> = ({
  stats,
  currentStory,
  isFacilitator,
  deckCards,
  onConfirmScore,
}) => {
  const { t } = useTranslation();
  const initialScore = stats.mode[0] || (stats.median ? String(stats.median) : deckCards[0]);
  const [selectedScore, setSelectedScore] = useState<string>(initialScore);

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
    <div className="analytics-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--color-primary)" />
          {t('analytics.title')}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {stats.total_votes} {stats.total_votes === 1 ? 'voto' : 'votos'}
        </span>
      </div>

      <div className={`consensus-banner ${getConsensusClass()}`}>{getConsensusText()}</div>

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

      {/* Divergence discussion prompt */}
      {!stats.unanimous && stats.lowest_vote && stats.highest_vote && stats.lowest_vote !== stats.highest_vote && (
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            margin: '0.75rem 0',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-warning)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={14} />
            {t('analytics.divergentPrompt')}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            • {t('analytics.lowestVoter', { val: stats.lowest_vote, voters: stats.lowest_voters.join(', ') })}
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            • {t('analytics.highestVoter', { val: stats.highest_vote, voters: stats.highest_voters.join(', ') })}
          </div>
        </div>
      )}

      {/* Facilitator score acceptance */}
      {isFacilitator && currentStory && (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {t('analytics.confirmScoreTitle')}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
              flexWrap: 'wrap',
              marginBottom: '0.75rem',
            }}
          >
            {deckCards.filter((c) => c !== '?' && c !== '☕').map((c) => (
              <button
                key={c}
                onClick={() => setSelectedScore(c)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: selectedScore === c ? 'var(--color-primary)' : 'var(--border-subtle)',
                  background: selectedScore === c ? 'var(--color-primary)' : 'var(--bg-subtle)',
                  color: selectedScore === c ? '#fff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => onConfirmScore(currentStory.id, selectedScore)}
          >
            <CheckCircle2 size={16} />
            {t('analytics.confirmScoreButton')} ({selectedScore})
          </button>
        </div>
      )}
    </div>
  );
};
