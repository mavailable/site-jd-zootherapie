import { useState, useCallback } from 'react';
import { useToastContext } from './CmsApp';
import type { CmsConfig } from '../../../cms.types';

interface AccountTabProps {
  config: CmsConfig;
  onLogout: () => void;
}

// ─── Liens utiles Section ────────────────────────────────────────────────────

const LINK_ICONS: Record<string, string> = {
  'Mon site': '🌐',
  "M'appeler": '📞',
  'Mon WhatsApp': '💬',
};

function LinkCard({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const isWeb = url.startsWith('http');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  return (
    <div style={styles.linkCard}>
      <div style={styles.linkCardHeader}>
        <span style={styles.linkIcon}>{LINK_ICONS[label] ?? '🔗'}</span>
        <span style={styles.linkLabel}>{label}</span>
      </div>
      <div style={styles.linkUrlBox}>{url}</div>
      <div style={styles.linkActions}>
        <button onClick={handleCopy} style={styles.copyBtn}>
          {copied ? 'Copie !' : 'Copier'}
        </button>
        {isWeb && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={styles.openBtn}>
            Ouvrir &#8599;
          </a>
        )}
      </div>
    </div>
  );
}

function LinkSection({ config }: { config: CmsConfig }) {
  const site = config.site;

  const cards: Array<{ label: string; url: string }> = [];

  if (site?.siteUrl) {
    cards.push({ label: 'Mon site', url: site.siteUrl });
  }
  if (site?.phone) {
    const phoneDigits = site.phone.replace(/[^0-9]/g, '');
    cards.push({ label: "M'appeler", url: `tel:${site.phone}` });
    cards.push({ label: 'Mon WhatsApp', url: `https://wa.me/${phoneDigits}` });
  }

  if (cards.length === 0) return null;

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Mes liens utiles</h2>
      <div style={styles.linkGrid}>
        {cards.map((c) => (
          <LinkCard key={c.label} label={c.label} url={c.url} />
        ))}
      </div>
    </section>
  );
}

// ─── Signature Email Section ──────────────────────────────────────────────────

