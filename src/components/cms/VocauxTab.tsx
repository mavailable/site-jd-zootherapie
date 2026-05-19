import { useState, useRef, useEffect, useCallback } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useToastContext } from './CmsApp';

type RecorderState =
  | 'idle'
  | 'requesting-mic'
  | 'ready'
  | 'recording'
  | 'reviewing'
  | 'uploading';

interface RecordedClip {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  mime: string;
  size: number;
}

interface VocalAttachment {
  filename: string;
  vocal_url: string;
  audio_mime?: string;
  audio_bytes: number;
}

interface VocalEntry {
  id: string;
  sujet: string;
  categorie?: string;
  attachments?: VocalAttachment[];
  // Legacy single-file fields (rétrocompat avec entrées créées avant le multi-vocaux)
  filename?: string;
  vocal_url?: string;
  audio_mime?: string;
  audio_bytes?: number;
  uploaded_at: string;
  statut: 'envoye' | 'transcrit' | 'publie';
}

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'idee-article', label: "Idée d'article de blog" },
  { value: 'concept', label: 'Concept ou réflexion' },
  { value: 'post-facebook', label: 'Post Facebook' },
  { value: 'post-linkedin', label: 'Post LinkedIn' },
  { value: 'landing-page', label: 'Landing page / promo' },
  { value: 'question', label: 'Question pour Marc' },
  { value: 'feedback', label: 'Retour / modif sur le site' },
  { value: 'autre', label: 'Autre' },
];

const CATEGORIE_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const STATUT_LABEL: Record<VocalEntry['statut'], string> = {
  envoye: 'Envoyé',
  transcrit: 'Transcrit',
  publie: 'Publié',
};

const STATUT_ICON: Record<VocalEntry['statut'], string> = {
  envoye: '\u{1F4E4}',
  transcrit: '\u{1F4DD}',
  publie: '\u{2705}',
};

const MAX_CLIPS = 5;

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extFromMime(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('ogg') || mime.includes('opus')) return 'opus';
  return 'webm';
}

function getEntryAttachments(e: VocalEntry): VocalAttachment[] {
  if (Array.isArray(e.attachments) && e.attachments.length > 0) return e.attachments;
  if (e.vocal_url && e.filename) {
    return [
      {
        filename: e.filename,
        vocal_url: e.vocal_url,
        audio_mime: e.audio_mime,
        audio_bytes: e.audio_bytes ?? 0,
      },
    ];
  }
  return [];
}

