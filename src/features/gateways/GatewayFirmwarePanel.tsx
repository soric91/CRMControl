import { useState } from 'react';
import { firmwareApi } from '../../api';
import type {
  FirmwareRelease,
  FirmwareUpdateState,
  FirmwareUpdateStatus,
  Gateway,
} from '../../api';
import { Button } from '../../components/ui/Button';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { Toggle } from '../../components/ui/Toggle';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { cx } from '../../lib/cx';
import { asApiError } from '../../lib/errors';
import { formatDateTime, formatText } from '../../lib/formatters';

/**
 * Cómo se lee cada estado en la pantalla.
 *
 * `descargando` y `aplicando` son minutos en los que el equipo está vivo pero
 * ocupado: sin nombrarlos, no se distinguen de un equipo colgado.
 */
const ESTADO: Record<
  FirmwareUpdateState,
  { tono: string; glifo: string; titulo: string; cuerpo: string }
> = {
  sin_pendiente: {
    tono: 'border-line bg-surface text-muted',
    glifo: '○',
    titulo: 'Sin actualización pendiente',
    cuerpo: 'El equipo sigue con la versión que tiene instalada.',
  },
  programada: {
    tono: 'border-accent bg-accent-soft text-accent-soft-content',
    glifo: '⟳',
    titulo: 'Actualización programada',
    cuerpo:
      'El equipo la va a instalar dentro de su ventana. Hasta entonces sigue leyendo con normalidad.',
  },
  descargando: {
    tono: 'border-accent bg-accent-soft text-accent-soft-content',
    glifo: '⇩',
    titulo: 'Descargando el paquete',
    cuerpo:
      'Verifica el checksum antes de descomprimir nada. Todavía no se reinició.',
  },
  aplicando: {
    tono: 'border-warning bg-warning-soft text-warning-content',
    glifo: '⚙',
    titulo: 'Aplicando la versión nueva',
    cuerpo:
      'El equipo se está reiniciando con el paquete. No se puede cancelar desde acá.',
  },
  aplicada: {
    tono: 'border-success bg-success-soft text-success-content',
    glifo: '✓',
    titulo: 'Actualización aplicada',
    cuerpo: 'El equipo arrancó con la versión nueva y lo confirmó.',
  },
  fallida: {
    tono: 'border-danger bg-danger-soft text-danger-content',
    glifo: '⚠',
    titulo: 'La actualización falló',
    cuerpo:
      'El equipo sigue con la versión anterior. Se reintenta en la próxima ventana mientras le queden intentos.',
  },
};

/** Los estados en los que ya no se puede sacar la orden. */
function cancelable(estado: FirmwareUpdateState): boolean {
  return estado !== 'sin_pendiente' && estado !== 'aplicando';
}

export interface GatewayFirmwarePanelProps {
  gateway: Gateway;
  /** Sólo un administrador despliega firmware; ver `canManageFirmware`. */
  manageable: boolean;
}

/**
 * En qué anda el firmware de este equipo, y el botón que pide una versión.
 *
 * El panel no reinicia nada: deja escrito qué tiene que instalar el gateway y
 * desde cuándo. El equipo lo busca solo, y respeta su ventana.
 */
export function GatewayFirmwarePanel({
  gateway,
  manageable,
}: GatewayFirmwarePanelProps) {
  const { notify } = useToast();
  const [desplegando, setDesplegando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const resource = useResource(
    () => firmwareApi.getGatewayFirmware(gateway.id),
    [gateway.id],
  );
  const status = resource.data;

  const cancelar = async () => {
    setCancelando(true);
    try {
      resource.set(await firmwareApi.cancelGatewayFirmware(gateway.id));
      notify('success', 'Actualización cancelada');
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setCancelando(false);
    }
  };

  return (
    <Panel title="Firmware">
      {resource.loading ? (
        <SkeletonPanel rows={2} />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : status ? (
        <div className="flex flex-col gap-5">
          <EstadoAviso status={status} />

          <DetailList
            items={[
              {
                label: 'Versión instalada',
                value: formatText(status.version_actual),
              },
              {
                label: 'Versión pedida',
                value: formatText(status.version_objetivo),
              },
              {
                label: 'Se aplica desde',
                value: status.aplicar_desde
                  ? formatDateTime(status.aplicar_desde)
                  : '—',
              },
              {
                label: 'Intentos',
                value:
                  status.estado === 'sin_pendiente'
                    ? '—'
                    : `${status.intentos} usados, ${status.intentos_restantes} restantes`,
              },
              ...(status.error
                ? [{ label: 'Último error', value: status.error }]
                : []),
            ]}
          />

          {manageable && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDesplegando(true);
                }}
              >
                Actualizar firmware
              </Button>
              {cancelable(status.estado) && (
                <Button
                  size="sm"
                  loading={cancelando}
                  onClick={() => {
                    void cancelar();
                  }}
                >
                  Cancelar la actualización
                </Button>
              )}
            </div>
          )}
        </div>
      ) : null}

      {desplegando && (
        <DesplegarDialog
          gateway={gateway}
          onClose={() => {
            setDesplegando(false);
          }}
          onDone={() => {
            setDesplegando(false);
            resource.reload();
          }}
        />
      )}
    </Panel>
  );
}

