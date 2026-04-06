import type { CmsFieldObject } from '../../../../cms.types';
import { FieldRenderer } from './FieldRenderer';

interface ObjectFieldProps {
  field: CmsFieldObject;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export function ObjectField({ field, value, onChange }: ObjectFieldProps) {
  const data = value ?? {};

  function handleFieldChange(fieldKey: string, fieldValue: unknown) {
    onChange({ ...data, [fieldKey]: fieldValue });
  }

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}</label>
      <div style={styles.group}>
        {Object.entries(field.fields).map(([key, subField]) => (
          <FieldRenderer
            key={key}
            field={subField}
            value={data[key]}
            onChange={(val) => handleFieldChange(key, val)}
          />
        ))}
      </div>
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
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.5rem',
  },
  group: {
    padding: '1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#f8fafc',
  },
};
