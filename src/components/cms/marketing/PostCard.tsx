import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';

export type PostStatus = 'draft' | 'published' | 'skipped';
export type Network = 'facebook' | 'linkedin';
export type VisualType = 'brut' | 'ia' | 'stock';

export interface PostCardData {
  id: string;
  network: Network;
  week: number;
  scheduled_date: string;
  scheduled_time_hint: string;
  format: string;
  visual_type: VisualType;
  visual_brief: string;
  visual_generated: string | null;
  text: string;
  hashtags: string[];
  cta: string | null;
  status: PostStatus;
  published_at: string | null;
  client_modified_text: string | null;
  client_comment: string | null;
}

interface Props {
  post: PostCardData;
  trimester: string;
  onPatched: (patch: Partial<PostCardData>) => void;
  onError: (message: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function sendPatch(trimester: string, post_id: string, patch: Record<string, unknown>) {
  const r = await fetch('/api/cms/marketing-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ trimester, post_id, patch }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({ error: 'unknown' }));
    throw new Error(body.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export function PostCard({ post, trimester, onPatched, onError }: Props) {
  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(post.client_modified_text ?? post.text);
  const [localComment, setLocalComment] = useState(post.client_comment ?? '');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showComment, setShowComment] = useState(!!post.client_comment);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalText(post.client_modified_text ?? post.text);
    setLocalComment(post.client_comment ?? '');
  }, [post.client_modified_text, post.client_comment, post.text]);

  const isOverridden = post.client_modified_text !== null;
  const displayedText = post.client_modified_text ?? post.text;

  async function handleCopy() {
    const full = `${displayedText}\n\n${post.hashtags.join(' ')}${post.cta ? `\n\n${post.cta}` : ''}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markStatus(status: PostStatus) {
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { status };
      if (status === 'published') patch.published_at = new Date().toISOString();
      await sendPatch(trimester, post.id, patch);
      onPatched(patch as Partial<PostCardData>);
    } catch (e) {
      onError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function scheduleTextSave(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const patch = { client_modified_text: next === post.text ? null : next };
        await sendPatch(trimester, post.id, patch);
        onPatched(patch as Partial<PostCardData>);
      } catch (e) {
        onError(String((e as Error).message));
      }
    }, 1000);
  }

  async function handleCommentBlur() {
    if (localComment === (post.client_comment ?? '')) return;
    try {
      const patch = { client_comment: localComment || null };
      await sendPatch(trimester, post.id, patch);
      onPatched(patch as Partial<PostCardData>);
    } catch (e) {
      onError(String((e as Error).message));
    }
  }

  const networkStyle =
    post.network === 'facebook'
      ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Facebook' }
      : { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: 'LinkedIn' };

  const statusStyle =
    post.status === 'published'
      ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Publié', icon: '✓' }
      : post.status === 'skipped'
        ? { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: 'Skippé', icon: '⊘' }
        : { bg: '#fef9c3', text: '#a16207', border: '#fde68a', label: 'À publier', icon: '●' };

  const cardOpacity = post.status === 'skipped' ? 0.6 : 1;

  return (
    <article style={{ ...styles.card, opacity: cardOpacity }} data-testid={`postcard-${post.id}`}>
      <header style={styles.cardHeader}>
        <div style={styles.badgeRow}>
          <span
            style={{
              ...styles.badge,
              background: networkStyle.bg,
              color: networkStyle.text,
              borderColor: networkStyle.border,
            }}
          >
            {networkStyle.label}
          </span>
          <span style={styles.meta}>
            Semaine {post.week} · {formatDate(post.scheduled_date)} · {post.scheduled_time_hint}
          </span>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            background: statusStyle.bg,
            color: statusStyle.text,
            borderColor: statusStyle.border,
          }}
        >
          <span style={{ fontWeight: 700 }}>{statusStyle.icon}</span> {statusStyle.label}
        </span>
      </header>

      {post.visual_type === 'ia' && post.visual_generated ? (
        <div style={styles.visualFrame}>
          <img src={post.visual_generated} alt={post.visual_brief} style={styles.visualImage} />
        </div>
      ) : (
        <div style={styles.visualBrief}>
          <span style={styles.visualBriefIcon}>📸</span>
          <div>
            <div style={styles.visualBriefLabel}>
              Visuel à produire · <span style={styles.visualTypeTag}>{post.visual_type}</span>
            </div>
            <div style={styles.visualBriefText}>{post.visual_brief}</div>
          </div>
        </div>
      )}

      {editing ? (
        <textarea
          value={localText}
          onChange={(e) => {
            setLocalText(e.target.value);
            scheduleTextSave(e.target.value);
          }}
          onBlur={() => setEditing(false)}
          style={styles.textarea}
          rows={10}
          autoFocus
          data-testid="postcard-textarea"
        />
      ) : (
        <div style={styles.textBody}>{displayedText}</div>
      )}

      {isOverridden && !editing && (
        <button
          onClick={() => {
            setLocalText(post.text);
            scheduleTextSave(post.text);
          }}
          style={styles.revertBtn}
          type="button"
        >
          ↻ Revenir au texte généré
        </button>
      )}

      {post.hashtags.length > 0 && (
        <div style={styles.hashtagRow}>
          {post.hashtags.map((h) => (
            <span key={h} style={styles.hashtag}>
              {h}
            </span>
          ))}
        </div>
      )}
      {post.cta && (
        <div style={styles.ctaBox}>
          <span style={styles.ctaLabel}>CTA</span> {post.cta}
        </div>
      )}

      <div style={styles.actions}>
        <button
          onClick={handleCopy}
          style={copied ? styles.btnSuccess : styles.btnPrimary}
          type="button"
          data-testid="postcard-copy"
        >
          {copied ? '✓ Copié' : '📋 Copier'}
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          style={styles.btnSecondary}
          type="button"
          data-testid="postcard-edit"
        >
          {editing ? 'Fermer' : '✏️ Modifier'}
        </button>
        <button
          onClick={() => markStatus('published')}
          disabled={busy || post.status === 'published'}
          style={post.status === 'published' ? styles.btnDisabled : styles.btnSuccess}
          type="button"
          data-testid="postcard-publish"
        >
          ✓ Marquer publié
        </button>
        <button
          onClick={() => markStatus('skipped')}
          disabled={busy || post.status === 'skipped'}
          style={post.status === 'skipped' ? styles.btnDisabled : styles.btnGhost}
          type="button"
          data-testid="postcard-skip"
        >
          ⊘ Skipper
        </button>
      </div>

      <div style={styles.commentSection}>
        <button
          type="button"
          onClick={() => setShowComment((v) => !v)}
          style={styles.commentToggle}
        >
          💬 {showComment ? 'Masquer' : 'Ajouter'} un commentaire
          {post.client_comment ? ' · note présente' : ''}
        </button>
        {showComment && (
          <textarea
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            onBlur={handleCommentBlur}
            placeholder="Notes perso : modifications faites, photo utilisée, date de publication réelle..."
            style={styles.commentTextarea}
            rows={2}
            maxLength={5000}
            data-testid="postcard-comment"
          />
        )}
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  badgeRow: { display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' },
  badge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.25rem 0.625rem',
    borderRadius: '999px',
    border: '1px solid',
  },
  meta: { fontSize: '0.8125rem', color: '#64748b' },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  visualFrame: {
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    maxHeight: '340px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualImage: {
    width: '100%',
    maxHeight: '340px',
    objectFit: 'contain',
    display: 'block',
  },
  visualBrief: {
    display: 'flex',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    background: '#fefce8',
    border: '1px dashed #facc15',
    borderRadius: '10px',
  },
  visualBriefIcon: { fontSize: '1.25rem', flexShrink: 0 },
  visualBriefLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#854d0e',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  visualTypeTag: { textTransform: 'none', fontWeight: 500, color: '#a16207' },
  visualBriefText: { fontSize: '0.875rem', color: '#713f12', lineHeight: 1.5 },
  textBody: {
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    color: '#1e293b',
    whiteSpace: 'pre-wrap',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  revertBtn: {
    alignSelf: 'flex-start',
    fontSize: '0.75rem',
    color: '#64748b',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  hashtagRow: { display: 'flex', gap: '0.375rem', flexWrap: 'wrap' },
  hashtag: {
    fontSize: '0.75rem',
    color: '#475569',
    background: '#f1f5f9',
    padding: '0.1875rem 0.5rem',
    borderRadius: '6px',
  },
  ctaBox: {
    fontSize: '0.8125rem',
    color: '#475569',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
  },
  ctaLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginRight: '0.5rem',
  },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  btnPrimary: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    cursor: 'pointer',
  },
  btnSuccess: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#16a34a',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    cursor: 'pointer',
  },
  btnSecondary: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    cursor: 'pointer',
  },
  btnGhost: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#64748b',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    cursor: 'pointer',
  },
  btnDisabled: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#94a3b8',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    cursor: 'not-allowed',
  },
  commentSection: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  commentToggle: {
    alignSelf: 'flex-start',
    fontSize: '0.75rem',
    color: '#64748b',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  commentTextarea: {
    width: '100%',
    padding: '0.5rem 0.625rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    color: '#334155',
    background: '#f8fafc',
    resize: 'vertical',
  },
};
