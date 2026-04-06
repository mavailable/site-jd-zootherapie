import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useCallback, useEffect } from 'react';
import type { CmsFieldRichText } from '../../../../cms.types';

interface RichTextFieldProps {
  field: CmsFieldRichText;
  value: string;
  onChange: (value: string) => void;
}

export function RichTextField({ field, value, onChange }: RichTextFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync externe → éditeur (si la valeur change de l'extérieur)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL du lien :', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
      {field.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{field.description}</p>}
      <div style={styles.editor}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Gras"
          >
            <strong>G</strong>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italique"
          >
            <em>I</em>
          </ToolbarButton>
          <span style={styles.separator} />
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Titre 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Titre 3"
          >
            H3
          </ToolbarButton>
          <span style={styles.separator} />
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Liste à puces"
          >
            •
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Liste numérotée"
          >
            1.
          </ToolbarButton>
          <span style={styles.separator} />
          <ToolbarButton
            active={editor.isActive('link')}
            onClick={setLink}
            title="Lien"
          >
            🔗
          </ToolbarButton>
        </div>

        {/* Editor content */}
        <div style={styles.content}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        ...toolbarBtnStyles.base,
        ...(active ? toolbarBtnStyles.active : {}),
      }}
    >
      {children}
    </button>
  );
}

const toolbarBtnStyles: Record<string, React.CSSProperties> = {
  base: {
    padding: '4px 8px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    border: '1px solid transparent',
    borderRadius: '4px',
    background: 'none',
    color: '#475569',
    cursor: 'pointer',
    minWidth: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    background: '#eff6ff',
    color: '#2563eb',
    borderColor: '#bfdbfe',
  },
};

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
  editor: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#fff',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    flexWrap: 'wrap' as const,
  },
  separator: {
    width: '1px',
    height: '20px',
    background: '#e2e8f0',
    margin: '0 4px',
  },
  content: {
    padding: '0.75rem',
    minHeight: '200px',
    fontSize: '0.9375rem',
    lineHeight: 1.6,
  },
};
