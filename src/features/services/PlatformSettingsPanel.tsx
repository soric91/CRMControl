import { useCallback, useEffect, useState } from 'react';
import { platformSettingsApi } from '../../api';
import type { ApiError, PlatformSetting } from '../../api';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { IconPlus } from '../../components/ui/Icon';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { PlatformSettingForm } from './PlatformSettingForm';
import { PlatformSettingRow } from './PlatformSettingRow';
import { agrupar } from './grouping';

type FormTarget = 'new' | null;

/**
 * Los valores del `.env` que comparten todos los gateways.
 *
 * Hoy se escriben a mano en cada instalación, así que cambiar el host del
 * broker significa visitar cada sede — y un valor tecleado mal no falla al
 * arrancar, falla más tarde y en silencio.
 *
 * Vive debajo de las credenciales de servicio porque contesta la misma
 * pregunta desde el otro lado: aquellas son con qué se conectan otros
 * sistemas a este, y estas son con qué se conecta la flota al resto.
 */
export function PlatformSettingsPanel() {
  const { notify } = useToast();
  const [settings, setSettings] = useState<PlatformSetting[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [toDelete, setToDelete] = useState<PlatformSetting | null>(null);

  const load = useCallback(async () => {
    try {
      setSettings(await platformSettingsApi.listPlatformSettings());
      setError(null);
    } catch (caught: unknown) {
      setError(asApiError(caught));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (target: PlatformSetting) => {
    try {
      await platformSettingsApi.deletePlatformSetting(target.clave);
      notify('success', `${target.clave} eliminada`);
      await load();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToDelete(null);
    }
  };

  // Los que faltan cargar. Un secreto vacío es un gateway que no va a poder
  // conectar, y sin este aviso se ve igual que uno tapado.
  const pendientes = (settings ?? []).filter(
    (s) => s.origen === 'plataforma' && s.es_secreto && !s.tiene_valor,
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-fg">
            Configuración de la flota
          </h2>
          <p className="max-w-prose text-sm text-fg-muted">
            Los valores que van al <code>.env</code> de todos los gateways. Lo
            propio de cada equipo —su uuid, su credencial— no se edita acá.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconPlus />}
          onClick={() => setFormTarget('new')}
        >
          Agregar variable
        </Button>
      </header>

      {pendientes.length > 0 && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-fg">
          {pendientes.length === 1
            ? `Falta cargar ${pendientes[0]!.clave}.`
            : `Faltan cargar ${pendientes.length} valores secretos.`}{' '}
          Un gateway con un secreto vacío no va a poder conectar.
        </p>
      )}

      {error !== null && (
        <ErrorState error={error} onRetry={() => void load()} />
      )}

      {settings === null && error === null && (
        <div className="flex flex-col gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      )}

      {settings !== null && settings.length === 0 && (
        <EmptyState
          title="Sin variables"
          description="Agregá la primera para que los gateways la reciban."
        />
      )}

      {settings !== null &&
        settings.length > 0 &&
        agrupar(settings).map((grupo) => (
          <div key={grupo.titulo} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="text-sm font-semibold text-fg">{grupo.titulo}</h3>
              <p className="text-xs text-fg-muted">{grupo.descripcion}</p>
            </div>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {grupo.settings.map((setting) => (
                <PlatformSettingRow
                  key={setting.id}
                  setting={setting}
                  editable={grupo.editable}
                  onChanged={() => void load()}
                  onDelete={() => setToDelete(setting)}
                />
              ))}
            </ul>
          </div>
        ))}

      {formTarget === 'new' && (
        <PlatformSettingForm
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`¿Eliminar ${toDelete?.clave ?? ''}?`}
        // Se dice qué pasa después, no solo que la acción es permanente: los
        // gateways leen esta lista, y una variable que desaparece es una que
        // dejan de recibir en la próxima configuración.
        message="Los gateways dejarán de recibirla en su próxima configuración."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (toDelete) void remove(toDelete);
        }}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