function EstadoAviso({ status }: { status: FirmwareUpdateStatus }) {
  const aviso = ESTADO[status.estado];
  const sinIntentos =
    status.estado === 'fallida' && status.intentos_restantes === 0;

  return (
    <div
      role="status"
      className={cx(
        'flex flex-col gap-2 rounded-lg border px-4 py-3',
        aviso.tono,
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden="true">{aviso.glifo}</span>
        {aviso.titulo}
      </p>
      <p className="text-sm">
        {sinIntentos
          ? 'Se agotaron los intentos: el equipo dejó de intentarlo. Volvé a desplegar la versión cuando sepas por qué falló.'
          : aviso.cuerpo}
      </p>
    </div>
  );
}

/**
 * Elegir versión y cuándo.
 *
 * Por omisión, en la ventana nocturna que fija la configuración de la
 * plataforma: reiniciar un equipo a mitad de la jornada es una parada no
 * programada de la planta.
 */
function DesplegarDialog({
  gateway,
  onClose,
  onDone,
}: {
  gateway: Gateway;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [releaseId, setReleaseId] = useState('');
  const [ahora, setAhora] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const catalogo = useResource(() => firmwareApi.listFirmwareReleases(), []);
  const disponibles = (catalogo.data ?? []).filter(
    (release: FirmwareRelease) => release.retirado_en === null,
  );

  const desplegar = async () => {
    setEnviando(true);
    try {
      const resultado = await firmwareApi.createFirmwareRollout({
        release_id: releaseId,
        gateway_ids: [gateway.id],
        ahora,
      });

      const omitido = resultado.omitidos[0];
      if (omitido) {
        // No es un error del servidor, así que no llega como tal: el equipo
        // quedó fuera y el motivo es lo único que explica por qué.
        notify('error', `No se le pidió: ${omitido.motivo}`);
      } else if (!resultado.flota_activa) {
        notify(
          'error',
          'Quedó pedida, pero las actualizaciones están desactivadas para la flota: el equipo no va a bajarla hasta que se enciendan en Servicios.',
        );
      } else {
        notify(
          'success',
          ahora
            ? `${resultado.version} se instalará en la próxima consulta del equipo`
            : `${resultado.version} quedó programada para la próxima ventana`,
        );
      }
      onDone();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open
      title="Actualizar firmware"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            loading={enviando}
            disabled={releaseId === ''}
            onClick={() => {
              void desplegar();
            }}
          >
            Desplegar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {catalogo.error ? (
          <ErrorState error={catalogo.error} onRetry={catalogo.reload} />
        ) : disponibles.length === 0 && !catalogo.loading ? (
          <p className="text-sm text-muted">
            No hay versiones publicadas. Publicá una en Firmware antes de
            desplegar.
          </p>
        ) : (
          <>
            <Select
              id="firmware-release"
              label="Versión"
              value={releaseId}
              options={[
                { value: '', label: 'Elegir una versión…' },
                ...disponibles.map((release) => ({
                  value: release.id,
                  label:
                    release.canal === 'beta'
                      ? `${release.version} (beta)`
                      : release.version,
                })),
              ]}
              onValueChange={setReleaseId}
            />

            <Toggle
              id="firmware-ahora"
              label="Instalar apenas el equipo pregunte"
              description="Sin esto se aplica en la ventana nocturna configurada para la flota. Marcalo sólo si la planta está parada."
              checked={ahora}
              onCheckedChange={setAhora}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
