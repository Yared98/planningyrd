import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Database,
  Layers,
  TrendingUp,
  Radio,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sun,
  Moon,
  Clock,
  Activity,
  Check,
} from 'lucide-react';
import { EcosystemSwitcher } from './EcosystemSwitcher';
import { Footer } from './Footer';
import { copyToClipboard } from '../utils/clipboard';

interface AdminMetrics {
  total_rooms: number;
  active_rooms_30d: number;
  total_stories: number;
  total_votes: number;
  distinct_participants: number;
  db_size_bytes: number;
}

interface AdminRoomSummary {
  id: string;
  name: string;
  deck_type: string;
  status: string;
  story_count: number;
  vote_count: number;
  created_at: number;
}

interface AdminMetricsResponse {
  metrics: AdminMetrics;
  active_rooms_memory: number;
  rooms: AdminRoomSummary[];
}

interface AdminDashboardProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AdminMetricsResponse | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      if (res.ok) {
        setIsAuthenticated(true);
        loadMetrics();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const json: AdminMetricsResponse = await res.json();
        setData(json);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      } else {
        setErrorMsg('Erro ao carregar métricas do servidor.');
      }
    } catch {
      setErrorMsg('Falha na comunicação com a API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        setTokenInput('');
        loadMetrics();
      } else {
        setErrorMsg(resJson.error || 'Credencial administrativa inválida.');
      }
    } catch {
      setErrorMsg('Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setData(null);
  };

  const handlePurge = async () => {
    if (!window.confirm('Deseja forçar a execução da rotina de retenção de dados e expurgo de salas inativas?')) {
      return;
    }

    setIsPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch('/api/admin/purge', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setPurgeResult(`${json.purged_count} sala(s) expirada(s) foram removidas com sucesso.`);
        loadMetrics();
      } else {
        setErrorMsg('Erro ao executar purge de dados.');
      }
    } catch {
      setErrorMsg('Falha ao comunicar requisição de expurgo.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, { method: 'DELETE' });
      if (res.ok) {
        setRoomToDelete(null);
        loadMetrics();
      } else {
        alert('Erro ao excluir sala.');
      }
    } catch {
      alert('Falha de conexão.');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const ms = timestamp > 1e11 ? timestamp : timestamp * 1000;
    return new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <RefreshCw size={32} className="spin-animation" color="var(--color-primary)" />
      </div>
    );
  }

  // Common Header component for Home style consistency
  const renderAppHeader = (showAdminControls: boolean) => (
    <header className="app-header">
      <div className="header-left">
        <a href="/" className="brand-logo" title="PlanningYrd - Início" aria-label="PlanningYrd Home">
          <div className="brand-icon-box">
            <Layers size={18} />
          </div>
          <span className="brand-title">
            Planning<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
          </span>
        </a>
        <EcosystemSwitcher currentApp="planning" />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--color-primary-subtle)',
            border: '1px solid var(--border-primary)',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}
        >
          <ShieldCheck size={13} />
          <span>Admin Console</span>
        </div>
      </div>

      <div className="header-right">
        {showAdminControls && (
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title="Recarregar métricas"
          >
            <RefreshCw size={13} className={isLoading ? 'spin-animation' : ''} />
            <span>Atualizar</span>
          </button>
        )}

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--color-primary)" />}
          </button>
        )}

        <a
          href="/"
          className="btn-secondary"
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          title="Voltar à tela inicial"
        >
          <ExternalLink size={13} />
          <span>Voltar ao App</span>
        </a>

        {showAdminControls && (
          <button
            onClick={handleLogout}
            className="btn-danger"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
            title="Encerrar sessão de admin"
          >
            <LogOut size={13} />
            <span>Sair</span>
          </button>
        )}
      </div>
    </header>
  );

  // Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="admin-layout">
        {renderAppHeader(false)}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            width: '100%',
          }}
        >
          {/* Hero Header */}
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                marginBottom: '1rem',
                color: 'var(--color-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} />
              <span>Acesso Restrito</span>
            </div>

            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 0.5rem' }}>
              Painel Administrativo
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Insira a chave secreta <code className="code-badge">ADMIN_TOKEN</code> para desbloquear a observabilidade do sistema.
            </p>
          </div>

          {/* Form Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-2xl)',
              padding: '2.25rem 2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {errorMsg && (
              <div className="admin-error-banner" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="admin-token-input" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                  Chave Secreta de Administração
                </label>
                <div className="input-password-wrapper">
                  <div className="input-prefix-icon">
                    <KeyRound size={16} />
                  </div>
                  <input
                    id="admin-token-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Insira o ADMIN_TOKEN..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="btn-icon password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar' : 'Exibir'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-lg)',
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="spin-animation" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Desbloquear Console</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
              <a href="/" className="admin-return-link" style={{ textDecoration: 'none' }}>
                <ArrowLeft size={14} />
                <span>Voltar à tela inicial do PlanningYrd</span>
              </a>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="admin-layout">
      {renderAppHeader(true)}

      <main className="admin-main">
        {/* Hero Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '0.85rem',
              color: 'var(--color-primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <Activity size={14} />
            <span>Telemetria & Gestão</span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
            Console Administrativo
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
            Visão analítica de adoção, sessões síncronas em memória, integridade do SQLite e controle de ciclo de vida das salas.
          </p>
        </div>

        {/* Alerts */}
        {purgeResult && (
          <div className="admin-success-banner" style={{ marginBottom: '2rem' }}>
            <CheckCircle2 size={16} />
            <span>{purgeResult}</span>
            <button
              className="btn-icon"
              style={{ marginLeft: 'auto', padding: 2 }}
              onClick={() => setPurgeResult(null)}
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="admin-error-banner" style={{ marginBottom: '2rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* KPI Cards Grid with Spacious Layout */}
        {data && (
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total de Salas</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>
                  <Layers size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.total_rooms}</div>
              <div className="kpi-desc">Salas registradas no SQLite</div>
            </div>

            <div className="admin-kpi-card" style={{ padding: '1.5rem' }}>
              <div className="kpi-header">
                <span className="kpi-title">Salas Ativas (30d)</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.active_rooms_30d}</div>
              <div className="kpi-desc">Salas no último mês</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Salas Na Memória</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--color-warning)' }}>
                  <Radio size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.active_rooms_memory}</div>
              <div className="kpi-desc">Broadcasts WebSocket ativos</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Histórias & Votos</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <FileText size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.total_stories}</div>
              <div className="kpi-desc">{data.metrics.total_votes} votos computados</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Banco SQLite</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  <Database size={18} />
                </div>
              </div>
              <div className="kpi-value">{formatBytes(data.metrics.db_size_bytes)}</div>
              <div className="kpi-desc">Tamanho do arquivo local</div>
            </div>
          </div>
        )}

        {/* Operational Maintenance Banner Card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-2xl)',
            padding: '1.75rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
            marginBottom: '2.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={16} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Ciclo de Vida & Retenção de Dados
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              O sistema executa expurgo automático diário para salas criadas há mais de 60 dias. Você também pode disparar a limpeza manual agora.
            </p>
          </div>

          <button
            className="btn-secondary"
            onClick={handlePurge}
            disabled={isPurging}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.85rem',
              fontWeight: 700,
              gap: '0.5rem',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: 'var(--color-danger)',
            }}
          >
            <Trash2 size={15} />
            <span>{isPurging ? 'Executando Purge...' : 'Forçar Limpeza de Expiradas'}</span>
          </button>
        </div>

        {/* Recent Rooms Table Card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-2xl)',
            padding: '1.75rem 2rem',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '3rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Salas Recentes do Sistema
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Exibindo as últimas 50 salas registradas no banco de dados
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Total: <strong>{data?.rooms.length || 0}</strong> salas
              </span>
            </div>
          </div>

          <div className="admin-table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome da Sala</th>
                  <th>Baralho</th>
                  <th style={{ textAlign: 'center' }}>Histórias</th>
                  <th style={{ textAlign: 'center' }}>Votos</th>
                  <th>Status</th>
                  <th>Criada Em</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data && data.rooms.length > 0 ? (
                  data.rooms.map((room) => (
                    <tr key={room.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <code className="code-badge" style={{ fontSize: '0.78rem' }}>{room.id.substring(0, 8)}</code>
                          <button
                            className="btn-icon"
                            style={{ width: 24, height: 24 }}
                            onClick={() => handleCopy(room.id, room.id)}
                            title="Copiar código da sala"
                          >
                            {copiedId === room.id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{room.name}</td>
                      <td>
                        <span className="chip-subtle" style={{ fontWeight: 600 }}>{room.deck_type}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{room.story_count}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{room.vote_count}</td>
                      <td>
                        <span className={`status-pill ${room.status === 'voting' ? 'active' : 'idle'}`}>
                          {room.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(room.created_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <a
                            href={`/?room=${room.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon"
                            style={{ width: 28, height: 28 }}
                            title="Acessar sala em nova aba"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            className="btn-icon btn-danger"
                            style={{ width: 28, height: 28 }}
                            onClick={() => setRoomToDelete(room.id)}
                            title="Excluir sala permanentemente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                      Nenhuma sala encontrada no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {roomToDelete && (
          <div className="analytics-modal-overlay" onClick={() => setRoomToDelete(null)}>
            <div className="analytics-modal-card" style={{ maxWidth: 440, padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
              <div className="analytics-modal-header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={20} color="var(--color-danger)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Excluir Sala do Sistema?</h3>
                </div>
              </div>
              <div className="analytics-modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  A exclusão da sala <code>{roomToDelete}</code> removerá todas as histórias do backlog e votos associados em cascata. Esta ação não poderá ser desfeita.
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setRoomToDelete(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={() => handleDeleteRoom(roomToDelete)}
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
