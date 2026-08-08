import { useState } from 'react';
import { platformSettingsApi } from '../../api';
import type { PlatformSetting } from '../../api';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';

interface PlatformSettingRowProps {
  setting: PlatformSetting;
  onChanged: () => void;
  onDelete: () => void;
  /** Falso para las que el CRM no llena: se muestran sin acciones. */
  editable?: boolean;
}

/** Los puntos que se muestran en lugar de un secreto. Ancho fijo: la
 *  longitud real de una contraseña no debería adivinarse desde la pantalla. */
const TAPADO = '••••••••••••';

export function PlatformSettingRow({
  setting,
  onChanged,
  onDelete,
  editable = true,
}: PlatformSettingRowProps) {
  const { notify } = useToast();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [borradorDescripcion, setBorradorDescripcion] = useState('');
  const [revelado, setRevelado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const mostrado = setting.es_secreto
    ? (revelado ?? (setting.tiene_valor ? TAPADO : ''))
    : (setting.valor ?? '');

  const ver = async () => {
    if (revelado !== null) {
      setRevelado(null);
      return;
    }
    setOcupado(true);
    try {
      const { valor } = await platformSettingsApi.revealPlatformSetting(
        setting.clave,
      );
      setRevelado(valor);
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setOcupado(false);
    }
  };

  const empezarAEditar = async () => {
    // Para editar hace falta el valor real, incluso si está tapado: un campo
    // que arranca con los puntos guardaría los puntos.
    if (setting.es_secreto && revelado === null) {
      setOcupado(true);
      try {
        const { valor } = await platformSettingsApi.revealPlatformSetting(
          setting.clave,
        );
        setRevelado(valor);
        setBorrador(valor);
      } catch (caught: unknown) {
        notify('error', asApiError(caught).message);
        setOcupado(false);
        return;
      }
      setOcupado(false);
    } else {
      setBorrador(mostrado);
    }
    setBorradorDescripcion(setting.descripcion);
    setEditando(true);
  };

  const guardar = async () => {
    setOcupado(true);
    try {
      await platformSettingsApi.updatePlatformSetting(setting.clave, {
        valor: borrador,
        descripcion: borradorDescripcion,
      });
      notify('success', `${setting.clave} actualizada`);
      setEditando(false);
      setRevelado(null);
      onChanged();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <li className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <code className="min-w-56 font-mono text-xs font-medium text-fg">
          {setting.clave}
        </code>

        {editando ? (
          <input
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            aria-label={`Valor de ${setting.clave}`}
            autoFocus
            className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        ) : (
          <span
            className={[
              'min-w-0 flex-1 truncate font-mono text-xs',
              setting.tiene_valor || !setting.es_secreto
                ? 'text-fg-muted'
                : 'text-warning-fg',
            ].join(' ')}
          >
            {/* Vacío y tapado no se pueden ver igual: uno está cargado y el
                otro impide que un gateway conecte. */}
            {mostrado || (setting.es_secreto ? 'sin cargar' : '—')}
          </span>
        )}

        {!editable && (
          // Se dice quién lo llena, no solo que no se puede tocar: un campo
          // vacío sin explicación se lee como algo que falta cargar.
          <span className="shrink-0 text-xs text-fg-muted">
            {setting.origen === 'equipo'
              ? 'lo genera el equipo'
              : 'de su ficha'}
          </span>
        )}

        {editable && (
          <div className="flex shrink-0 items-center gap-1">
            {setting.es_secreto && !editando && setting.tiene_valor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void ver()}
                disabled={ocupado}
              >
                {revelado === null ? 'Ver' : 'Ocultar'}
              </Button>
            )}
            {editando ? (
              <>
                <Button
                  size="sm"
                  onClick={() => void guardar()}
                  loading={ocupado}
                >
                  Guardar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditando(false)}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void empezarAEditar()}
                  disabled={ocupado}
                >
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  Eliminar
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {editando ? (
        <input
          value={borradorDescripcion}
          onChange={(e) => setBorradorDescripcion(e.target.value)}
          aria-label={`Descripción de ${setting.clave}`}
          placeholder="Para qué sirve"
          className="w-full rounded border border-border bg-bg px-2 py-1 text-xs text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      ) : (
        setting.descripcion !== '' && (
          <p className="text-xs text-fg-muted">{setting.descripcion}</p>
        )
      )}
    </li>
  );
}
