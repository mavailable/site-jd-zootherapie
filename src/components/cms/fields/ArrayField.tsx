import type { CmsFieldArray } from '../../../../cms.types';
import { FieldRenderer } from './FieldRenderer';

interface ArrayFieldProps {
  field: CmsFieldArray;
  value: unknown[];
  onChange: (value: unknown[]) => void;
}

export function ArrayField({ field, value, onChange }: ArrayFieldProps) {
  const items = Array.isArray(value) ? value : [];

  function addItem() {
    if (field.item.type === 'object') {
      // Créer un objet vide avec les champs par défaut
      const empty: Record<string, unknown> = {};
      Object.entries(field.item.fields).forEach(([key, f]) => {
        if (f.type === 'number' && 'defaultValue' in f) {
          empty[key] = f.defaultValue;
        } else if (f.type === 'select' && 'defaultValue' in f) {
          empty[key] = f.defaultValue;
        } else if (f.type === 'number') {
          empty[key] = 0;
        } else {
          empty[key] = '';
        }
      });
      onChange([...items, empty]);
    } else {
      onChange([...items, '']);
    }
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  }

  function updateItem(index: number, newValue: unknown) {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  }

  function getItemLabel(item: unknown, index: number): string {
    if (field.itemLabel && typeof item === 'object' && item !== null) {
      const val = (item as Record<string, unknown>)[field.itemLabel];
      if (typeof val === 'string' && val.trim()) {
        return val.length > 50 ? val.slice(0, 50) + '...' : val;
      }
    }
    return `Élément ${index + 1}`;
  }

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}</label>

      {items.map((item, index) => (
        <div key={index} style={styles.item}>
          <div style={styles.itemHeader}>
            <span style={styles.itemLabel}>{getItemLabel(item, index)}</span>
            <div style={styles.itemActions}>
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                style={styles.moveBtn}
                title="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                style={styles.moveBtn}
                title="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                style={styles.removeBtn}
                title="Supprimer"
              >
                ×
              </button>
            </div>
          </div>
          <div style={styles.itemContent}>
            {field.item.type === 'object' ? (
              Object.entries(field.item.fields).map(([key, subField]) => (
                <FieldRenderer
                  key={key}
                  field={subField}
                  value={(item as Record<string, unknown>)?.[key]}
                  onChange={(val) => {
                    updateItem(index, {
                      ...(item as Record<string, unknown>),
                      [key]: val,
                    });
                  }}
                />
              ))
            ) : (
              <FieldRenderer
                field={field.item}
                value={item}
                onChange={(val) => updateItem(index, val)}
              />
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addItem} style={styles.addBtn}>
        + Ajouter
      </button>
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
  item: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    background: '#fff',
    overflow: 'hidden',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  itemLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
  },
  itemActions: {
    display: 'flex',
    gap: '0.25rem',
  },
  moveBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    background: '#fff',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  removeBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    background: '#fff',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '1.125rem',
    fontWeight: 700,
  },
  itemContent: {
    padding: '0.75rem',
  },
  addBtn: {
    width: '100%',
    padding: '0.625rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px dashed #93c5fd',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
};
