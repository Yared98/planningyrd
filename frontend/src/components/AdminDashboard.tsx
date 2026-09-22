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
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface AdminMetrics {
  total_rooms: i64;
  active_rooms_30d: number;
  total_stories: number;
  total_votes: number;
  distinct_participants: number;
  db_size_bytes: number;
}

type i64 = number;

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

export const AdminDashboard: React.FC = () => {
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
    // Handle milliseconds vs seconds
    const ms = timestamp > 1e11 ? timestamp : timestamp * 1000;
    return new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading initial auth check
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={28} className="spin-animation" color="var(--color-primary)" />
      </div>
    );
  }

  // Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="admin-lock-container">
        <div className="admin-lock-card">
          <div className="admin-lock-header">
            <div className="admin-shield-icon">
              <ShieldCheck size={28} color="var(--color-primary)" />
            </div>
            <h2>Painel Administrativo</h2>
            <p>Observabilidade e manutenção restrita do PlanningYrd</p>
          </div>

          {errorMsg && (
            <div className="admin-error-banner">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-lock-form">
            <div className="form-group">
              <label htmlFor="admin-token-input">Chave de Acesso (ADMIN_TOKEN)</label>
              <div className="input-password-wrapper">
                <div className="input-prefix-icon">
                  <KeyRound size={16} />
                </div>
                <input
                  id="admin-token-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Insira o token secreto..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
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

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Desbloquear Acesso</span>
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <a href="/" className="admin-return-link">
              <ArrowLeft size={14} />
              <span>Voltar para o PlanningYrd</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="admin-dashboard-container">
      {/* Top Navigation */}
      <header className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <a href="/" className="brand-logo" title="Ir para Home">
            <div className="brand-icon-box">
              <Layers size={18} />
            </div>
            <span className="brand-title">
              Planning<span style={{ color: 'var(--color-primary)' }}>Yrd</span>
            </span>
          </a>
          <span className="admin-badge">
            <ShieldCheck size={13} />
            <span>Admin Console</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn-secondary btn-sm"
            onClick={loadMetrics}
            disabled={isLoading}
            title="Atualizar dados"
          >
            <RefreshCw size={14} className={isLoading ? 'spin-animation' : ''} />
            <span>Atualizar</span>
          </button>

          <a href="/" className="btn-secondary btn-sm" title="Abrir página inicial">
            <ExternalLink size={14} />
            <span>Voltar ao App</span>
          </a>

          <button
            className="btn-danger btn-sm"
            onClick={handleLogout}
            title="Encerrar sessão de admin"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        {/* Alerts */}
        {purgeResult && (
          <div className="admin-success-banner">
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
          <div className="admin-error-banner">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Metric KPI Cards */}
        {data && (
          <div className="admin-metrics-grid">
            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total de Salas</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}>
                  <Layers size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.total_rooms}</div>
              <div className="kpi-desc">Salas criadas desde o início</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Salas Ativas (30d)</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.active_rooms_30d}</div>
              <div className="kpi-desc">Criadas no último mês</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Salas em Memória</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--color-warning)' }}>
                  <Radio size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.active_rooms_memory}</div>
              <div className="kpi-desc">Sessões ativas com WebSocket</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Histórias & Votos</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  <FileText size={18} />
                </div>
              </div>
              <div className="kpi-value">{data.metrics.total_stories}</div>
              <div className="kpi-desc">{data.metrics.total_votes} votos / {data.metrics.distinct_participants} participantes</div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Banco SQLite</span>
                <div className="kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                  <Database size={18} />
                </div>
              </div>
              <div className="kpi-value">{formatBytes(data.metrics.db_size_bytes)}</div>
              <div className="kpi-desc">Tamanho do arquivo em disco</div>
            </div>
          </div>
        )}

        {/* Operational Actions */}
        <div className="admin-section-header">
          <div>
            <h3>Salas Recentes do Sistema</h3>
            <p>Listagem de telemetria operacional com histórico de salas</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary btn-sm"
              onClick={handlePurge}
              disabled={isPurging}
              title="Executa limpeza de salas inativas conforme política de retenção"
            >
              <Trash2 size={14} color="var(--color-danger)" />
              <span>{isPurging ? 'Executando Expurgador...' : 'Executar Purge Manual'}</span>
            </button>
          </div>
        </div>

        {/* Rooms Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código / ID</th>
                <th>Nome da Sala</th>
                <th>Baralho</th>
                <th>Histórias</th>
                <th>Votos</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <code className="code-badge">{room.id.substring(0, 8)}...</code>
                        <button
                          className="btn-icon"
                          style={{ width: 22, height: 22 }}
                          onClick={() => handleCopy(room.id, room.id)}
                          title="Copiar ID completo"
                        >
                          {copiedId === room.id ? <CheckCircle2 size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{room.name}</td>
                    <td>
                      <span className="chip-subtle">{room.deck_type}</span>
                    </td>
                    <td>{room.story_count}</td>
                    <td>{room.vote_count}</td>
                    <td>
                      <span className={`status-pill ${room.status === 'voting' ? 'active' : 'idle'}`}>
                        {room.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {formatDate(room.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <a
                          href={`/?room=${room.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          style={{ width: 26, height: 26 }}
                          title="Acessar sala"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          className="btn-icon btn-danger"
                          style={{ width: 26, height: 26 }}
                          onClick={() => setRoomToDelete(room.id)}
                          title="Excluir sala"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Nenhuma sala cadastrada no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Dialog */}
        {roomToDelete && (
          <div className="analytics-modal-overlay" onClick={() => setRoomToDelete(null)}>
            <div className="analytics-modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <div className="analytics-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="var(--color-danger)" />
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Excluir Sala Permanentemente?</h3>
                </div>
              </div>
              <div className="analytics-modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  A exclusão removerá todas as histórias do backlog e registros de votos associados a esta sala em cascata. Esta ação é irreversível.
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button className="btn-secondary btn-sm" onClick={() => setRoomToDelete(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn-danger btn-sm"
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
    </div>
  );
};
