import { useState } from 'react';
import type { CmsFieldMultiselect } from '../../../../cms.types';

interface MultiselectFieldProps {
  field: CmsFieldMultiselect;
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultiselectField({ field, value, onChange }: MultiselectFieldProps) {
  const selected = Array.isArray(value) ? value : [];
  const [isOpen, setIsOpen] = useState(false);

  function toggle(optionValue: string) {
    const next = selected.includes(optionValue)
      ? selected.filter((v) => v !== optionValue)
      : [...selected, optionValue];

    // Enforce maxItems
    if (field.maxItems && next.length > field.maxItems) return;

    onChange(next);
  }

  function remove(optionValue: string) {
    onChange(selected.filter((v) => v !== optionValue));
  }

  const labelFor = (v: string) => field.options.find((o) => o.value === v)?.label ?? v;

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {field.label}
        {field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
      </label>
      {field.description && (
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px' }}>{field.description}</p>
      )}

      {/* Pills — selected values */}
      {selected.length > 0 && (
        <div style={styles.pills}>
          {selected.map((v) => (
            <span key={v} style={styles.pill}>
              {labelFor(v)}
              <button
                type="button"
                onClick={() => remove(v)}
                style={styles.pillRemove}
                aria-label={`Retirer ${labelFor(v)}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={styles.toggleBtn}
      >
        {isOpen ? 'Fermer' : selected.length === 0 ? 'Choisir...' : 'Modifier'}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.6 }}>
          {selected.length}/{field.options.length}
          {field.maxItems ? ` (max ${field.maxItems})` : ''}
        </span>
      </button>

      {/* Checkbox grid */}
      {isOpen && (
        <div style={styles.grid}>
          {field.options.map((opt) => {
            const checked = selected.includes(opt.value);
            const disabled = !checked && !!field.maxItems && selected.length >= field.maxItems;
            return (
              <label
                key={opt.value}
                style={{
                  ...styles.option,
                  ...(checked ? styles.optionChecked : {}),
                  ...(disabled ? styles.optionDisabled : {}),
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(opt.value)}
                  style={{ marginRight: '0.5rem', accentColor: '#2563eb' }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}

      {field.minItems && selected.length < field.minItems && (
        <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
          Minimum {field.minItems} sélection{field.minItems > 1 ? 's' : ''}
        </p>
      )}
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
  pills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    marginBottom: '0.5rem',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.625rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#1e40af',
    background: '#dbeafe',
    borderRadius: '9999px',
  },
  pillRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    fontSize: '0.875rem',
    lineHeight: 1,
    color: '#1e40af',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
    marginLeft: '2px',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: '#475569',
    background: '#f8fafc',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.375rem',
    marginTop: '0.5rem',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#fff',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.375rem 0.5rem',
    fontSize: '0.8125rem',
    color: '#374151',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  optionChecked: {
    background: '#eff6ff',
    fontWeight: 500,
  },
  optionDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
