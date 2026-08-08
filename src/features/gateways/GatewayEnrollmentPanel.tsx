import { useState } from 'react';
import { enrollmentApi } from '../../api';
import type { EnrollmentTokenIssued, Gateway } from '../../api';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/DetailList';
import { SecretRevealDialog } from '../../components/ui/SecretRevealDialog';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';

export interface GatewayEnrollmentPanelProps {
  gateway: Gateway;
  writable: boolean;
}

/**
 * El comando con el que un técnico deja el equipo funcionando en una línea.
 *
 * Se muestra una sola vez, igual que la credencial y por lo mismo: lo único
 * que se guarda es su hash. Si se cierra sin copiar, hay que emitir otro.
 *
 * Distinto del panel de credencial, aunque estén al lado: aquel entrega el
 * secreto para configurar el equipo a mano, este hace que el equipo se
 * configure entero — y **rota la credencial durante el canje**. Usar los dos
 * seguidos invalida el primero.
 */
export function GatewayEnrollmentPanel({
  gateway,
  writable,
}: GatewayEnrollmentPanelProps) {
  const { notify } = useToast();
  const [emitido, setEmitido] = useState<EnrollmentTokenIssued | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const emitir = async () => {
    setTrabajando(true);
    try {
      setEmitido(await enrollmentApi.issueEnrollmentToken(gateway.id));
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setTrabajando(false);
      setConfirmando(false);
    }
  };

  return (
    <>
      <Panel
        title="Instalación en un comando"
        actions={
          writable && (
            <Button
              variant="primary"
              loading={trabajando}
              onClick={() => {
                setConfirmando(true);
              }}
            >
              Generar comando
            </Button>
          )
        }
      >
        <div className="flex max-w-prose flex-col gap-3 text-sm text-fg-muted">
          <p>
            Genera el comando que el técnico corre en la sede. El equipo se
            configura solo: recibe todas sus variables, genera sus secretos
            locales y queda reportando.
          </p>
          <p>
            Vale 8 horas y sirve una sola vez. Al usarse, la credencial de este
            gateway se reemplaza por una nueva — la que tenga cargada hoy deja
            de servir.
          </p>
        </div>
      </Panel>

      <SecretRevealDialog
        open={emitido !== null}
        onClose={() => {
          setEmitido(null);
        }}
        title="Comando de instalación"
        description="Pasale esta línea al técnico. Se muestra una sola vez."
        fields={
          emitido
            ? [
                {
                  // El comando entero y no solo el token: rearmarlo a mano en
                  // un chat es una oportunidad de equivocarse — un espacio de
                  // más, la URL vieja, el token cortado.
                  label: 'Para correr en el equipo',
                  value: emitido.comando,
                  copyLabel: 'Copiar el comando',
                },
              ]
            : []
        }
        warning="No se guarda en ningún lado y no se puede volver a ver. Si cerrás sin copiarlo, hay que generar otro."
      />

      <ConfirmDialog
        open={confirmando}
        title="Generar comando de instalación"
        // Se dice lo que rompe, no solo lo que hace: quien lo genere sin saber
        // esto puede dejar sin conexión a un equipo que estaba funcionando.
        message="Si este gateway ya está instalado y funcionando, usar el comando lo reconfigura desde cero y su credencial actual deja de servir. Los comandos generados antes dejan de valer ahora."
        confirmLabel="Generar"
        onConfirm={() => {
          void emitir();
        }}
        onCancel={() => {
          setConfirmando(false);
        }}
      />
    </>
  );
}
