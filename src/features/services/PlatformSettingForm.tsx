import { useState } from 'react';
import { platformSettingsApi } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';

/**
 * Igual que la validación del servidor, y a propósito: el mensaje llega
 * mientras se escribe en vez de después de guardar. El servidor la repite
 * porque una validación que solo vive en el navegador no es una validación.
 */
const CLAVE = /^[A-Z][A-Z0-9_]*$/;

export interface PlatformSettingFormProps {
  onClose: () => void;
  onSaved: () => void;
}

export function PlatformSettingForm({
  onClose,
  onSaved,
}: PlatformSettingFormProps) {
  const { notify } = useToast();
  const [clave, setClave] = useState('');
  const [valor, setValor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esSecreto, setEsSecreto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const claveInvalida = clave !== '' && !CLAVE.test(clave.trim());

  const guardar = async () => {
    setGuardando(true);
    try {
      await platformSettingsApi.createPlatformSetting({
        clave: clave.trim(),
        valor,
        es_secreto: esSecreto,
        descripcion,
      });
      notify('success', `${clave.trim()} agregada`);
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
      title="Agregar variable"
      description="Va al .env de todos los gateways, con este nombre exacto."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void guardar()}
            loading={guardando}
            disabled={clave.trim() === '' || claveInvalida}
          >
            Agregar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          id="clave"
          label="Nombre"
          value={clave}
          onChange={(e) => setClave(e.target.value.toUpperCase())}
          placeholder="MODBUS_TIMEOUT_MS"
          error={
            claveInvalida
              ? 'Solo MAYÚSCULAS, dígitos y _, empezando con letra'
              : undefined
          }
          hint="Se escribe tal cual en el archivo, así que un shell tiene que poder asignarlo."
          autoComplete="off"
        />

        <Input
          id="valor"
          label="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          autoComplete="off"
        />

        <Input
          id="descripcion"
          label="Para qué sirve"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          hint="Sin esto, en seis meses es un nombre en mayúsculas que nadie se anima a tocar."
          autoComplete="off"
        />

        <Toggle
          id="es-secreto"
          checked={esSecreto}
          onCheckedChange={setEsSecreto}
          label="Es un secreto"
          // Marcarlo tiene dos efectos y conviene decir los dos: uno es
          // visible y el otro no.
          description="Se guarda cifrado y no se muestra hasta que alguien lo pida."
        />
      </div>
    </Drawer>
  );
}
