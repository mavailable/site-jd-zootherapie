// skills/mkt-social-plan/templates/PostCard.tsx
// ↳ copié par mkt-social-plan vers projets/<slug>/site/src/components/cms/marketing/PostCard.tsx

import { useState, useRef, useEffect } from 'react';

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

function statusBadge(status: PostStatus): { emoji: string; label: string; color: string } {
  switch (status) {
    case 'published': return { emoji: '✅', label: 'Publié', color: 'bg-green-500' };
    case 'skipped': return { emoji: '⏭️', label: 'Skipé', color: 'bg-gray-400' };
    default: return { emoji: '📝', label: 'À publier', color: 'bg-blue-500' };
  }
}

function networkBadge(network: Network): string {
  return network === 'facebook' ? 'FB' : 'LI';
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
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(post.client_modified_text ?? post.text);
  const [localComment, setLocalComment] = useState(post.client_comment ?? '');
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const badge = statusBadge(post.status);
  const displayedText = post.client_modified_text ?? post.text;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLocalText(post.client_modified_text ?? post.text);
    setLocalComment(post.client_comment ?? '');
  }, [post]);

  async function handleCopy() {
    const full = `${displayedText}\n\n${post.hashtags.join(' ')}${post.cta ? `\n\n${post.cta}` : ''}`;
    await navigator.clipboard.writeText(full);
    // Toast : laissé au parent via un event ou simple feedback inline
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

  const isOverridden = post.client_modified_text !== null;
  const cardClass = post.status === 'skipped' ? 'opacity-50' : '';

  return (
    <article className={`rounded-lg border border-gray-200 p-4 bg-white ${cardClass}`} data-testid={`postcard-${post.id}`}>
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100">{networkBadge(post.network)}</span>
          <span className="text-sm text-gray-600">Sem {post.week} · {post.scheduled_date} {post.scheduled_time_hint}</span>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded text-white ${badge.color}`} aria-label={`Statut : ${badge.label}`}>
          {badge.emoji} {badge.label}
        </span>
      </header>

      {/* Visuel */}
      {post.visual_type === 'ia' && post.visual_generated ? (
        <img src={post.visual_generated} alt={post.visual_brief} className="w-full rounded mb-2" />
      ) : (
        <div className="rounded border-2 border-dashed border-gray-300 p-3 mb-2 text-sm text-gray-700 bg-gray-50">
          <strong>📸 Visuel ({post.visual_type}) :</strong> {post.visual_brief}
        </div>
      )}

      {/* Texte */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => {
            setLocalText(e.target.value);
            scheduleTextSave(e.target.value);
          }}
          onBlur={() => setEditing(false)}
          className="w-full p-2 border rounded text-sm font-mono"
          rows={6}
          data-testid="postcard-textarea"
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap mb-2">
          {displayedText}
          {isOverridden && (
            <button
              onClick={() => {
                setLocalText(post.text);
                scheduleTextSave(post.text);
              }}
              className="text-xs underline text-gray-500 ml-2"
              type="button"
            >
              voir version générée
            </button>
          )}
        </div>
      )}

      <div className="text-xs text-gray-600 mb-2">
        {post.hashtags.join(' ')}
        {post.cta && <span className="block mt-1 italic">CTA : {post.cta}</span>}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={handleCopy} className="btn-sm" type="button" data-testid="postcard-copy">
          📋 Copier
        </button>
        <button onClick={() => setEditing((v) => !v)} className="btn-sm" type="button" data-testid="postcard-edit">
          ✏️ {editing ? 'Fermer' : 'Modifier'}
        </button>
        <button
          onClick={() => markStatus('published')}
          disabled={busy || post.status === 'published'}
          className="btn-sm btn-primary"
          type="button"
          data-testid="postcard-publish"
        >
          ✅ Marquer publié
        </button>
        <button
          onClick={() => markStatus('skipped')}
          disabled={busy || post.status === 'skipped'}
          className="btn-sm"
          type="button"
          data-testid="postcard-skip"
        >
          ⏭️ Skipper
        </button>
      </div>

      {/* Commentaire */}
      <details open={expanded} onToggle={(e) => setExpanded((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="text-xs cursor-pointer text-gray-600">💬 Commentaire</summary>
        <textarea
          value={localComment}
          onChange={(e) => setLocalComment(e.target.value)}
          onBlur={handleCommentBlur}
          className="w-full p-2 border rounded text-xs mt-1"
          rows={2}
          maxLength={5000}
          placeholder="Notes, modifications faites, photo utilisée à la place..."
          data-testid="postcard-comment"
        />
      </details>
    </article>
  );
}
