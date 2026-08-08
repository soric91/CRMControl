import { useNavigate } from 'react-router';
import type { User } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLE_LABEL } from '../../lib/formatters';
import { canBrowsePlatform } from '../../lib/permissions';
import { IconMenu, IconSidebar } from '../ui/Icon';
import { Menu } from '../ui/Menu';
import { GlobalSearch } from './GlobalSearch';
import { ThemeToggle } from './ThemeToggle';

export interface TopbarProps {
  user: User;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}

export function Topbar({
  user,
  onToggleSidebar,
  onOpenMobileNav,
}: TopbarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <button
        type="button"
        aria-label="Abrir navegación"
        onClick={onOpenMobileNav}
        className="rounded-md p-1.5 text-content-muted transition-colors hover:bg-surface-muted hover:text-content lg:hidden"
      >
        <IconMenu />
      </button>
      <button
        type="button"
        aria-label="Contraer o expandir la navegación"
        onClick={onToggleSidebar}
        className="hidden rounded-md p-1.5 text-content-muted transition-colors hover:bg-surface-muted hover:text-content lg:block"
      >
        <IconSidebar />
      </button>

      {canBrowsePlatform(user.role) && <GlobalSearch />}

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-2 border-l border-line pl-2">
          <div className="hidden text-right sm:block">
            <p className="max-w-45 truncate text-xs font-medium text-content">
              {user.email}
            </p>
            <p className="text-[0.6875rem] text-content-subtle">
              {USER_ROLE_LABEL[user.role]}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-content"
          >
            {user.email.slice(0, 2).toUpperCase()}
          </span>
          <Menu
            label="Menú de cuenta"
            items={[
              {
                label: 'Cambiar contraseña',
                onSelect: () => {
                  void navigate('/cuenta/password');
                },
              },
              { label: 'Cerrar sesión', onSelect: signOut, danger: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
