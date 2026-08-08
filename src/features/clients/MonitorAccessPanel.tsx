import { useEffect, useState } from 'react';
import { clientsApi } from '../../api';
import type { MonitorAccessCreated } from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SecretRevealDialog } from '../../components/ui/SecretRevealDialog';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { formatDateTime } from '../../lib/formatters';

export interface MonitorAccessPanelProps {
  clientId: string;
  writable: boolean;
  /** Set by the parent right after `puede_ver_consumo` is switched on. */
  autoCreate: boolean;
  onAutoCreateHandled: () => void;
}

/**
 * The client's login to the monitoring web.
 *
 * The password only exists in the response that creates or resets it, so it is
 * shown once in a dialog and never again. Losing it means resetting.
 */
export function MonitorAccessPanel({
  clientId,
  writable,
  autoCreate,
  onAutoCreateHandled,
}: MonitorAccessPanelProps) {
  const { notify } = useToast();
  const [issued, setIssued] = useState<MonitorAccessCreated | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  const access = useResource(
    () => clientsApi.getMonitorAccess(clientId),
    [clientId],
  );

  // A 404 is the normal answer for a client that has no access yet, not a
  // failure worth an error screen.
  const missing = access.error?.code === 'not_found';

  const grant = async (mode: 'create' | 'reset') => {
    setWorking(true);
    try {
      const created =
        mode === 'create'
          ? await clientsApi.createMonitorAccess(clientId)
          : await clientsApi.resetMonitorAccess(clientId);
      setIssued(created);
      access.reload();
    } catch (caught: unknown) {
      // `business_rule_violation` here means the client has no contacto_email;
      // that message is written for the user, so it is shown as it comes.
      notify('error', asApiError(caught).message);
    } finally {
      setWorking(false);
      onAutoCreateHandled();
    }
  };

  const revoke = async () => {
    try {
      await clientsApi.revokeMonitorAccess(clientId);
      notify('success', 'Acceso revocado');
      access.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setConfirmingRevoke(false);
    }
  };

  // Switching `puede_ver_consumo` on is what triggers the first grant, so the
  // password appears once, at the moment the operator enables the panel.
  useEffect(() => {
    if (!autoCreate || access.loading || working) return;
    if (missing) void grant('create');
    else onAutoCreateHandled();
  }, [autoCreate, access.loading, missing]);

  const current = access.data;

  return (
    <>
      <Panel
        title="Acceso al monitoreo"
        actions={
          writable &&
          current && (
            <>
              <Button
                size="sm"
                loading={working}
                onClick={() => {
                  void grant(current.is_active ? 'reset' : 'create');
                }}
              >
                {current.is_active ? 'Regenerar contraseña' : 'Reactivar'}
              </Button>
              {current.is_active && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setConfirmingRevoke(true);
                  }}
                >
                  Revocar
                </Button>
              )}
            </>
          )
        }
      >
        {access.loading ? (
          <SkeletonPanel rows={2} />
        ) : missing ? (
          <EmptyState
            title="Este cliente todavía no tiene acceso"
            description="Se crea con el correo de contacto del cliente. La contraseña se muestra una sola vez."
            action={
              writable && (
                <Button
                  variant="primary"
                  loading={working}
                  onClick={() => {
                    void grant('create');
                  }}
                >
                  Crear acceso
                </Button>
              )
            }
          />
        ) : access.error ? (
          <ErrorState error={access.error} onRetry={access.reload} />
        ) : current ? (
          <DetailList
            items={[
              { label: 'Correo de acceso', value: current.email },
              {
                label: 'Estado',
                value: current.is_active ? (
                  <Badge tone="success" dot>
                    Activo
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>
                    Revocado
                  </Badge>
                ),
              },
              {
                label: 'Contraseña',
                value: current.must_change_password ? (
                  <Badge tone="warning">Pendiente de cambio</Badge>
                ) : (
                  <Badge tone="neutral">Elegida por el cliente</Badge>
                ),
              },
              { label: 'Creado', value: formatDateTime(current.created_at) },
            ]}
          />
        ) : null}
      </Panel>

      <SecretRevealDialog
        open={issued !== null}
        onClose={() => {
          setIssued(null);
        }}
        title="Contraseña de acceso"
        description="Se muestra una sola vez. Copiala y pasásela al cliente."
        fields={
          issued
            ? [
                {
                  label: 'Usuario',
                  value: issued.email,
                  copyLabel: 'Copiar el correo de acceso',
                },
                {
                  label: 'Contraseña temporal',
                  value: issued.temporary_password,
                  copyLabel: 'Copiar la contraseña temporal',
                },
              ]
            : []
        }
        warning="No se guarda en ningún lado y no se puede volver a ver. Si se pierde, regenerala. El cliente tiene que cambiarla la primera vez que entre."
      />

      <ConfirmDialog
        open={confirmingRevoke}
        title="Revocar acceso"
        message="El cliente deja de poder entrar a la web de monitoreo. La cuenta no se borra, así que podés reactivarla más adelante con una contraseña nueva."
        confirmLabel="Revocar"
        onCancel={() => {
          setConfirmingRevoke(false);
        }}
        onConfirm={revoke}
      />
    </>
  );
}
