import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Play, CheckCircle2 } from 'lucide-react';
import type { Story } from '../types';

interface BacklogDrawerProps {
  isOpen: boolean;
  stories: Story[];
  currentStoryId?: string | null;
  onClose: () => void;
  onAddStory: (title: string, description?: string) => void;
  onSelectStory: (storyId: string) => void;
}

export const BacklogDrawer: React.FC<BacklogDrawerProps> = ({
  isOpen,
  stories,
  currentStoryId,
  onClose,
  onAddStory,
  onSelectStory,
}) => {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddStory(title.trim(), description.trim() || undefined);
    setTitle('');
    setDescription('');
    setShowAddForm(false);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              {t('backlog.drawerTitle')}
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}
            >
              {stories.length}
            </span>
          </div>

          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Add Story Button or Form */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          {!showAddForm ? (
            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} />
              {t('backlog.addStoryButton')}
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder={t('backlog.newStoryTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
              <textarea
                placeholder={t('backlog.newStoryDescPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  {t('backlog.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('backlog.submitStory')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Story List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
              {t('backlog.emptyBacklog')}
            </div>
          ) : (
            stories.map((story, idx) => {
              const isActive = story.id === currentStoryId;
              const isEstimated = story.status === 'estimated';

              return (
                <div
                  key={story.id}
                  style={{
                    background: isActive ? 'var(--color-primary-subtle)' : 'var(--bg-surface-elevated)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--border-primary)' : 'var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.875rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      #{idx + 1}
                    </span>

                    {isEstimated ? (
                      <span
                        style={{
                          background: 'var(--color-success-bg)',
                          border: '1px solid var(--color-success-border)',
                          color: 'var(--color-success)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        {story.final_score} {t('backlog.points')}
                      </span>
                    ) : isActive ? (
                      <span
                        style={{
                          background: 'var(--color-primary)',
                          color: '#fff',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t('backlog.statusActive')}
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-dim)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        {t('backlog.statusPending')}
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                    {story.title}
                  </div>

                  {story.description && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {story.description}
                    </div>
                  )}

                  {!isActive && (
                    <button
                      className="btn-secondary"
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        marginTop: '0.25rem',
                      }}
                      onClick={() => onSelectStory(story.id)}
                    >
                      <Play size={11} />
                      {t('backlog.selectToEstimate')}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
