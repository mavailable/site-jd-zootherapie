import { useState, useRef, useEffect, useCallback } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useToastContext } from './CmsApp';

type RecorderState = 'idle' | 'requesting-mic' | 'ready' | 'recording' | 'reviewing' | 'uploading';

interface VocalEntry {
  id: string;
  sujet: string;
  filename: string;
  vocal_url: string;
  audio_mime?: string;
  audio_bytes: number;
  uploaded_at: string;
  statut: 'envoye' | 'transcrit' | 'publie';
}

const STATUT_LABEL: Record<VocalEntry['statut'], string> = {
  envoye: 'Envoyé',
  transcrit: 'Transcrit',
  publie: 'Publié',
};

const STATUT_ICON: Record<VocalEntry['statut'], string> = {
  envoye: '\u{1F4E4}',     // 📤
  transcrit: '\u{1F4DD}',  // 📝
  publie: '\u{2705}',      // ✅
};

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

export function VocauxTab({ config }: { config: CmsConfig }) {
  const { addToast } = useToastContext();
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sujet, setSujet] = useState('');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [entries, setEntries] = useState<VocalEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const hint = config.vocaux?.hint || 'Enregistre une note vocale pour partager une idée d\'article, un retour, ou tout ce que tu veux que Marc traite.';

  // Charge la liste des vocaux à l'init
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

  // Cleanup au démontage : libère mic + révoque l'URL Blob
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestMic = async () => {
    setError(null);
    setState('requesting-mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // MIME : Chrome/Firefox → audio/webm, Safari → audio/mp4
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const supportedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const rec = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedMime || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setState('reviewing');
      };
      mediaRecorderRef.current = rec;
      setState('ready');
    } catch (err: any) {
      setError(`Accès micro refusé : ${err.message || err.name}`);
      setState('idle');
    }
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    setDuration(0);
    chunksRef.current = [];
    mediaRecorderRef.current.start(250);
    setState('recording');
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

  const resetRecorder = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState('ready');
  };

  const sendVocal = async () => {
    if (!audioBlob) return;
    setState('uploading');
    setError(null);

    const formData = new FormData();
    const ext = (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) ? 'm4a' : 'webm';
    formData.append('audio', audioBlob, `vocal.${ext}`);
    formData.append('sujet', sujet);

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
      addToast('Vocal envoyé à Marc, il va le traiter rapidement.', 'success');
      // Reset complet + libère mic
      resetRecorder();
      setSujet('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      setState('idle');
      // Refresh list
      loadList();
    } catch (err: any) {
      setError(`Envoi échoué : ${err.message}`);
      setState('reviewing');
    }
  };

  return (
    <div>
      <h2 style={styles.h2}>Mes vocaux</h2>
      <p style={styles.intro}>{hint}</p>

      {/* Recorder card */}
      <div style={styles.card}>
        <label style={styles.label}>
          Sujet du vocal (optionnel)
          <input
            type="text"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            placeholder="ex: article sur Caramel et les ados"
            style={styles.input}
            disabled={state === 'recording' || state === 'uploading'}
          />
        </label>

        {/* État idle : bouton "Activer le micro" */}
        {state === 'idle' && (
          <div style={styles.center}>
            <button onClick={requestMic} style={styles.primaryBtn}>
              <span style={styles.btnIcon}>{'\u{1F3A4}'}</span>
              <span>Démarrer un enregistrement</span>
            </button>
            <p style={styles.tinyHint}>Ton navigateur va te demander l'autorisation d'utiliser le micro.</p>
          </div>
        )}

        {/* État requesting-mic */}
        {state === 'requesting-mic' && (
          <div style={styles.center}>
            <span style={styles.statusText}>Autorisation du micro…</span>
          </div>
        )}

        {/* État ready : bouton record */}
        {state === 'ready' && (
          <div style={styles.center}>
            <button onClick={startRecording} style={{ ...styles.primaryBtn, background: '#dc2626' }}>
              <span style={styles.btnIcon}>{'\u{25CF}'}</span>
              <span>Enregistrer</span>
            </button>
            <p style={styles.tinyHint}>Parle naturellement. Tu pourras réécouter avant d'envoyer.</p>
          </div>
        )}

        {/* État recording : timer + stop */}
        {state === 'recording' && (
          <div style={styles.center}>
            <div style={styles.recordingIndicator}>
              <span style={styles.recordingDot} />
              <span style={styles.timer}>{formatDuration(duration)}</span>
            </div>
            <button onClick={stopRecording} style={styles.primaryBtn}>
              <span style={styles.btnIcon}>{'\u{25A0}'}</span>
              <span>Arrêter</span>
            </button>
          </div>
        )}

        {/* État reviewing : preview + boutons */}
        {state === 'reviewing' && audioUrl && (
          <div>
            <p style={styles.label}>Écoute ton enregistrement avant d'envoyer :</p>
            <audio src={audioUrl} controls style={styles.audioPlayer} />
            <p style={styles.tinyHint}>
              Durée : {formatDuration(duration)} · Taille : {audioBlob ? formatBytes(audioBlob.size) : '?'}
            </p>
            <div style={styles.row}>
              <button onClick={resetRecorder} style={styles.secondaryBtn}>
                Re-enregistrer
              </button>
              <button onClick={sendVocal} style={styles.primaryBtn}>
                <span style={styles.btnIcon}>{'\u{2709}\u{FE0F}'}</span>
                <span>Envoyer à Marc</span>
              </button>
            </div>
          </div>
        )}

        {/* État uploading */}
        {state === 'uploading' && (
          <div style={styles.center}>
            <span style={styles.statusText}>Envoi en cours…</span>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}
      </div>

      {/* Historique */}
      <h3 style={styles.h3}>Historique</h3>
      {loadingList ? (
        <p style={styles.tinyHint}>Chargement…</p>
      ) : entries.length === 0 ? (
        <p style={styles.tinyHint}>Aucun vocal envoyé pour le moment.</p>
      ) : (
        <div style={styles.list}>
          {entries.map((e) => (
            <div key={e.id} style={styles.entry}>
              <div style={styles.entryHeader}>
                <span style={styles.entryStatut} title={STATUT_LABEL[e.statut]}>
                  {STATUT_ICON[e.statut]} {STATUT_LABEL[e.statut]}
                </span>
                <span style={styles.entryDate}>{formatDate(e.uploaded_at)}</span>
              </div>
              <div style={styles.entrySujet}>{e.sujet || <em style={{ color: '#94a3b8' }}>sans sujet</em>}</div>
              <div style={styles.entryMeta}>
                {formatBytes(e.audio_bytes)} · {e.filename}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' },
  h3: { fontSize: '1rem', fontWeight: 600, margin: '2rem 0 0.75rem', color: '#0f172a' },
  intro: { fontSize: '0.9375rem', color: '#475569', margin: '0 0 1.5rem' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' },
  input: {
    width: '100%', padding: '0.625rem 0.75rem',
    border: '1px solid #cbd5e1', borderRadius: '8px',
    fontSize: '0.9375rem', marginTop: '0.25rem',
    boxSizing: 'border-box' as const,
  },
  center: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0' },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '10px', cursor: 'pointer',
    fontSize: '0.9375rem', fontWeight: 600,
  },
  secondaryBtn: {
    padding: '0.625rem 1.25rem', background: '#fff', color: '#475569',
    border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer',
    fontSize: '0.875rem', fontWeight: 500,
  },
  btnIcon: { fontSize: '1.125rem' },
  tinyHint: { fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0', textAlign: 'center' as const },
  statusText: { fontSize: '0.9375rem', color: '#475569' },
  recordingIndicator: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  recordingDot: {
    display: 'inline-block', width: '12px', height: '12px',
    borderRadius: '50%', background: '#dc2626',
    animation: 'pulse 1s infinite',
  },
  timer: { fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' as const },
  audioPlayer: { width: '100%', marginTop: '0.5rem' },
  row: { display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' },
  error: {
    marginTop: '1rem', padding: '0.75rem 1rem',
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#991b1b', borderRadius: '8px', fontSize: '0.875rem',
  },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  entry: {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: '8px', padding: '0.875rem 1rem',
  },
  entryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' },
  entryStatut: { fontSize: '0.8125rem', fontWeight: 600, color: '#475569' },
  entryDate: { fontSize: '0.75rem', color: '#94a3b8' },
  entrySujet: { fontSize: '0.9375rem', color: '#0f172a', marginBottom: '0.25rem' },
  entryMeta: { fontSize: '0.75rem', color: '#94a3b8' },
};
