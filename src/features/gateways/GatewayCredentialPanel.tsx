import { useState } from 'react';
import { gatewayCredentialApi } from '../../api';
import type { Gateway, GatewayCredentialCreated } from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CopyValue } from '../../components/ui/CopyValue';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SecretRevealDialog } from '../../components/ui/SecretRevealDialog';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import { formatDateTime } from '../../lib/formatters';

/** What a destructive action leaves behind, said in plain terms. */
const CUTS_THE_GATEWAY =
  'El gateway deja de poder pedir su token y se queda con la configuración que ya tenga, hasta que le cargues la credencial nueva.';

export interface GatewayCredentialPanelProps {
  gateway: Gateway;
  writable: boolean;
}

/**
 * The firmware's way in: the long-lived credential it is loaded with once.
 * Whether it may download anything is the Configuración panel's business.
 *
 * The credential exists in clear exactly once, in the response that issues it.
 * It is held in this component's state and dies with it — never stored, never
 * logged, never lifted into a context.
 */
export function GatewayCredentialPanel({
  gateway,
  writable,
}: GatewayCredentialPanelProps) {
  const { notify } = useToast();
  const [issued, setIssued] = useState<GatewayCredentialCreated | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmingIssue, setConfirmingIssue] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  const credential = useResource(
    () => gatewayCredentialApi.getGatewayCredential(gateway.id),
    [gateway.id],
  );
  const current = credential.data;

  const issue = async () => {
    setWorking(true);
    try {
      setIssued(await gatewayCredentialApi.issueGatewayCredential(gateway.id));
      credential.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setWorking(false);
      setConfirmingIssue(false);
    }
  };

  const revoke = async () => {
    try {
      await gatewayCredentialApi.revokeGatewayCredential(gateway.id);
      notify('success', 'Credencial revocada');
      credential.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setConfirmingRevoke(false);
    }
  };

  return (
    <>
      <Panel
        title="Acceso del firmware"
        actions={
          writable &&
          current?.tiene_credencial && (
            <>
              <Button
                size="sm"
                loading={working}
                onClick={() => {
                  setConfirmingIssue(true);
                }}
              >
                Regenerar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConfirmingRevoke(true);
                }}
              >
                Revocar
              </Button>
            </>
          )
        }
      >
        {credential.loading ? (
          <SkeletonPanel rows={2} />
        ) : credential.error ? (
          <ErrorState error={credential.error} onRetry={credential.reload} />
        ) : current ? (
          <div className="flex flex-col gap-5">
            <DetailList
              items={[
                {
                  // El firmware lo manda junto con la credencial al pedir token.
                  label: 'UUID del gateway',
                  value: (
                    <CopyValue
                      value={current.uuid}
                      label="Copiar el UUID del gateway"
                    />
                  ),
                },
                {
                  label: 'Credencial',
                  value: current.tiene_credencial ? (
                    <Badge tone="success" dot>
                      Emitida
                    </Badge>
                  ) : (
                    <Badge tone="warning" dot>
                      Sin emitir
                    </Badge>
                  ),
                },
                ...(current.tiene_credencial
                  ? [
                      {
                        label: 'Emitida el',
                        value: formatDateTime(current.credential_emitida_en),
                      },
                    ]
                  : []),
              ]}
            />

            {!current.tiene_credencial && (
              <EmptyState
                title="Este gateway todavía no tiene credencial"
                description="Se genera acá y se carga una vez en el equipo. No vence: el gateway la cambia por un token de 24 h cada vez que lo necesita."
                action={
                  writable && (
                    <Button
                      variant="primary"
                      loading={working}
                      onClick={() => {
                        void issue();
                      }}
                    >
                      Generar credencial
                    </Button>
                  )
                }
              />
            )}
          </div>
        ) : null}
      </Panel>

      <SecretRevealDialog
        open={issued !== null}
        onClose={() => {
          setIssued(null);
        }}
        title="Credencial del gateway"
        description="Se muestra una sola vez. Copiala y cargala en el firmware."
        fields={
          issued
            ? [
                {
                  label: 'UUID del gateway',
                  value: issued.uuid,
                  copyLabel: 'Copiar el UUID del gateway',
                },
                {
                  label: 'Credencial',
                  value: issued.credential,
                  copyLabel: 'Copiar la credencial',
                },
              ]
            : []
        }
        warning="No se guarda en ningún lado y no se puede volver a ver. Si cerrás este panel sin copiarla, hay que generar una nueva."
      />

      <ConfirmDialog
        open={confirmingIssue}
        title="Regenerar credencial"
        message={`La credencial actual deja de servir en el momento. ${CUTS_THE_GATEWAY}`}
        confirmLabel="Regenerar"
        onCancel={() => {
          setConfirmingIssue(false);
        }}
        onConfirm={issue}
      />

      <ConfirmDialog
        open={confirmingRevoke}
        title="Revocar credencial"
        message={`El gateway se queda sin forma de autenticarse. ${CUTS_THE_GATEWAY}`}
        confirmLabel="Revocar"
        onCancel={() => {
          setConfirmingRevoke(false);
        }}
        onConfirm={revoke}
      />
    </>
  );
}
