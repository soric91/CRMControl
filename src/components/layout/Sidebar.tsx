import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import type { UserRole } from '../../api';
import { cx } from '../../lib/cx';
import {
  canBrowsePlatform,
  canManageServiceAccounts,
  canManageUsers,
} from '../../lib/permissions';
import {
  IconClients,
  IconGateway,
  IconServiceKey,
  IconTariffs,
  IconUsers,
} from '../ui/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  visible: (role: UserRole) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/clients',
    label: 'Clientes',
    icon: <IconClients />,
    visible: canBrowsePlatform,
  },
  {
    to: '/gateways',
    label: 'Gateways',
    icon: <IconGateway />,
    visible: canBrowsePlatform,
  },
  {
    to: '/tariffs',
    label: 'Tarifas',
    icon: <IconTariffs />,
    visible: canBrowsePlatform,
  },
  {
    to: '/users',
    label: 'Usuarios',
    icon: <IconUsers />,
    visible: canManageUsers,
  },
  {
    to: '/service-accounts',
    label: 'Servicios',
    icon: <IconServiceKey />,
    visible: canManageServiceAccounts,
  },
];

export interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
  /** Closes the mobile drawer after a navigation. */
  onNavigate?: () => void;
}

export function Sidebar({ role, collapsed, onNavigate }: SidebarProps) {
  const items = NAV_ITEMS.filter((item) => item.visible(role));

  return (
    <nav
      aria-label="Navegación principal"
      className="flex h-full flex-col gap-1 p-3"
    >
      <div
        className={cx(
          'mb-4 flex items-center gap-2.5 px-1.5',
          collapsed && 'justify-center',
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-contrast">
          E
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-content">
            EMS Console
          </span>
        )}
      </div>

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
              collapsed && 'justify-center',
              isActive
                ? 'bg-accent-soft font-medium text-accent-soft-content'
                : 'text-content-muted hover:bg-surface-muted hover:text-content',
            )
          }
        >
          {item.icon}
          {!collapsed && item.label}
        </NavLink>
      ))}
    </nav>
  );
}
