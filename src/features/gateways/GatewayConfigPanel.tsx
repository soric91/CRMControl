import { useState } from 'react';
import { gatewaysApi } from '../../api';
import type { Gateway, GatewayConfigStatus } from '../../api';
import { Button } from '../../components/ui/Button';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { Toggle } from '../../components/ui/Toggle';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { cx } from '../../lib/cx';
import { asApiError } from '../../lib/errors';
import { formatDateTime } from '../../lib/formatters';
import { LastSeen } from './GatewaysTable';

/** Past this without a poll, the device is worth looking at. */
const QUIET_HOURS = 6;

type Standing = 'never' | 'current' | 'undelivered' | 'waiting';

function standingOf(status: GatewayConfigStatus): Standing {
  if (!status.desactualizada) return 'current';
  if (status.config_version_aplicada === null) return 'never';
  return status.config_habilitada ? 'waiting' : 'undelivered';
}

/** 64 hex characters tell nobody anything; the first 8 are enough for support. */
function shortHash(hash: string | null): string | undefined {
  return hash ? `${hash.slice(0, 8)}…` : undefined;
}

function isQuiet(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > QUIET_HOURS * 60 * 60 * 1000;
}

export interface GatewayConfigPanelProps {
  gateway: Gateway;
  writable: boolean;
  onGatewayChange: (gateway: Gateway) => void;
  /**
   * Renders only the warning, for the screens where equipment and variables
   * are edited: that is where the person still remembers what they changed.
   */
  compact?: boolean;
}

/**
 * Where the gateway stands against what is configured for it, and the one
 * switch that lets it catch up.
 *
 * The switch lives here rather than beside the credential because this is the
 * screen that explains what turning it on does. Having it in one place also
 * means one call site for `config_habilitada`.
 */
export function GatewayConfigPanel({
  gateway,
  writable,
  onGatewayChange,
  compact = false,
}: GatewayConfigPanelProps) {
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const resource = useResource(
    () => gatewaysApi.getGatewayConfigStatus(gateway.id),
    [gateway.id],
  );
  const status = resource.data;

  const setEnabled = async (enabled: boolean) => {
    setSaving(true);
    try {
      onGatewayChange(
        await gatewaysApi.updateGateway(gateway.id, {
          config_habilitada: enabled,
        }),
      );
      notify(
        'success',
        enabled
          ? 'El gateway tomará la configuración en su próxima consulta'
          : 'Descarga de configuración deshabilitada',
      );
      resource.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  const enableButton = writable && (
    <Button
      variant="primary"
      size="sm"
      loading={saving}
      onClick={() => {
        void setEnabled(true);
      }}
    >
      Habilitar descarga
    </Button>
  );

  // En modo compacto solo interesa lo que reclama una acción.
  if (compact) {
    if (!status || !status.desactualizada || status.config_habilitada) {
      return null;
    }
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning bg-warning-soft px-4 py-3"
      >
        <p className="text-sm text-warning-content">
          <strong className="font-semibold">
            Hay cambios que el gateway todavía no tiene.
          </strong>{' '}
          Habilitá la descarga para que los tome en su próxima consulta.
        </p>
        {enableButton}
      </div>
    );
  }

  return (
    <Panel title="Configuración">
      {resource.loading ? (
        <SkeletonPanel rows={2} />
      ) : resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : status ? (
        <div className="flex flex-col gap-5">
          <StandingNotice
            standing={standingOf(status)}
            status={status}
            action={standingOf(status) === 'current' ? undefined : enableButton}
          />

          <DetailList
            items={[
              {
                label: 'Configuración aplicada',
                value: status.config_aplicada_en ? (
                  <span title={shortHash(status.config_version_aplicada)}>
                    {formatDateTime(status.config_aplicada_en)}
                  </span>
                ) : (
                  'Nunca'
                ),
              },
              {
                label: 'Última consulta',
                value: (
                  <span
                    className={cx(
                      isQuiet(status.ultima_conexion) && 'text-warning',
                    )}
                  >
                    <LastSeen iso={status.ultima_conexion} />
                  </span>
                ),
              },
              {
                label: 'Versión actual',
                value: (
                  <span
                    className="font-mono text-xs"
                    title={status.config_version_actual}
                  >
                    {shortHash(status.config_version_actual)}
                  </span>
                ),
              },
            ]}
          />

          <div className="border-t border-line pt-4">
            <Toggle
              id="gateway-config-habilitada"
              label="Descarga de configuración habilitada"
              description="El gateway descarga su configuración una vez y el interruptor se apaga solo al confirmarla. Cada vez que cambies equipos o variables, habilitala de nuevo."
              checked={status.config_habilitada}
              disabled={!writable || saving}
              onCheckedChange={(checked) => {
                void setEnabled(checked);
              }}
            />
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

const NOTICE: Record<
  Standing,
  { tone: string; glyph: string; title: string; body: string }
> = {
  current: {
    tone: 'border-success bg-success-soft text-success-content',
    glyph: '✓',
    title: 'El gateway está corriendo la configuración actual',
    body: 'No hay nada pendiente de entregar.',
  },
  undelivered: {
    tone: 'border-warning bg-warning-soft text-warning-content',
    glyph: '⚠',
    title: 'Hay cambios que el gateway todavía no tiene',
    body: 'Sigue corriendo la configuración que aplicó antes. Habilitá la descarga para que tome la nueva en su próxima consulta.',
  },
  waiting: {
    tone: 'border-accent bg-accent-soft text-accent-soft-content',
    glyph: '⟳',
    title: 'Descarga habilitada, esperando que el gateway consulte',
    body: 'La tomará en su próxima consulta y confirmará cuando la escriba.',
  },
  never: {
    tone: 'border-accent bg-accent-soft text-accent-soft-content',
    glyph: '○',
    title: 'Este gateway todavía no aplicó ninguna configuración',
    body: 'Es una instalación nueva. Habilitá la descarga para que baje la primera.',
  },
};

function StandingNotice({
  standing,
  status,
  action,
}: {
  standing: Standing;
  status: GatewayConfigStatus;
  action: React.ReactNode;
}) {
  const notice = NOTICE[standing];
  const showAction = action && !status.config_habilitada;

  return (
    <div
      role="status"
      className={cx(
        'flex flex-col gap-2 rounded-lg border px-4 py-3',
        notice.tone,
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden="true">{notice.glyph}</span>
        {notice.title}
      </p>
      <p className="text-sm">{notice.body}</p>
      {showAction && <div className="mt-1">{action}</div>}
    </div>
  );
}
