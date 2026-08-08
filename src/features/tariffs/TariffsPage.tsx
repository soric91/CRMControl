import { useState } from 'react';
import { tariffsApi } from '../../api';
import type { Tariff } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { formatMonth } from '../../lib/formatters';
import { canWrite } from '../../lib/permissions';
import { TariffForm } from './TariffForm';
import { TariffsTable } from './TariffsTable';

type FormTarget = Tariff | 'new' | null;

export function TariffsPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [toDelete, setToDelete] = useState<Tariff | null>(null);

  const tariffs = usePaginatedResource((params) =>
    tariffsApi.listTariffs(params),
  );

  const writable = user !== null && canWrite(user.role);

  const remove = async (tariff: Tariff) => {
    try {
      await tariffsApi.deleteTariff(tariff.id);
      notify('success', `Tarifa de ${formatMonth(tariff.mes)} eliminada`);
      tariffs.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToDelete(null);
    }
  };

  const newTariffButton = writable ? (
    <Button
      variant="primary"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setFormTarget('new');
      }}
    >
      Nueva tarifa
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tarifas"
        description="Precios de energía por mes, para toda la plataforma. Son los que convierten el consumo en dinero."
        actions={newTariffButton}
      />

      <TariffsTable
        resource={tariffs}
        emptyAction={newTariffButton}
        rowActions={(tariff) =>
          writable ? (
            <Menu
              label={`Acciones de la tarifa de ${formatMonth(tariff.mes)}`}
              items={[
                {
                  label: 'Editar valores',
                  onSelect: () => {
                    setFormTarget(tariff);
                  },
                },
                {
                  label: 'Eliminar',
                  danger: true,
                  onSelect: () => {
                    setToDelete(tariff);
                  },
                },
              ]}
            />
          ) : null
        }
      />

      {formTarget !== null && (
        <TariffForm
          key={formTarget === 'new' ? 'new' : formTarget.id}
          tariff={formTarget === 'new' ? null : formTarget}
          onClose={() => {
            setFormTarget(null);
          }}
          onSaved={() => {
            setFormTarget(null);
            tariffs.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar tarifa"
        message={
          toDelete
            ? `Se eliminará la tarifa de ${formatMonth(toDelete.mes)}. El consumo de ese período deja de poder valorizarse hasta que cargues otra.`
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
