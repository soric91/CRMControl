import { useState } from 'react';
import { firmwareApi } from '../../api';
import type { FirmwareChannel } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';

/**
 * Las mismas validaciones que el servidor, y a propósito: el mensaje llega
 * mientras se escribe en vez de después de guardar. El servidor las repite
 * porque una validación que sólo vive en el navegador no es una validación.
 */
const VERSION = /^v?\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-fA-F]{64}$/;

export interface FirmwareReleaseFormProps {
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Publicar una versión en el catálogo.
 *
 * Sube el nombre y el checksum, no el paquete: el `.tar.gz` vive en el
 * servidor de releases, y el checksum se guarda acá para que comprometer ese
 * servidor no alcance para que un equipo instale algo alterado.
 */
export function FirmwareReleaseForm({
  onClose,
  onSaved,
}: FirmwareReleaseFormProps) {
  const { notify } = useToast();
  const [version, setVersion] = useState('');
  const [sha256, setSha256] = useState('');
  const [canal, setCanal] = useState<FirmwareChannel>('beta');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const versionInvalida = version !== '' && !VERSION.test(version.trim());
  const shaInvalido = sha256 !== '' && !SHA256.test(sha256.trim());

  const publicar = async () => {
    setGuardando(true);
    try {
      await firmwareApi.publishFirmwareRelease({
        version: version.trim(),
        sha256: sha256.trim().toLowerCase(),
        canal,
        notas,
      });
      notify(
        'success',
        `${version.trim()} publicada. Todavía no está instalada en ningún equipo.`,
      );
      onSaved();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Publicar versión"
      description="Queda disponible en el catálogo. Desplegarla en los equipos es otra acción."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void publicar()}
            loading={guardando}
            disabled={
              version.trim() === '' ||
              sha256.trim() === '' ||
              versionInvalida ||
              shaInvalido
            }
          >
            Publicar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          id="version"
          label="Versión"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="v1.4.0"
          error={versionInvalida ? 'Tiene que ser 1.2.3 o v1.2.3' : undefined}
          hint="El nombre del paquete se arma con esto, igual que en el enrolamiento."
          autoComplete="off"
        />

        <Input
          id="sha256"
          label="Checksum sha256"
          value={sha256}
          onChange={(e) => setSha256(e.target.value)}
          error={shaInvalido ? 'Son 64 caracteres hexadecimales' : undefined}
          hint="Salida de `sha256sum` sobre el .tar.gz. El equipo lo verifica antes de descomprimir nada."
          autoComplete="off"
        />

        <Select
          id="canal"
          label="Canal"
          value={canal}
          options={[
            { value: 'beta', label: 'Beta — para probar en pocos equipos' },
            { value: 'estable', label: 'Estable — probada en el campo' },
          ]}
          onValueChange={setCanal}
        />

        <Input
          id="notas"
          label="Qué cambia"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          hint="Se lee justo antes de desplegar. Sin esto, elegir versión es elegir un número."
          autoComplete="off"
        />
      </div>
    </Drawer>
  );
}
