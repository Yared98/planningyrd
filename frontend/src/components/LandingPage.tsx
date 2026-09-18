import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Plus,
  ArrowRight,
  Eye,
  UserCheck,
  History,
  Shield,
  ExternalLink,
  Trash2,
  Share2,
  Check,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  Bot,
} from 'lucide-react';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { McpModal } from './McpModal';
import { Footer, GithubIcon } from './Footer';
import type { ParticipantRole } from '../types';
import { getRecentRooms, removeRecentRoom, saveRecentRoom, type RecentRoom } from '../utils/recentRooms';

interface LandingPageProps {
  initialRoomId?: string | null;
  onJoinRoom: (
    roomId: string,
    name: string,
    avatar: string,
    role: ParticipantRole,
    facilitatorToken?: string
  ) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🦅', '🦉', '🐼', '🚀', '⚡', '💎'];

export const LandingPage: React.FC<LandingPageProps> = ({
  initialRoomId,
  onJoinRoom,
  theme = 'dark',
  onToggleTheme,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    initialRoomId ? 'join' : 'create'
  );
  const [showMcpModal, setShowMcpModal] = useState(false);

  // Form states for Create
  const [createName, setCreateName] = useState('');
  const [deckType, setDeckType] = useState('fibonacci');
  const [autoReveal, setAutoReveal] = useState(false);
  const [creatorNickname, setCreatorNickname] = useState(
    localStorage.getItem('planningyrd_nickname') || ''
  );
  const [createAvatar, setCreateAvatar] = useState('🦊');

  // Form states for Join
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId || '');
  const [joinNickname, setJoinNickname] = useState(
    localStorage.getItem('planningyrd_nickname') || ''
  );
  const [joinAvatar, setJoinAvatar] = useState('🐺');
  const [joinRole, setJoinRole] = useState<ParticipantRole>('estimator');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(() => getRecentRooms());
  const [roomToDelete, setRoomToDelete] = useState<RecentRoom | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !creatorNickname.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          deck_type: deckType,
          auto_reveal: autoReveal,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao criar sala.');
      }

      const data = await res.json();
      localStorage.setItem('planningyrd_nickname', creatorNickname.trim());
      localStorage.setItem(`facilitator_${data.id}`, data.facilitator_token);

      saveRecentRoom({
        id: data.id,
        name: createName.trim(),
        facilitatorToken: data.facilitator_token,
        role: 'facilitator',
      });
      setRecentRooms(getRecentRooms());

      onJoinRoom(
        data.id,
        creatorNickname.trim(),
        createAvatar,
        'estimator',
        data.facilitator_token
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim() || !joinNickname.trim()) return;

    localStorage.setItem('planningyrd_nickname', joinNickname.trim());
    const storedToken = localStorage.getItem(`facilitator_${joinRoomId.trim()}`);

    saveRecentRoom({
      id: joinRoomId.trim(),
      name: joinRoomId.trim(),
      facilitatorToken: storedToken || undefined,
      role: joinRole,
    });
    setRecentRooms(getRecentRooms());

    onJoinRoom(
      joinRoomId.trim(),
      joinNickname.trim(),
      joinAvatar,
      joinRole,
      storedToken || undefined
    );
  };

  const handleDirectJoin = (room: RecentRoom) => {
    const nick = (creatorNickname || joinNickname || localStorage.getItem('planningyrd_nickname') || '').trim() || 'Participante';
    const avatar = createAvatar || joinAvatar || '🦊';
    onJoinRoom(
      room.id,
      nick,
      avatar,
      room.role === 'spectator' ? 'spectator' : 'estimator',
      room.facilitatorToken || undefined
    );
  };

  const handleCopyInvite = (roomId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedRoomId(roomId);
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  const handleRemoveRoom = (id: string) => {
    const updated = removeRecentRoom(id);
    setRecentRooms(updated);
  };

  const toggleLanguage = () => {
    const next = i18n.language.startsWith('en') ? 'pt' : 'en';
    i18n.changeLanguage(next);
  };

  const facilitatorRooms = recentRooms.filter((r) => r.role === 'facilitator' || r.facilitatorToken);
  const participantRooms = recentRooms.filter((r) => r.role !== 'facilitator' && !r.facilitatorToken);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'transparent',
        position: 'relative',
      }}
    >
      {/* Top Bar Controls — EcosystemSwitcher + Language + Theme + GitHub */}
      <div
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 10,
        }}
      >
        <EcosystemSwitcher currentApp="planning" />

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
            transition: 'all var(--transition-fast, 0.15s ease)',
          }}
          title={t('mcp.button_title', 'Configurar Servidor MCP (IA)')}
        >
          <Bot size={13} />
          <span>MCP</span>
        </button>

        {/* Alternador de Idioma */}
        <button
          onClick={toggleLanguage}
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            cursor: 'pointer',
          }}
          title={t('app.languageToggle', 'Alternar idioma')}
        >
          <Globe size={13} />
          <span>{i18n.language.startsWith('en') ? 'EN' : 'PT'}</span>
        </button>

        {/* Alternador de Tema */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--color-primary)" />}
          </button>
        )}

        {/* Link GitHub */}
        <a
          href="https://github.com/Yared98/planningyrd"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.35rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'var(--text-main)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
          title="Ver código-fonte do PlanningYrd no GitHub"
          aria-label="GitHub"
        >
          <GithubIcon size={14} />
        </a>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', marginBottom: '1rem' }}>
          <div className="brand-icon-box">
            <Layers size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            PlanningYrd
          </span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          {t('app.subtitle')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
          {t('app.tagline')}
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-2xl)',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
          }}
        >
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: activeTab === 'create' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'create' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            {t('lobby.createRoomTab')}
          </button>
          <button
            onClick={() => setActiveTab('join')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: activeTab === 'join' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'join' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            {t('lobby.joinRoomTab')}
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Create Room */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.roomNameLabel')}
              </label>
              <input
                type="text"
                placeholder={t('lobby.roomNamePlaceholder')}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.deckLabel')}
              </label>
              <select
                value={deckType}
                onChange={(e) => setDeckType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="fibonacci">{t('lobby.deckFibonacci')}</option>
                <option value="modified_fibonacci">{t('lobby.deckModified')}</option>
                <option value="tshirt">{t('lobby.deckTShirt')}</option>
                <option value="powers_of_2">{t('lobby.deckPowersOf2')}</option>
                <option value="one_to_ten">{t('lobby.deckOneToTen')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="autoRevealCheck"
                checked={autoReveal}
                onChange={(e) => setAutoReveal(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="autoRevealCheck" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                {t('lobby.autoRevealLabel')}
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.yourNameLabel')}
              </label>
              <input
                type="text"
                placeholder={t('lobby.yourNamePlaceholder')}
                value={creatorNickname}
                onChange={(e) => setCreatorNickname(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.chooseAvatar')}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => setCreateAvatar(av)}
                    style={{
                      fontSize: '1.25rem',
                      padding: '6px',
                      borderRadius: 'var(--radius-md)',
                      background: createAvatar === av ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                      border: '1px solid',
                      borderColor: createAvatar === av ? 'var(--color-primary)' : 'var(--border-subtle)',
                    }}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              <Plus size={18} />
              {isLoading ? 'Criando...' : t('lobby.createButton')}
            </button>
          </form>
        ) : (
          /* Tab 2: Join Room */
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.roomCodeLabel')}
              </label>
              <input
                type="text"
                placeholder={t('lobby.roomCodePlaceholder')}
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                required
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.yourNameLabel')}
              </label>
              <input
                type="text"
                placeholder={t('lobby.yourNamePlaceholder')}
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.roleLabel')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setJoinRole('estimator')}
                  style={{
                    padding: '0.625rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: joinRole === 'estimator' ? 'var(--color-primary)' : 'var(--border-subtle)',
                    background: joinRole === 'estimator' ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                    color: joinRole === 'estimator' ? 'var(--color-primary)' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <UserCheck size={14} />
                  {t('lobby.roleEstimator')}
                </button>

                <button
                  type="button"
                  onClick={() => setJoinRole('spectator')}
                  style={{
                    padding: '0.625rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: joinRole === 'spectator' ? 'var(--color-primary)' : 'var(--border-subtle)',
                    background: joinRole === 'spectator' ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                    color: joinRole === 'spectator' ? 'var(--color-primary)' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Eye size={14} />
                  {t('lobby.roleSpectator')}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                {t('lobby.chooseAvatar')}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => setJoinAvatar(av)}
                    style={{
                      fontSize: '1.25rem',
                      padding: '6px',
                      borderRadius: 'var(--radius-md)',
                      background: joinAvatar === av ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                      border: '1px solid',
                      borderColor: joinAvatar === av ? 'var(--color-primary)' : 'var(--border-subtle)',
                    }}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.75rem' }}
            >
              <ArrowRight size={18} />
              {t('lobby.joinButton')}
            </button>
          </form>
        )}

        {/* Histórico: Salas que Facilitei */}
        {facilitatorRooms.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <Shield size={15} color="var(--color-primary)" />
                <span>{t('lobby.recentFacilitatorTitle')}</span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  background: 'var(--bg-subtle)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {facilitatorRooms.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {facilitatorRooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {room.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      {new Date(room.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(room.id)}
                      title={t('lobby.copyLink')}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiedRoomId === room.id ? (
                        <Check size={12} color="var(--color-success)" />
                      ) : (
                        <Share2 size={12} />
                      )}
                      <span>{copiedRoomId === room.id ? t('lobby.copied') : 'Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectJoin(room)}
                      style={{
                        background: 'var(--color-primary-subtle)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>{t('lobby.accessButton')}</span>
                      <ExternalLink size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoomToDelete(room)}
                      title={t('lobby.removeTooltip')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico: Salas que Participei */}
        {participantRooms.length > 0 && (
          <div style={{ marginTop: facilitatorRooms.length > 0 ? '1.25rem' : '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                <History size={15} color="var(--text-dim)" />
                <span>{t('lobby.recentParticipantTitle')}</span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  background: 'var(--bg-subtle)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {participantRooms.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 220, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {participantRooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {room.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {new Date(room.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: 'var(--radius-full)',
                          background: room.role === 'spectator' ? 'var(--bg-subtle)' : 'var(--color-primary-subtle)',
                          color: room.role === 'spectator' ? 'var(--text-muted)' : 'var(--color-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {room.role === 'spectator' ? t('table.spectator') : t('lobby.roleEstimator').split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopyInvite(room.id)}
                      title={t('lobby.copyLink')}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiedRoomId === room.id ? (
                        <Check size={12} color="var(--color-success)" />
                      ) : (
                        <Share2 size={12} />
                      )}
                      <span>{copiedRoomId === room.id ? t('lobby.copied') : 'Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectJoin(room)}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>{t('lobby.accessButton')}</span>
                      <ExternalLink size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoomToDelete(room)}
                      title={t('lobby.removeTooltip')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação para Remoção de Sala */}
      {roomToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              padding: '1.75rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger)',
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {t('lobby.removeTitle')}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0 0 0', lineHeight: 1.45 }}>
                  {t('lobby.removeConfirm1')} <strong style={{ color: 'var(--text-main)' }}>"{roomToDelete.name}"</strong> {t('lobby.removeConfirm2')}
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                lineHeight: 1.4,
              }}
            >
              {t('lobby.removeWarning')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {t('lobby.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveRoom(roomToDelete.id);
                  setRoomToDelete(null);
                }}
                style={{
                  background: 'var(--color-danger)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Trash2 size={14} />
                <span>{t('lobby.confirmRemove')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer style={{ marginTop: '2.5rem', width: '100%', maxWidth: '480px' }} />

      {/* Modal MCP */}
      <McpModal
        isOpen={showMcpModal}
        onClose={() => setShowMcpModal(false)}
      />
    </div>
  );
};
