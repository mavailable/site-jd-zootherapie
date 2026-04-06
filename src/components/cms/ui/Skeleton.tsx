export function Skeleton({ width = '100%', height = 20 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export function SkeletonForm() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '1.5rem' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <Skeleton width="30%" height={14} />
          <div style={{ height: 8 }} />
          <Skeleton height={40} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <Skeleton width="60%" height={18} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div>
      <Skeleton width="20%" height={12} />
      <div style={{ height: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
            <Skeleton width="70%" height={18} />
            <div style={{ height: 8 }} />
            <Skeleton width="90%" height={14} />
            <div style={{ height: 12 }} />
            <Skeleton width="30%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
