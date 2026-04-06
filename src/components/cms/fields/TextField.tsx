import type { CmsFieldText } from '../../../../cms.types';

interface TextFieldProps {
  field: CmsFieldText;
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ field, value, onChange }: TextFieldProps) {
  if (field.multiline) {
    return (
      <div style={styles.wrapper}>
        <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
        {field.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{field.description}</p>}
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          style={{ ...styles.input, ...styles.textarea }}
        />
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
        {field.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{field.description}</p>}
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
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
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    background: '#fff',
    color: '#1e293b',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  textarea: {
    resize: 'vertical' as const,
    minHeight: '80px',
    lineHeight: 1.6,
  },
};
