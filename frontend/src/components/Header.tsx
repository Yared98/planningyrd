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
import { copyToClipboard } from '../utils/clipboard';
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

  const handleCopyLink = async () => {
    const url = window.location.origin + window.location.pathname + `?room=${room.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
      <div className="header-left" style={{ gap: '0.65rem' }}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onLeaveRoom();
          }}
          className="brand-logo"
          title="PlanningYrd - Início"
          aria-label="PlanningYrd Home"
        >
          <div className="brand-icon-box">
            <Layers size={18} />
          </div>
          <span className="brand-title">
            Planning<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
          </span>
        </a>

        <EcosystemSwitcher currentApp="planning" />

        <div className="room-title-badge">
          <span style={{ color: 'var(--text-muted)' }}>{t('nav.code')}:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
            {room.id.substring(0, 6)}...
          </span>
          <button
            onClick={handleCopyLink}
            className="btn-icon"
            style={{ width: 24, height: 24, padding: 0 }}
            title={t('nav.copyLink')}
          >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
          </button>
        </div>

        {me?.is_facilitator && (
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid var(--border-primary, rgba(99, 102, 241, 0.35))',
              color: 'var(--color-primary)',
              flexShrink: 0,
              cursor: 'help',
            }}
            title={t('nav.facilitatorTooltip', 'Você é o Facilitador desta sessão')}
          >
            {t('nav.facilitator', 'FAC')}
          </span>
        )}
      </div>

      <div className="header-right" style={{ gap: '0.4rem' }}>
        {me && (
          <div
            className="header-btn-text"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span>{me.avatar}</span>
            <span>{me.name}</span>
          </div>
        )}

        {/* Botão MCP Padronizado */}
        <button
          onClick={() => setShowMcpModal(true)}
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.6rem',
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

        <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={toggleLanguage} title={t('nav.language')}>
          <Globe size={15} />
        </button>

        <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={toggleTheme} title={t('nav.themeToggle')}>
          {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="var(--color-primary)" />}
        </button>

        <button
          className="btn-icon"
          onClick={onLeaveRoom}
          title={t('nav.leaveRoom')}
          style={{ width: 32, height: 32, color: 'var(--color-danger)' }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>

    {/* In-Session Sub-Header for Active Story, Timer & Poker Tools */}
    <div className="session-sub-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        <div
          className="room-title-badge"
          style={{
            background: currentStory ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
            borderColor: currentStory ? 'var(--border-primary)' : 'var(--border-subtle)',
            maxWidth: '240px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.78rem',
            padding: '0.25rem 0.65rem',
          }}
          title={currentStory ? currentStory.title : undefined}
        >
          <span style={{ color: currentStory ? 'var(--color-primary)' : 'var(--text-muted)' }}>
            {currentStory ? `📌 ${currentStory.title}` : 'Sem história selecionada'}
          </span>
        </div>

        {timer.isRunning && (
          <div className="timer-pill running" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
            <Clock size={13} />
            <span>{formatTimer(timer.secondsRemaining)}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {/* Reaction trigger */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            style={{ width: 30, height: 30 }}
            onClick={() => setShowReactions(!showReactions)}
            title="Enviar Reação"
          >
            <Smile size={16} />
          </button>

          {showReactions && (
            <div
              style={{
                position: 'absolute',
                top: 38,
                right: 0,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.4rem',
                display: 'flex',
                gap: '0.35rem',
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
                    fontSize: '1.15rem',
                    padding: '3px',
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

        <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={onOpenBacklog} title={t('backlog.drawerTitle')}>
          <ListTodo size={16} />
        </button>

        <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={onOpenExport} title={t('nav.export')}>
          <FileSpreadsheet size={16} />
        </button>
      </div>
    </div>

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
