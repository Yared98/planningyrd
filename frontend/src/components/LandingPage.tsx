import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Plus, ArrowRight, Eye, UserCheck } from 'lucide-react';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { Footer } from './Footer';
import type { ParticipantRole } from '../types';

interface LandingPageProps {
  initialRoomId?: string | null;
  onJoinRoom: (
    roomId: string,
    name: string,
    avatar: string,
    role: ParticipantRole,
    facilitatorToken?: string
  ) => void;
}

const AVATARS = ['🦊', '🐺', '🦁', '🐯', '🦅', '🦉', '🐼', '🚀', '⚡', '💎'];

export const LandingPage: React.FC<LandingPageProps> = ({
  initialRoomId,
  onJoinRoom,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    initialRoomId ? 'join' : 'create'
  );

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

    onJoinRoom(
      joinRoomId.trim(),
      joinNickname.trim(),
      joinAvatar,
      joinRole,
      storedToken || undefined
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--bg-canvas-radial, radial-gradient(circle at 50% 20%, #151d32 0%, var(--bg-canvas) 80%))',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <div className="brand-icon-box">
              <Layers size={18} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              PlanningYrd
            </span>
          </div>

          <EcosystemSwitcher currentApp="planning" />
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
      </div>

      <Footer style={{ marginTop: '2.5rem', width: '100%', maxWidth: '480px' }} />
    </div>
  );
};
