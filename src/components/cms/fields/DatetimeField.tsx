import type { CmsFieldDatetime } from '../../../../cms.types';
import { t } from '../locales';

interface DatetimeFieldProps {
  field: CmsFieldDatetime;
  value: string; // stocké en JSON au format ISO (ex: "2026-05-06T10:25:00.000Z")
  onChange: (value: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

// ISO (UTC) → valeur locale pour <input type="datetime-local"> (YYYY-MM-DDTHH:mm),
// exprimée dans le fuseau du navigateur. C'est le sens "round-trip" critique :
// une valeur publish_at existante doit s'afficher correctement dans le picker.
function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Valeur locale du picker → ISO (UTC) pour stockage JSON.
function localInputToIso(local: string): string {
  if (!local) return '';
  const d = new Date(local); // interprété en local par le navigateur
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export function DatetimeField({ field, value, onChange }: DatetimeFieldProps) {
  const localValue = isoToLocalInput(value ?? '');

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {field.label}
        {field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
      </label>
      {field.description && <p style={styles.description}>{field.description}</p>}
      <div style={styles.row}>
        <input
          type="datetime-local"
          value={localValue}
          onChange={(e) => onChange(localInputToIso(e.target.value))}
          style={styles.input}
        />
        {localValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={styles.clearBtn}
            title={t('datetimeClear')}
          >
            {t('datetimeClear')}
          </button>
        )}
      </div>
      <p style={styles.hint}>{localValue ? t('datetimeScheduledHint') : t('datetimeImmediateHint')}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.375rem',
  },
  description: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '0 0 4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  input: {
    padding: '0.625rem 0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    background: '#fff',
    color: '#1e293b',
  },
  clearBtn: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '6px 0 0',
  },
};
