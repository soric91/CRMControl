import { useState } from 'react';
import { clientsApi, serviceAccountsApi } from '../../api';
import type { ServiceAccount, ServiceAccountCreated } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { SecretRevealDialog } from '../../components/ui/SecretRevealDialog';
import { useNameLookup } from '../../hooks/useNameLookup';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { ServiceAccountForm } from './ServiceAccountForm';
import { ServiceAccountsTable } from './ServiceAccountsTable';
import { PlatformSettingsPanel } from './PlatformSettingsPanel';

type FormTarget = ServiceAccount | 'new' | null;

/**
 * The credentials other systems use to read this API — today `ApiEMS`, for
 * tariffs and the installation tree.
 *
 * The secret exists in clear exactly once, in the response that issues or
 * rotates it. It is held in this component's state and dies with it: never
 * stored, never logged, never lifted into a context.
 */
export function ServiceAccountsPage() {
  const { notify } = useToast();

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [revealed, setRevealed] = useState<ServiceAccountCreated | null>(null);
  const [toRotate, setToRotate] = useState<ServiceAccount | null>(null);
  const [toDelete, setToDelete] = useState<ServiceAccount | null>(null);

  const { items: clients } = useNameLookup(
    (limit) => clientsApi.listClients({ limit }),
    (client) => client.id,
    (client) => client.nombre_empresa,
  );

  const accounts = usePaginatedResource(
    (params) => serviceAccountsApi.listServiceAccounts(params),
    [],
  );

  const rotate = async (target: ServiceAccount) => {
    try {
      setRevealed(await serviceAccountsApi.rotateServiceSecret(target.id));
      accounts.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToRotate(null);
    }
  };

  const setActive = async (target: ServiceAccount, activo: boolean) => {
    try {
      await serviceAccountsApi.updateServiceAccount(target.id, { activo });
      notify(
        'success',
        activo ? 'Credencial reactivada' : 'Credencial desactivada',
      );
      accounts.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    }
  };

  const remove = async (target: ServiceAccount) => {
    try {
      await serviceAccountsApi.deleteServiceAccount(target.id);
      notify('success', `Credencial de ${target.nombre} eliminada`);
      accounts.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToDelete(null);
    }
  };

  const newAccountButton = (
    <Button
      variant="primary"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setFormTarget('new');
      }}
    >
      Nueva credencial
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credenciales de servicio"
        description="Para sistemas, no para personas. Solo lectura, con permisos por separado y un token de una hora."
        actions={newAccountButton}
      />

      <ServiceAccountsTable
        resource={accounts}
        emptyAction={newAccountButton}
        rowActions={(target) => (
          <Menu
            label={`Acciones de ${target.nombre}`}
            items={[
              {
                label: 'Editar',
                onSelect: () => {
                  setFormTarget(target);
                },
              },
              {
                label: 'Rotar secreto',
                onSelect: () => {
                  setToRotate(target);
                },
              },
              {
                label: target.activo ? 'Desactivar' : 'Reactivar',
                onSelect: () => {
                  void setActive(target, !target.activo);
                },
              },
              {
                label: 'Eliminar',
                danger: true,
                onSelect: () => {
                  setToDelete(target);
                },
              },
            ]}
          />
        )}
      />

      {/* Debajo de las credenciales porque contesta la misma pregunta desde
          el otro lado: aquellas son con qué se conectan otros sistemas a
          este, y estas son con qué se conecta la flota al resto. */}
      <PlatformSettingsPanel />

      {formTarget !== null && (
        <ServiceAccountForm
          key={formTarget === 'new' ? 'new' : formTarget.id}
          account={formTarget === 'new' ? null : formTarget}
          clients={clients}
          onClose={() => {
            setFormTarget(null);
          }}
          onCreated={(created) => {
            setFormTarget(null);
            setRevealed(created);
            accounts.reload();
          }}
          onUpdated={() => {
            setFormTarget(null);
            accounts.reload();
          }}
        />
      )}

      <SecretRevealDialog
        open={revealed !== null}
        onClose={() => {
          setRevealed(null);
        }}
        title="Credencial de servicio"
        description="Los dos valores van al .env del sistema que la va a usar. El secreto se muestra una sola vez."
        fields={
          revealed
            ? [
                {
                  label: 'client_id',
                  value: revealed.credencial_id,
                  copyLabel: 'Copiar el identificador',
                },
                {
                  label: 'client_secret',
                  value: revealed.client_secret,
                  copyLabel: 'Copiar el secreto',
                },
              ]
            : []
        }
        warning="No se guarda en ningún lado y no se puede volver a ver. Si cerrás sin copiarlo, hay que rotar la credencial."
      />

      <ConfirmDialog
        open={toRotate !== null}
        title="Rotar el secreto"
        message={
          toRotate
            ? `El secreto actual de ${toRotate.nombre} deja de servir en el momento. Ese sistema no va a poder pedir tokens nuevos hasta que le cargues el que se genera ahora. Los tokens que ya tenga siguen valiendo hasta que venzan, como mucho una hora.`
            : ''
        }
        confirmLabel="Rotar"
        onCancel={() => {
          setToRotate(null);
        }}
        onConfirm={() => (toRotate ? rotate(toRotate) : undefined)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar credencial"
        message={
          toDelete
            ? `Se elimina la credencial de ${toDelete.nombre} y ese sistema deja de poder leer. Si querés conservar el registro de que existió, desactivala en vez de borrarla.`
            : ''
        }
        onCancel={() => {
          setToDelete(null);
        }}
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
      />
    </div>
  );
}
