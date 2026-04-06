import type { CmsFieldDate } from '../../../../cms.types';

interface DateFieldProps {
  field: CmsFieldDate;
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ field, value, onChange }: DateFieldProps) {
  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
      {field.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{field.description}</p>}
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
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
  input: {
    display: 'block',
    padding: '0.625rem 0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    background: '#fff',
    color: '#1e293b',
  },
};