export function VocauxTab({ config }: { config: CmsConfig }) {
  const { addToast } = useToastContext();
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sujet, setSujet] = useState('');
  const [categorie, setCategorie] = useState<string>(CATEGORIES[0].value);
  const [duration, setDuration] = useState(0);
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const [level, setLevel] = useState(0); // 0–100 (RMS du signal)
  const [entries, setEntries] = useState<VocalEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const supportedMimeRef = useRef<string>('');

  // VU-meter refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const hint =
    config.vocaux?.hint ||
    "Enregistre une ou plusieurs notes vocales pour partager une idée, un retour, une question. Marc reçoit tes vocaux et les traite.";

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const resp = await fetch('/api/vocaux-list', { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (err: any) {
      setError(`Impossible de charger l'historique : ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Préremplissage depuis sessionStorage (déposé par BlogTab "Enregistrer un vocal" sur une idée)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('vocaux_prefill');
      if (!raw) return;
      sessionStorage.removeItem('vocaux_prefill');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (typeof data.sujet === 'string' && data.sujet.trim()) setSujet(data.sujet);
        if (
          typeof data.categorie === 'string' &&
          CATEGORIES.some((c) => c.value === data.categorie)
        ) {
          setCategorie(data.categorie);
        }
      }
    } catch {
      // silent
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      clips.forEach((c) => URL.revokeObjectURL(c.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMeter = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setLevel(0);
  };

  const startMeter = (stream: MediaStream) => {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        // RMS calc on signal centred around 128
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / data.length);
        // Map RMS [0..~0.5] → [0..100], with a soft curve
        const pct = Math.min(100, Math.round(rms * 220));
        setLevel(pct);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // pas de VU-mètre, mais l'enregistrement continue
    }
  };

  const requestMic = async () => {
    setError(null);
    setState('requesting-mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const supportedMime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      supportedMimeRef.current = supportedMime;
      setState('ready');
    } catch (err: any) {
      setError(`Accès micro refusé : ${err.message || err.name}`);
      setState('idle');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    if (clips.length >= MAX_CLIPS) {
      setError(`Maximum ${MAX_CLIPS} vocaux par envoi.`);
      return;
    }
    setError(null);

    const supportedMime = supportedMimeRef.current;
    const rec = new MediaRecorder(
      streamRef.current,
      supportedMime ? { mimeType: supportedMime } : undefined
    );
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = supportedMime || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      const clip: RecordedClip = {
        id: `clip-${Date.now()}`,
        blob,
        url,
        duration,
        mime: type,
        size: blob.size,
      };
      setClips((prev) => [...prev, clip]);
      setDuration(0);
      stopMeter();
      setState('reviewing');
    };
    mediaRecorderRef.current = rec;

    setDuration(0);
    rec.start(250);
    setState('recording');

    startMeter(streamRef.current);

    timerRef.current = window.setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const removeClip = (id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) setState('ready');
      return next;
    });
  };

  const resetAll = () => {
    clips.forEach((c) => URL.revokeObjectURL(c.url));
    setClips([]);
    setDuration(0);
    stopMeter();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setSujet('');
    setCategorie(CATEGORIES[0].value);
    setState('idle');
  };

  const sendAll = async () => {
    if (clips.length === 0) return;
    if (!sujet.trim()) {
      setError('Le sujet est obligatoire.');
      return;
    }
    setState('uploading');
    setError(null);

    const formData = new FormData();
    formData.append('sujet', sujet.trim());
    formData.append('categorie', categorie);
    formData.append('categorie_label', CATEGORIE_LABEL[categorie] || categorie);
    clips.forEach((c, i) => {
      const ext = extFromMime(c.mime);
      formData.append(`audio_${i}`, c.blob, `vocal-${i + 1}.${ext}`);
    });
    formData.append('audio_count', String(clips.length));

    try {
      const resp = await fetch('/api/vocal-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      addToast(
        clips.length === 1
          ? 'Vocal envoyé à Marc.'
          : `${clips.length} vocaux envoyés à Marc.`,
        'success'
      );
      resetAll();
      loadList();
    } catch (err: any) {
      setError(`Envoi échoué : ${err.message}`);
      setState('reviewing');
    }
  };

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
  const totalBytes = clips.reduce((sum, c) => sum + c.size, 0);

  return (
    <div>
      <h2 style={styles.h2}>Mes vocaux</h2>
      <p style={styles.intro}>{hint}</p>

      <div style={styles.card}>
        <label style={styles.label}>
          Catégorie
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            disabled={state === 'recording' || state === 'uploading'}
            style={styles.input}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ ...styles.label, marginTop: '1rem' }}>
          Sujet <span style={styles.required}>*</span>
          <input
            type="text"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            placeholder="ex: idée article sur Caramel et les ados"
            style={styles.input}
            disabled={state === 'recording' || state === 'uploading'}
            required
          />
        </label>

        {state === 'idle' && (
          <div style={styles.center}>
            <button onClick={requestMic} style={styles.primaryBtn}>
              <span style={styles.btnIcon}>{'\u{1F3A4}'}</span>
              <span>Démarrer un enregistrement</span>
            </button>
            <p style={styles.tinyHint}>
              Ton navigateur va te demander l'autorisation d'utiliser le micro.
            </p>
          </div>
        )}

        {state === 'requesting-mic' && (
          <div style={styles.center}>
            <span style={styles.statusText}>Autorisation du micro…</span>
          </div>
        )}

        {state === 'ready' && (
          <div style={styles.center}>
            <button
              onClick={startRecording}
              style={{ ...styles.primaryBtn, background: '#dc2626' }}
            >
              <span style={styles.btnIcon}>{'\u{25CF}'}</span>
              <span>Enregistrer</span>
            </button>
            <p style={styles.tinyHint}>
              Parle naturellement. Tu pourras réécouter et en ajouter d'autres.
            </p>
          </div>
        )}

        {state === 'recording' && (
          <div style={styles.center}>
            <div style={styles.recordingIndicator}>
              <span style={styles.recordingDot} />
              <span style={styles.timer}>{formatDuration(duration)}</span>
            </div>
            <VuMeter level={level} />
            <button onClick={stopRecording} style={styles.primaryBtn}>
              <span style={styles.btnIcon}>{'\u{25A0}'}</span>
              <span>Arrêter</span>
            </button>
          </div>
        )}

        {/* Liste des clips enregistrés (visible en reviewing) */}
        {clips.length > 0 && state !== 'recording' && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={styles.label}>
              {clips.length} vocal{clips.length > 1 ? 'aux' : ''} prêt
              {clips.length > 1 ? 's' : ''} à envoyer ·{' '}
              <span style={{ color: '#64748b', fontWeight: 400 }}>
                durée totale {formatDuration(totalDuration)} · {formatBytes(totalBytes)}
              </span>
            </p>
            <div style={styles.clipList}>
              {clips.map((c, i) => (
                <div key={c.id} style={styles.clipRow}>
                  <span style={styles.clipBadge}>#{i + 1}</span>
                  <audio src={c.url} controls style={styles.clipAudio} />
                  <span style={styles.clipMeta}>
                    {formatDuration(c.duration)} · {formatBytes(c.size)}
                  </span>
                  <button
                    onClick={() => removeClip(c.id)}
                    style={styles.deleteBtn}
                    title="Supprimer ce vocal"
                    aria-label="Supprimer ce vocal"
                    disabled={state === 'uploading'}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {state === 'reviewing' && (
              <div style={styles.row}>
                {clips.length < MAX_CLIPS && (
                  <button onClick={startRecording} style={styles.secondaryBtn}>
                    <span style={styles.btnIcon}>{'\u{2795}'}</span>
                    <span>Ajouter un autre vocal</span>
                  </button>
                )}
                <button
                  onClick={sendAll}
                  style={styles.primaryBtn}
                  disabled={!sujet.trim()}
                  title={!sujet.trim() ? 'Le sujet est obligatoire' : undefined}
                >
                  <span style={styles.btnIcon}>{'\u{2709}\u{FE0F}'}</span>
                  <span>
                    Envoyer à Marc
                    {clips.length > 1 ? ` (${clips.length})` : ''}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {state === 'uploading' && (
          <div style={styles.center}>
            <span style={styles.statusText}>
              Envoi en cours{clips.length > 1 ? ` (${clips.length} fichiers)` : ''}…
            </span>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}
      </div>

      <h3 style={styles.h3}>Historique</h3>
      {loadingList ? (
        <p style={styles.tinyHint}>Chargement…</p>
      ) : entries.length === 0 ? (
        <p style={styles.tinyHint}>Aucun vocal envoyé pour le moment.</p>
      ) : (
        <div style={styles.list}>
          {entries.map((e) => {
            const atts = getEntryAttachments(e);
            const totalSize = atts.reduce((s, a) => s + (a.audio_bytes || 0), 0);
            const catLabel = e.categorie
              ? CATEGORIE_LABEL[e.categorie] || e.categorie
              : null;
            return (
              <div key={e.id} style={styles.entry}>
                <div style={styles.entryHeader}>
                  <span style={styles.entryStatut} title={STATUT_LABEL[e.statut]}>
                    {STATUT_ICON[e.statut]} {STATUT_LABEL[e.statut]}
                  </span>
                  <span style={styles.entryDate}>{formatDate(e.uploaded_at)}</span>
                </div>
                <div style={styles.entrySujet}>
                  {catLabel && <span style={styles.catBadge}>{catLabel}</span>}
                  {e.sujet || <em style={{ color: '#94a3b8' }}>sans sujet</em>}
                </div>
                <div style={styles.entryMeta}>
                  {atts.length} fichier{atts.length > 1 ? 's' : ''} ·{' '}
                  {formatBytes(totalSize)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VuMeter({ level }: { level: number }) {
  // 20 segments façon LED rack
  const segments = 20;
  const active = Math.round((level / 100) * segments);
  return (
    <div style={vuStyles.wrapper} aria-label={`Niveau audio : ${level}%`}>
      {Array.from({ length: segments }).map((_, i) => {
        const isOn = i < active;
        const color =
          i < segments * 0.6 ? '#16a34a' : i < segments * 0.85 ? '#eab308' : '#dc2626';
        return (
          <span
            key={i}
            style={{
              ...vuStyles.segment,
              background: isOn ? color : '#e5e7eb',
              opacity: isOn ? 1 : 0.7,
            }}
          />
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' },
  h3: { fontSize: '1rem', fontWeight: 600, margin: '2rem 0 0.75rem', color: '#0f172a' },
  intro: { fontSize: '0.9375rem', color: '#475569', margin: '0 0 1.5rem' },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '0.5rem',
  },
  required: { color: '#dc2626', marginLeft: '0.125rem' },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    marginTop: '0.25rem',
    boxSizing: 'border-box' as const,
    background: '#fff',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.5rem 0',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    fontWeight: 600,
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: '#fff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.125rem',
    padding: '0.25rem 0.5rem',
    color: '#64748b',
  },
  deleteBtn: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 120ms ease, color 120ms ease',
  },
  btnIcon: { fontSize: '1.125rem' },
  tinyHint: {
    fontSize: '0.8125rem',
    color: '#64748b',
    margin: '0.25rem 0 0',
    textAlign: 'center' as const,
  },
  statusText: { fontSize: '0.9375rem', color: '#475569' },
  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  recordingDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#dc2626',
    animation: 'pulse 1s infinite',
  },
  timer: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#dc2626',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  row: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
    justifyContent: 'flex-end',
    flexWrap: 'wrap' as const,
  },
  error: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '0.875rem',
  },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  entry: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.875rem 1rem',
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  entryStatut: { fontSize: '0.8125rem', fontWeight: 600, color: '#475569' },
  entryDate: { fontSize: '0.75rem', color: '#94a3b8' },
  entrySujet: {
    fontSize: '0.9375rem',
    color: '#0f172a',
    marginBottom: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  catBadge: {
    display: 'inline-block',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#1d4ed8',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '999px',
    padding: '0.125rem 0.5rem',
  },
  entryMeta: { fontSize: '0.75rem', color: '#94a3b8' },
  clipList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  clipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  clipBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#475569',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.125rem 0.5rem',
    minWidth: '28px',
    textAlign: 'center' as const,
  },
  clipAudio: { flex: 1, minWidth: 0, height: '36px' },
  clipMeta: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums' as const,
    whiteSpace: 'nowrap' as const,
  },
};

const vuStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    width: '240px',
    height: '24px',
    padding: '4px',
    background: '#0f172a',
    borderRadius: '6px',
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: '2px',
    transition: 'opacity 60ms linear',
  },
};
