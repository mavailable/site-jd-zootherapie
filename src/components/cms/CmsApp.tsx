import { useState, useEffect, useCallback, createContext, useContext, lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useToast, type Toast } from './hooks/useToast';
import { LoginForm } from './LoginForm';
import { HomeScreen } from './HomeScreen';
import { StatsTab } from './StatsTab';
import { AnalyticsTab } from './AnalyticsTab';
import { AccountTab } from './AccountTab';
import { BlogTab } from './BlogTab';
import { SingletonEditor } from './SingletonEditor';
import { CollectionList } from './CollectionList';
import { CollectionEditor } from './CollectionEditor';
import { MediaLibrary } from './MediaLibrary';
import { SectionManager } from './SectionManager';
import { SeoEditor } from './SeoEditor';
import { ThemeEditor } from './ThemeEditor';
import { ToastContainer } from './ui/Toast';
import cmsConfig from '../../../cms.config';

// Lazy-load du tab Marketing (optionnel, chargé uniquement si cmsConfig.marketing?.enabled)
// → bundle JS des projets sans marketing inchangé (MarketingPlanTab + PostCard ~1200 lignes)
const MarketingPlanTab = lazy(() =>
  import('./marketing/MarketingPlanTab').then((m) => ({ default: m.MarketingPlanTab }))
);

// ─── Route parsing ───────────────────────────────────────────────

type TabId = 'site' | 'blog' | 'stats' | 'analytics' | 'account' | 'marketing';

interface Route {
  view: 'home' | 'singleton' | 'collection' | 'collection-edit' | 'media' | 'sections' | 'seo' | 'theme' | 'stats' | 'analytics' | 'account' | 'blog' | 'marketing';
  key?: string;
  slug?: string;
}

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts[0] === 'blog') return { view: 'blog' };
  if (parts[0] === 'marketing') return { view: 'marketing' };
  if (parts[0] === 'stats') return { view: 'stats' };
  if (parts[0] === 'analytics') return { view: 'analytics' };
  if (parts[0] === 'account') return { view: 'account' };
  if (parts[0] === 'media') return { view: 'media' };
  if (parts[0] === 'sections') return { view: 'sections' };
  if (parts[0] === 'seo') return { view: 'seo' };
  if (parts[0] === 'theme') return { view: 'theme' };
  if (parts[0] === 'singleton' && parts[1]) return { view: 'singleton', key: parts[1] };
  if (parts[0] === 'collection' && parts[1] && parts[2]) return { view: 'collection-edit', key: parts[1], slug: parts[2] };
  if (parts[0] === 'collection' && parts[1]) return { view: 'collection', key: parts[1] };
  return { view: 'home' };
}

function getActiveTab(route: Route, hasBlog: boolean): TabId {
  if (route.view === 'blog') return 'blog';
  if (route.view === 'marketing') return 'marketing';
  if (route.view === 'stats') return 'stats';
  if (route.view === 'analytics') return 'analytics';
  if (route.view === 'account') return 'account';
  // La sous-vue collection blog reste taggee "blog" dans l'onglet
  if (hasBlog && (route.view === 'collection' || route.view === 'collection-edit') && route.key === 'blog') {
    return 'blog';
  }
  return 'site';
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

  if (route.view === 'home' || route.view === 'stats' || route.view === 'analytics' || route.view === 'account' || route.view === 'marketing') return crumbs;

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
  if (route.view === 'seo') crumbs.push({ label: 'Referencement', hash: '#/seo' });
  if (route.view === 'theme') crumbs.push({ label: 'Apparence', hash: '#/theme' });

  return crumbs;
}

// ─── Tabs ────────────────────────────────────────────────────────

