import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Check,
  Moon,
  Sun,
  Globe,
  FileSpreadsheet,
  ListTodo,
  Smile,
  LogOut,
  Clock,
  Layers,
  Bot,
} from 'lucide-react';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpModal } from './McpModal';
import { GithubIcon } from './Footer';
import type { Participant, Room, Story } from '../types';

interface HeaderProps {
  room: Room;
  currentStory: Story | null;
  me: Participant | null;
  timer: { isRunning: boolean; secondsRemaining: number; endsAt?: number | null };
  onOpenBacklog: () => void;
  onOpenExport: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveRoom: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  currentStory,
  me,
  timer,
  onOpenBacklog,
  onOpenExport,
  onSendReaction,
  onLeaveRoom,
  theme: propTheme,
  onToggleTheme,
}) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [localTheme, setLocalTheme] = useState<'dark' | 'light'>('dark');
  const theme = propTheme || localTheme;
  const [showReactions, setShowReactions] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);

  const toggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = localTheme === 'dark' ? 'light' : 'dark';
      setLocalTheme(next);
      document.documentElement.setAttribute('data-theme', next);
    }
  };

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('pt') ? 'en' : 'pt';
    i18n.changeLanguage(next);
  };

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname + `?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const quickEmojis = ['🎉', '🚀', '🤔', '☕', '👍', '🔥', '❤️', '💯'];

  return (
    <>
      <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">
          <div className="brand-icon-box">
            <Layers size={18} />
          </div>
          <span>PlanningYrd</span>
        </div>

        <EcosystemSwitcher currentApp="planning" />

        <div className="room-title-badge">
          <span style={{ color: 'var(--text-muted)' }}>{t('nav.code')}:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
            {room.id.substring(0, 8)}...
          </span>
          <button
            onClick={handleCopyLink}
            className="btn-icon"
            style={{ width: 26, height: 26 }}
            title={t('nav.copyLink')}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          </button>
        </div>

        {currentStory && (
          <div
            className="room-title-badge"
            style={{ background: 'var(--color-primary-subtle)', borderColor: 'var(--border-primary)' }}
          >
            <span style={{ color: 'var(--color-primary)' }}>📌 {currentStory.title}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {timer.isRunning && (
          <div className="timer-pill running">
            <Clock size={15} />
            <span>{formatTimer(timer.secondsRemaining)}</span>
          </div>
        )}

        {/* Reaction trigger */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowReactions(!showReactions)}
            title="Enviar Reação"
          >
            <Smile size={18} />
          </button>

          {showReactions && (
            <div
              style={{
                position: 'absolute',
                top: 45,
                right: 0,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.5rem',
                display: 'flex',
                gap: '0.4rem',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
              }}
            >
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowReactions(false);
                  }}
                  style={{
                    fontSize: '1.25rem',
                    padding: '4px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn-icon" onClick={onOpenBacklog} title={t('backlog.drawerTitle')}>
          <ListTodo size={18} />
        </button>

        <button className="btn-icon" onClick={onOpenExport} title={t('nav.export')}>
          <FileSpreadsheet size={18} />
        </button>

        {/* Botão MCP Padronizado */}
        <button
          onClick={() => setShowMcpModal(true)}
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
            border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
            color: 'var(--color-primary)',
            cursor: 'pointer',
          }}
          title={t('mcp.button_title', 'Configurar Servidor MCP (IA)')}
        >
          <Bot size={13} />
          <span>MCP</span>
        </button>

        <button className="btn-icon" onClick={toggleLanguage} title={t('nav.language')}>
          <Globe size={18} />
        </button>

        <button className="btn-icon" onClick={toggleTheme} title={t('nav.themeToggle')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {me && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            <span>{me.avatar}</span>
            <span>{me.name}</span>
          </div>
        )}

        <a
          href="https://github.com/Yared98/planningyrd"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-icon"
          style={{ textDecoration: 'none', color: 'inherit' }}
          title={t('footer.github_title', 'Ver código-fonte do PlanningYrd no GitHub')}
          aria-label="GitHub"
        >
          <GithubIcon size={16} />
        </a>

        <button
          className="btn-icon"
          onClick={onLeaveRoom}
          title={t('nav.leaveRoom')}
          style={{ color: 'var(--color-danger)' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>

    {/* Modal MCP */}
    <McpModal
      isOpen={showMcpModal}
      onClose={() => setShowMcpModal(false)}
      roomId={room.id}
      isFacilitator={me?.is_facilitator}
    />
  </>
);
};
