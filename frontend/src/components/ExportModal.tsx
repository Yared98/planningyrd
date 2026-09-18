import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, Check, Download } from 'lucide-react';
import type { Room, Story } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  room: Room;
  stories: Story[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  room,
  stories,
  onClose,
}) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'markdown' | 'csv' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateContent = () => {
    if (format === 'csv') {
      let csv = 'id,title,description,status,final_score\n';
      for (const s of stories) {
        csv += `"${s.id}","${s.title.replace(/"/g, '""')}","${s.description.replace(/"/g, '""')}","${s.status}","${s.final_score || ''}"\n`;
      }
      return csv;
    }

    if (format === 'json') {
      return JSON.stringify({ room, stories }, null, 2);
    }

    // Markdown
    let md = `# Planning Poker - ${room.name}\n\n`;
    md += `**ID da Sala:** \`${room.id}\`  \n`;
    md += `**Baralho:** ${room.deck_type}  \n\n`;
    md += `## Histórias Estimadas\n\n`;
    md += `| # | Título | Pontuação Final | Status |\n`;
    md += `|---|---|---|---|\n`;

    stories.forEach((s, idx) => {
      md += `| ${idx + 1} | ${s.title} | **${s.final_score || '-'}** | ${s.status} |\n`;
    });

    md += `\n---\n*Gerado por PlanningYrd (Agile Cadence)*\n`;
    return md;
  };

  const content = generateContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'md';
    const mime =
      format === 'csv'
        ? 'text/csv'
        : format === 'json'
        ? 'application/json'
        : 'text/markdown';

    const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `planning_${room.id}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            {t('export.title')}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Format tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1rem',
          }}
        >
          {(['markdown', 'csv', 'json'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: format === fmt ? 'var(--color-primary)' : 'transparent',
                color: format === fmt ? '#ffffff' : 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Preview box */}
        <textarea
          readOnly
          value={content}
          rows={12}
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            marginBottom: '1rem',
            resize: 'none',
          }}
        />

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? t('export.copied') : t('export.copyClipboard')}
          </button>
          <button className="btn-primary" onClick={handleDownload}>
            <Download size={14} />
            {t('export.downloadFile')}
          </button>
        </div>
      </div>
    </div>
  );
};
