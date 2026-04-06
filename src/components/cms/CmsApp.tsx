import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth } from './hooks/useAuth';
import { useToast, type Toast } from './hooks/useToast';
import { LoginForm } from './LoginForm';
import { Dashboard } from './Dashboard';
import { SingletonEditor } from './SingletonEditor';
import { CollectionList } from './CollectionList';
import { CollectionEditor } from './CollectionEditor';
import { MediaLibrary } from './MediaLibrary';
import { SectionManager } from './SectionManager';
import { SeoEditor } from './SeoEditor';
import { ThemeEditor } from './ThemeEditor';
import { ToastContainer } from './ui/Toast';
import cmsConfig from '../../../cms.config';

// ─── Route parsing ───────────────────────────────────────────────

interface Route {
  view: 'dashboard' | 'singleton' | 'collection' | 'collection-edit' | 'media' | 'sections' | 'seo' | 'theme';
  key?: string;
  slug?: string;
}

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts[0] === 'media') return { view: 'media' };
  if (parts[0] === 'sections') return { view: 'sections' };
  if (parts[0] === 'seo') return { view: 'seo' };
  if (parts[0] === 'theme') return { view: 'theme' };
  if (parts[0] === 'singleton' && parts[1]) return { view: 'singleton', key: parts[1] };
  if (parts[0] === 'collection' && parts[1] && parts[2]) return { view: 'collection-edit', key: parts[1], slug: parts[2] };
  if (parts[0] === 'collection' && parts[1]) return { view: 'collection', key: parts[1] };
  return { view: 'dashboard' };
}

export function navigate(hash: string) {
  window.location.hash = hash;
}

// ─── Toast context ───────────────────────────────────────────────

interface ToastContextType {
  addToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToastContext() {
  return useContext(ToastContext);
}

// ─── Breadcrumb ──────────────────────────────────────────────────

function getBreadcrumbs(route: Route): Array<{ label: string; hash: string }> {
  const crumbs: Array<{ label: string; hash: string }> = [];

  if (route.view === 'dashboard') return crumbs;

  if (route.view === 'singleton' && route.key) {
    const s = cmsConfig.singletons[route.key];
    crumbs.push({ label: s?.label || route.key, hash: `#/singleton/${route.key}` });
  }

  if (route.view === 'collection' && route.key) {
    const c = cmsConfig.collections[route.key];
    crumbs.push({ label: c?.label || route.key, hash: `#/collection/${route.key}` });
  }

  if (route.view === 'collection-edit' && route.key) {
    const c = cmsConfig.collections[route.key];
    crumbs.push({ label: c?.label || route.key, hash: `#/collection/${route.key}` });
    const slugLabel = route.slug === 'new' ? 'Nouveau' : route.slug || '';
    crumbs.push({ label: slugLabel, hash: `#/collection/${route.key}/${route.slug}` });
  }

  if (route.view === 'media') crumbs.push({ label: 'Images', hash: '#/media' });
  if (route.view === 'sections') crumbs.push({ label: 'Sections', hash: '#/sections' });
  if (route.view === 'seo') crumbs.push({ label: 'SEO', hash: '#/seo' });
  if (route.view === 'theme') crumbs.push({ label: 'Apparence', hash: '#/theme' });

  return crumbs;
}

// ─── App ─────────────────────────────────────────────────────────

export function CmsApp() {
  const { checking, authenticated, login, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [route, setRoute] = useState<Route>(parseHash);

  const onHashChange = useCallback(() => {
    setRoute(parseHash());
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [onHashChange]);

  // Loading
  if (checking) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>Chargement...</span>
      </div>
    );
  }

  // Login
  if (!authenticated) {
    return <LoginForm onLogin={login} />;
  }

  const breadcrumbs = getBreadcrumbs(route);
  const isHome = route.view === 'dashboard';

  // Authenticated
  return (
    <ToastContext.Provider value={{ addToast }}>
      <div style={styles.app}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <a href="#/" style={styles.headerHome} title="Retour au tableau de bord">
              {cmsConfig.siteName}
            </a>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} style={styles.breadcrumbSep}>
                <span style={styles.breadcrumbArrow}>/</span>
                {i === breadcrumbs.length - 1 ? (
                  <span style={styles.breadcrumbCurrent}>{crumb.label}</span>
                ) : (
                  <a href={crumb.hash} style={styles.breadcrumbLink}>{crumb.label}</a>
                )}
              </span>
            ))}
          </div>
          <div style={styles.headerRight}>
            {!isHome && (
              <button onClick={() => navigate('#/')} style={styles.backBtn} title="Tableau de bord">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            )}
            <a href="/" target="_blank" rel="noopener" style={styles.viewSiteBtn} title="Voir le site">
              Voir le site &#8599;
            </a>
            <button onClick={logout} style={styles.logoutBtn}>
              Deconnexion
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={styles.main} key={route.view + (route.key || '') + (route.slug || '')}>
          {route.view === 'dashboard' && <Dashboard config={cmsConfig} />}
          {route.view === 'media' && <MediaLibrary />}
          {route.view === 'sections' && <SectionManager />}
          {route.view === 'seo' && <SeoEditor />}
          {route.view === 'theme' && <ThemeEditor />}

          {route.view === 'singleton' && route.key && (
            <SingletonEditor config={cmsConfig} singletonKey={route.key} />
          )}

          {route.view === 'collection' && route.key && (
            <CollectionList config={cmsConfig} collectionKey={route.key} />
          )}

          {route.view === 'collection-edit' && route.key && route.slug && (
            <CollectionEditor config={cmsConfig} collectionKey={route.key} slug={route.slug} />
          )}
        </main>

        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '1.125rem',
    color: '#64748b',
    gap: '12px',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  app: {
    minHeight: '100vh',
    background: '#f8fafc',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.625rem 1.25rem',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
    gap: '0.75rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    minWidth: 0,
    overflow: 'hidden',
  },
  headerHome: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#0f172a',
    textDecoration: 'none',
    flexShrink: 0,
  },
  breadcrumbSep: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0',
  },
  breadcrumbArrow: {
    margin: '0 0.5rem',
    color: '#cbd5e1',
    fontSize: '0.875rem',
    fontWeight: 400,
  },
  breadcrumbLink: {
    fontSize: '0.875rem',
    color: '#64748b',
    textDecoration: 'none',
  },
  breadcrumbCurrent: {
    fontSize: '0.875rem',
    color: '#0f172a',
    fontWeight: 500,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
    padding: 0,
  },
  viewSiteBtn: {
    fontSize: '0.8125rem',
    color: '#2563eb',
    textDecoration: 'none',
    padding: '0.375rem 0.75rem',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    fontWeight: 500,
  },
  logoutBtn: {
    fontSize: '0.8125rem',
    color: '#64748b',
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.375rem 0.75rem',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '1.5rem 1rem',
    animation: 'fadeIn 0.2s ease-out',
  },
};
