import type { CmsFieldSelect } from '../../../../cms.types';

interface SelectFieldProps {
  field: CmsFieldSelect;
  value: string;
  onChange: (value: string) => void;
}

export function SelectField({ field, value, onChange }: SelectFieldProps) {
  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
      {field.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{field.description}</p>}
      <select
        value={value ?? field.defaultValue ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={styles.select}
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
  select: {
    display: 'block',
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    background: '#fff',
    color: '#1e293b',
    cursor: 'pointer',
  },
};
