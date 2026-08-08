import { useState } from 'react';
import { Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { cx } from '../../lib/cx';
import { Overlay } from '../ui/Overlay';
import { Breadcrumbs, BreadcrumbsProvider } from './Breadcrumbs';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const SIDEBAR_STORAGE_KEY = 'crm.sidebar-collapsed';

/** The frame every authenticated screen renders inside. */
export function AppShell() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true',
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // `ProtectedRoute` guarantees a user before this renders.
  if (!user) return null;

  return (
    <BreadcrumbsProvider>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <aside
          className={cx(
            'hidden shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          <Sidebar role={user.role} collapsed={collapsed} />
        </aside>

        {/* Below lg the sidebar becomes a drawer. */}
        <Overlay
          open={mobileNavOpen}
          onClose={() => {
            setMobileNavOpen(false);
          }}
          labelledBy="mobile-nav-title"
          className="h-full w-64 border-r border-line"
        >
          <h2 id="mobile-nav-title" className="sr-only">
            Navegación
          </h2>
          <Sidebar
            role={user.role}
            collapsed={false}
            onNavigate={() => {
              setMobileNavOpen(false);
            }}
          />
        </Overlay>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            onToggleSidebar={() => {
              setCollapsed((current) => {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!current));
                return !current;
              });
            }}
            onOpenMobileNav={() => {
              setMobileNavOpen(true);
            }}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
              <Breadcrumbs />
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </BreadcrumbsProvider>
  );
}
