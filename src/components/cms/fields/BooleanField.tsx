import type { CmsFieldBoolean } from '../../../../cms.types';

interface BooleanFieldProps {
  field: CmsFieldBoolean;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanField({ field, value, onChange }: BooleanFieldProps) {
  // Valeur effective : si la donnée est undefined/null, on retombe sur defaultValue puis false.
  const checked = value === true ? true : value === false ? false : field.defaultValue ?? false;

  return (
    <div style={styles.wrapper}>
      <label style={styles.row}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          style={{
            ...styles.track,
            background: checked ? '#059669' : '#cbd5e1',
          }}
        >
          <span
            style={{
              ...styles.knob,
              transform: checked ? 'translateX(20px)' : 'translateX(2px)',
            }}
          />
        </button>
        <span style={styles.labelText}>
          {field.label}
          {field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
        </span>
      </label>
      {field.description && <p style={styles.description}>{field.description}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    marginBottom: '1rem',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    cursor: 'pointer',
  },
  track: {
    position: 'relative' as const,
    flexShrink: 0,
    width: '42px',
    height: '24px',
    borderRadius: '999px',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  knob: {
    position: 'absolute' as const,
    top: '2px',
    left: 0,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.15s',
  },
  labelText: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  description: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '4px 0 0 52px',
  },
};