const ALL_TABS: Array<{ id: TabId; label: string; icon: string; hash: string; requires?: 'blog' | 'marketing' }> = [
  { id: 'site', label: 'Mon Site', icon: '\u{1F3E0}', hash: '#/' },
  { id: 'blog', label: 'Blog', icon: '\u{270D}\u{FE0F}', hash: '#/blog', requires: 'blog' },
  { id: 'marketing', label: 'Marketing', icon: '\u{1F4E3}', hash: '#/marketing', requires: 'marketing' },
  { id: 'stats', label: 'Mon Activite', icon: '\u{2B50}', hash: '#/stats' },
  { id: 'analytics', label: 'Statistiques', icon: '\u{1F4CA}', hash: '#/analytics' },
  { id: 'account', label: 'Mon Compte', icon: '\u{1F464}', hash: '#/account' },
];

function getTabs(cfg: typeof cmsConfig) {
  return ALL_TABS.filter((t) => {
    if (t.requires === 'blog') return !!cfg.collections?.blog;
    if (t.requires === 'marketing') return !!cfg.marketing?.enabled;
    return true;
  });
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
  const hasBlog = !!cmsConfig.collections?.blog;
  const activeTab = getActiveTab(route, hasBlog);
  const isSubView = breadcrumbs.length > 0;
  const tabs = getTabs(cmsConfig);

  // Authenticated
  return (
    <ToastContext.Provider value={{ addToast }}>
      <div style={styles.app}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <a href="#/" style={styles.headerHome} title="Retour a l'accueil">
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
            {isSubView && (
              <button onClick={() => navigate('#/')} style={styles.backBtn} title="Retour">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            )}
            <a href="/" target="_blank" rel="noopener" style={styles.viewSiteBtn} title="Voir le site">
              Voir le site &#8599;
            </a>
          </div>
        </header>

        {/* Tab bar — desktop */}
        <nav style={styles.tabBar} className="cms-tabs-desktop">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={tab.hash}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <main style={styles.main} key={route.view + (route.key || '') + (route.slug || '')}>
          {route.view === 'home' && <HomeScreen config={cmsConfig} />}
          {route.view === 'blog' && <BlogTab config={cmsConfig} />}
          {route.view === 'marketing' && cmsConfig.marketing?.enabled && (
            <Suspense fallback={<div style={styles.loading}><div style={styles.spinner} /><span>Chargement du plan marketing...</span></div>}>
              <MarketingPlanTab />
            </Suspense>
          )}
          {route.view === 'stats' && <StatsTab config={cmsConfig} />}
          {route.view === 'analytics' && <AnalyticsTab config={cmsConfig} />}
          {route.view === 'account' && <AccountTab config={cmsConfig} onLogout={logout} />}
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

        {/* Tab bar — mobile (bottom) */}
        <nav style={styles.tabBarMobile} className="cms-tabs-mobile">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={tab.hash}
              style={{
                ...styles.tabMobile,
                ...(activeTab === tab.id ? styles.tabMobileActive : {}),
              }}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              <span style={styles.tabLabel}>{tab.label}</span>
            </a>
          ))}
        </nav>

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
    paddingBottom: '72px',
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
  // Desktop tab bar
  tabBar: {
    display: 'flex',
    gap: '0',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 1.25rem',
    position: 'sticky' as const,
    top: '45px',
    zIndex: 49,
  },
  tab: {
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: '#2563eb',
    fontWeight: 600,
    borderBottomColor: '#2563eb',
  },
  // Mobile bottom tab bar
  tabBarMobile: {
    display: 'none',
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    zIndex: 50,
    padding: '0.375rem 0',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tabMobile: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    flex: 1,
    padding: '0.5rem 0',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: '#94a3b8',
    textDecoration: 'none',
  },
  tabMobileActive: {
    color: '#2563eb',
    fontWeight: 600,
  },
  tabIcon: {
    fontSize: '1.25rem',
    lineHeight: 1,
  },
  tabLabel: {
    lineHeight: 1,
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '1.5rem 1rem',
    animation: 'fadeIn 0.2s ease-out',
  },
};
