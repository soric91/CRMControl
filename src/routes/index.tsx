import { Navigate, createHashRouter } from 'react-router';
import { CrumbRoute } from '../components/layout/Breadcrumbs';
import { AppShell } from '../components/layout/AppShell';
import { PasswordChangeGate } from '../components/guards/PasswordChangeGate';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { RoleGate } from '../components/guards/RoleGate';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ClientDetailPage } from '../features/clients/ClientDetailPage';
import { ClientLayout } from '../features/clients/ClientLayout';
import { ClientsPage } from '../features/clients/ClientsPage';
import { EquipmentDetailPage } from '../features/equipment/EquipmentDetailPage';
import { GatewaysFleetPage } from '../features/fleet/GatewaysFleetPage';
import { EquipmentLayout } from '../features/equipment/EquipmentLayout';
import { GatewayDetailPage } from '../features/gateways/GatewayDetailPage';
import { GatewayLayout } from '../features/gateways/GatewayLayout';
import { ServiceAccountsPage } from '../features/services/ServiceAccountsPage';
import { SiteDetailPage } from '../features/sites/SiteDetailPage';
import { SiteLayout } from '../features/sites/SiteLayout';
import { TariffsPage } from '../features/tariffs/TariffsPage';
import { UsersPage } from '../features/users/UsersPage';
import { useAuth } from '../hooks/useAuth';
import {
  LANDING_PATH,
  canBrowsePlatform,
  canManageServiceAccounts,
  canManageUsers,
} from '../lib/permissions';

function NotFound() {
  const { user } = useAuth();
  return (
    <EmptyState
      title="Esta página no existe"
      description="Puede que el enlace esté mal escrito o que el recurso ya no esté disponible."
      action={
        user && (
          <Button variant="primary" onClick={() => window.history.back()}>
            Volver
          </Button>
        )
      }
    />
  );
}

export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // Nada del panel se monta mientras la contraseña siga siendo la que
        // generó un administrador.
        element: <PasswordChangeGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                index: true,
                element: <Navigate to={LANDING_PATH} replace />,
              },
              { path: 'cuenta/password', element: <ChangePasswordPage /> },

              // The hierarchy: cliente → sede → gateway → equipo → variables.
              {
                element: <RoleGate allow={canBrowsePlatform} />,
                children: [
                  {
                    path: 'clients',
                    element: <CrumbRoute to="/clients" label="Clientes" />,
                    children: [
                      { index: true, element: <ClientsPage /> },
                      {
                        path: ':clientId',
                        element: <ClientLayout />,
                        children: [
                          { index: true, element: <ClientDetailPage /> },
                          {
                            path: 'sites/:siteId',
                            element: <SiteLayout />,
                            children: [
                              { index: true, element: <SiteDetailPage /> },
                              {
                                path: 'gateways/:gatewayId',
                                element: <GatewayLayout />,
                                children: [
                                  {
                                    index: true,
                                    element: <GatewayDetailPage />,
                                  },
                                  {
                                    path: 'equipment/:equipmentId',
                                    element: <EquipmentLayout />,
                                    children: [
                                      {
                                        index: true,
                                        element: <EquipmentDetailPage />,
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },

              {
                // La flota se mira de plano, sin bajar por la jerarquía.
                path: 'gateways',
                element: <RoleGate allow={canBrowsePlatform} />,
                children: [{ index: true, element: <GatewaysFleetPage /> }],
              },
              {
                // Las tarifas son de la plataforma, no de un cliente: viven fuera
                // de la jerarquía.
                path: 'tariffs',
                element: <RoleGate allow={canBrowsePlatform} />,
                children: [{ index: true, element: <TariffsPage /> }],
              },
              {
                path: 'users',
                element: <RoleGate allow={canManageUsers} />,
                children: [{ index: true, element: <UsersPage /> }],
              },
              {
                // Credenciales de otros sistemas. Fuera de la jerarquía y
                // fuera de Usuarios: no son cuentas de personas.
                path: 'service-accounts',
                element: <RoleGate allow={canManageServiceAccounts} />,
                children: [{ index: true, element: <ServiceAccountsPage /> }],
              },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
]);
