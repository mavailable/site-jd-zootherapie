import type { CmsFieldText } from '../../../../cms.types';

interface TextFieldProps {
  field: CmsFieldText;
  value: string;
  onChange: (value: string) => void;
}

function FieldDescription({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  const parts = text.split(urlRegex);
  return (
    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>
      {parts.map((part, i) =>
        urlRegex.lastIndex = 0,
        urlRegex.test(part) ? (
          <a key={i} href={part.startsWith('http') ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{part}</a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export function TextField({ field, value, onChange }: TextFieldProps) {
  if (field.multiline) {
    return (
      <div style={styles.wrapper}>
        <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
        {field.description && <FieldDescription text={field.description} />}
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
      {field.description && <FieldDescription text={field.description} />}
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