function SignatureSection({ config }: { config: CmsConfig }) {
  const site = config.site;
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const ownerName = site?.ownerName || config.siteName;
  const siteName = config.siteName;
  const tagline = site?.tagline || '';
  const phone = site?.phone || '';
  const email = site?.email || '';
  const siteUrl = site?.siteUrl ? site.siteUrl.replace(/^https?:\/\//, '') : '';
  const facebook = site?.facebookUrl || '';
  const linkedin = site?.linkedinUrl || '';

  const sep = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';

  const sig1Lines = [
    sep,
    ownerName,
    tagline,
    [phone, siteUrl].filter(Boolean).join(' | '),
    sep,
  ].filter((l) => l !== '');

  const sig2Lines = [
    sep,
    ownerName,
    [siteName, tagline].filter(Boolean).join(' \u2014 '),
    phone ? `\uD83D\uDCDE ${phone}${email ? '  \u2709 ' + email : ''}` : email ? `\u2709 ${email}` : '',
    siteUrl ? `\uD83C\uDF10 ${siteUrl}` : '',
    [facebook, linkedin].filter(Boolean).join('  '),
    sep,
  ].filter((l) => l !== '');

  const signatures = [
    { label: 'Variante minimale', text: sig1Lines.join('\n') },
    { label: 'Variante complete', text: sig2Lines.join('\n') },
  ];

  const handleCopy = useCallback((idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Signature email</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {signatures.map((sig, idx) => (
          <div key={idx} style={styles.sigCard}>
            <div style={styles.sigCardHeader}>
              <span style={styles.sigCardLabel}>{sig.label}</span>
              <button onClick={() => handleCopy(idx, sig.text)} style={styles.copyBtn}>
                {copiedIdx === idx ? 'Copie !' : 'Copier la signature'}
              </button>
            </div>
            <pre style={styles.sigPreview}>{sig.text}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Kit de Lancement Section ─────────────────────────────────────────────────

function KitLancementSection({ config }: { config: CmsConfig }) {
  const site = config.site;
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!site?.siteUrl) return null;

  const siteName = config.siteName;
  const siteUrl = site.siteUrl;

  const posts = [
    {
      label: 'Facebook perso',
      text: `Je suis fier de vous presenter le nouveau site internet de ${siteName} ! \uD83C\uDF89\nRetrouvez nos services, demandez un devis en ligne et consultez les avis de nos clients.\n\uD83D\uDC49 ${siteUrl}`,
    },
    {
      label: 'Facebook pro',
      text: `${siteName} est desormais en ligne !\nDecouvrez nos prestations, nos tarifs et les retours de nos clients sur notre nouveau site.\n${siteUrl}\nN'hesitez pas a partager ! \uD83D\uDE4F`,
    },
    {
      label: 'LinkedIn',
      text: `${siteName} lance son nouveau site internet.\nUne vitrine en ligne pour presenter nos services et faciliter la prise de contact.\n${siteUrl}\n#entrepreneur #artisan #siteweb`,
    },
  ];

  const handleCopy = useCallback((idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>Kit de lancement</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {posts.map((post, idx) => (
          <div key={idx} style={styles.sigCard}>
            <div style={styles.sigCardHeader}>
              <span style={styles.sigCardLabel}>{post.label}</span>
              <button onClick={() => handleCopy(idx, post.text)} style={styles.copyBtn}>
                {copiedIdx === idx ? 'Copie !' : 'Copier'}
              </button>
            </div>
            <pre style={styles.sigPreview}>{post.text}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AccountTab({ config, onLogout }: AccountTabProps) {
  const { addToast } = useToastContext();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const site = config.site;

  const marcPhone = site?.contactMarc?.phone || '06 88 76 66 48';
  const marcEmail = site?.contactMarc?.email || 'marc@muller.im';
  const marcWhatsapp = site?.contactMarc?.whatsapp || '33688766648';

  // Check if any identity section has data to show
  const hasIdentiteData = !!(site?.siteUrl || site?.phone || site?.email);

  return (
    <div style={styles.fadeIn}>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Mon site</h2>
        <div style={styles.infoCard}>
          <div style={styles.siteName}>{config.siteName}</div>
          {site?.siteUrl && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Adresse :</span>
              <a href={site.siteUrl} target="_blank" rel="noopener noreferrer" style={styles.infoLink}>
                {site.siteUrl.replace(/^https?:\/\//, '')} &#8599;
              </a>
            </div>
          )}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Vos modifications sont publiees automatiquement apres chaque enregistrement.
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Mot de passe</h2>
        {showPasswordForm ? (
          <ChangePasswordForm
            onClose={() => setShowPasswordForm(false)}
            onSuccess={() => {
              setShowPasswordForm(false);
              addToast('Mot de passe modifie avec succes.', 'success');
            }}
          />
        ) : (
          <button onClick={() => setShowPasswordForm(true)} style={styles.actionBtn}>
            Changer mon mot de passe
          </button>
        )}
      </section>

      {hasIdentiteData && (
        <>
          <LinkSection config={config} />
          <SignatureSection config={config} />
          <KitLancementSection config={config} />
        </>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Besoin d'aide ?</h2>
        <div style={styles.contactCard}>
          <p style={styles.contactText}>
            Marc est disponible pour toute question sur votre site.
          </p>
          <div style={styles.contactActions}>
            <a
              href={`https://wa.me/${marcWhatsapp}?text=Bonjour Marc, j'ai une question sur mon site ${config.siteName}.`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.whatsappBtn}
            >
              WhatsApp
            </a>
            <a
              href={`mailto:${marcEmail}?subject=Question sur mon site ${config.siteName}`}
              style={styles.emailBtn}
            >
              Email
            </a>
            <a href={`tel:+${marcWhatsapp}`} style={styles.phoneBtn}>
              {marcPhone}
            </a>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <button onClick={onLogout} style={styles.logoutBtn}>
          Se deconnecter
        </button>
      </section>
    </div>
  );
}

function ChangePasswordForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cms/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Une erreur est survenue.');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    }
    setSubmitting(false);
  }, [currentPassword, newPassword, confirmPassword, onSuccess]);

  return (
    <div style={styles.passwordForm}>
      <form onSubmit={handleSubmit}>
        {error && <div style={styles.error}>{error}</div>}
        <label style={styles.label}>
          Mot de passe actuel
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={styles.input} autoComplete="current-password" autoFocus required />
        </label>
        <label style={styles.label}>
          Nouveau mot de passe
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} autoComplete="new-password" minLength={6} required />
          <span style={styles.hint}>6 caracteres minimum</span>
        </label>
        <label style={styles.label}>
          Confirmer
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} autoComplete="new-password" minLength={6} required />
        </label>
        <div style={styles.formActions}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>Annuler</button>
          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Modification...' : 'Modifier'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },
  section: { marginBottom: '2rem' },
  sectionTitle: {
    fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.75rem',
  },
  infoCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' },
  siteName: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', fontSize: '0.875rem' },
  infoLabel: { color: '#64748b' },
  infoLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
  actionBtn: {
    fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', background: '#eff6ff',
    border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.75rem 1.25rem',
    cursor: 'pointer', width: '100%', textAlign: 'left' as const,
  },
  // Link cards
  linkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
  },
  linkCard: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem',
  },
  linkCardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  linkIcon: { fontSize: '1rem' },
  linkLabel: { fontSize: '0.8125rem', fontWeight: 600, color: '#334155' },
  linkUrlBox: {
    fontSize: '0.75rem', color: '#475569', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.625rem',
    fontFamily: 'monospace', wordBreak: 'break-all' as const, lineHeight: 1.4,
  },
  linkActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const },
  openBtn: {
    fontSize: '0.8125rem', fontWeight: 500, color: '#16a34a', background: '#f0fdf4',
    border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.5rem 1rem',
    textDecoration: 'none', whiteSpace: 'nowrap' as const,
  },
  // Signature + Kit shared
  sigCard: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem',
  },
  sigCardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '0.625rem', gap: '0.5rem', flexWrap: 'wrap' as const,
  },
  sigCardLabel: { fontSize: '0.8125rem', fontWeight: 600, color: '#334155' },
  sigPreview: {
    fontSize: '0.75rem', color: '#475569', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem',
    margin: 0, whiteSpace: 'pre-wrap' as const, fontFamily: 'monospace', lineHeight: 1.6,
  },
  // Shared copy button
  copyBtn: {
    fontSize: '0.8125rem', fontWeight: 500, color: '#2563eb', background: '#eff6ff',
    border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.5rem 1rem',
    cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
  },
  contactCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' },
  contactText: { fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem' },
  contactActions: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const },
  whatsappBtn: {
    fontSize: '0.8125rem', fontWeight: 600, color: '#fff', background: '#25d366',
    borderRadius: '8px', padding: '0.625rem 1.25rem', textDecoration: 'none',
  },
  emailBtn: {
    fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff',
    border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.625rem 1.25rem', textDecoration: 'none',
  },
  phoneBtn: {
    fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.625rem 1.25rem', textDecoration: 'none',
  },
  logoutBtn: {
    width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500,
    color: '#dc2626', background: '#fff', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer',
  },
  passwordForm: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '1rem' },
  input: { display: 'block', width: '100%', marginTop: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.9375rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' },
  hint: { display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  submitBtn: { padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#fff', background: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};
