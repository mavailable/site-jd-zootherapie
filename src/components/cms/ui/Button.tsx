import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

const variants: Record<string, React.CSSProperties> = {
  primary: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  danger: {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
  },
};

export function Button({ variant = 'primary', style, children, ...props }: ButtonProps) {
  return (
    <button
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        ...variants[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
