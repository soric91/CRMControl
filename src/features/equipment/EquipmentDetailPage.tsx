import { useState } from 'react';
import { equipmentApi, variablesApi } from '../../api';
import type { Variable } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CopyValue } from '../../components/ui/CopyValue';
import { DetailList, Panel } from '../../components/ui/DetailList';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { useToast } from '../../hooks/useToast';
import { asApiError } from '../../lib/errors';
import {
  EQUIPMENT_TYPE_LABEL,
  MODBUS_FUNCTION_LABEL,
  MODBUS_TRANSPORT_LABEL,
  SERIAL_PARITY_LABEL,
  formatText,
} from '../../lib/formatters';
import { canWrite } from '../../lib/permissions';
import { VariableForm } from '../variables/VariableForm';
import { VariablesTable } from '../variables/VariablesTable';
import { GatewayConfigPanel } from '../gateways/GatewayConfigPanel';
import { EquipmentForm } from './EquipmentForm';
import { equipmentEndpoint } from './EquipmentTable';
import { equipmentLabel, useEquipmentOutlet } from './EquipmentLayout';

type VariableFormTarget = Variable | 'new' | null;

export function EquipmentDetailPage() {
  const { gateway, setGateway, equipment, setEquipment } = useEquipmentOutlet();
  const { user } = useAuth();
  const { notify } = useToast();

  const [editingEquipment, setEditingEquipment] = useState(false);
  const [target, setTarget] = useState<VariableFormTarget>(null);
  const [toDelete, setToDelete] = useState<Variable | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);

  const variables = usePaginatedResource(
    (params) => equipmentApi.listEquipmentVariables(equipment.id, params),
    [equipment.id],
  );

  const writable = user !== null && canWrite(user.role);

  const refresh = () => {
    setSelected(new Set());
    variables.reload();
  };

  const remove = async (variable: Variable) => {
    try {
      await variablesApi.deleteVariable(variable.id);
      notify('success', `Variable "${variable.nombre}" eliminada`);
      refresh();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToDelete(null);
    }
  };

  /**
   * Deletes every selected variable. `allSettled`, not `all`: one failure —
   * a 403, or a row someone else already removed — must not hide the rest.
   */
  const removeSelected = async () => {
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) => variablesApi.deleteVariable(id)),
    );
    const failed = results.filter((result) => result.status === 'rejected');

    if (failed.length === 0) {
      notify('success', `${ids.length} variables eliminadas`);
    } else {
      notify(
        'error',
        `${ids.length - failed.length} de ${ids.length} eliminadas. ${asApiError(failed[0]?.reason).message}`,
      );
    }
    setConfirmingBulk(false);
    refresh();
  };

  const newVariableButton = writable ? (
    <Button
      variant="primary"
      size="sm"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setTarget('new');
      }}
    >
      Nueva variable
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={equipmentLabel(equipment)}
        meta={
          <Badge tone="neutral">{EQUIPMENT_TYPE_LABEL[equipment.tipo]}</Badge>
        }
        description={`Gateway ${gateway.numero_serie}`}
        actions={
          writable && (
            <Button
              onClick={() => {
                setEditingEquipment(true);
              }}
            >
              Editar equipo
            </Button>
          )
        }
      />

      {/* Acá es donde se edita, y donde todavía se acuerda de lo que tocó. */}
      <GatewayConfigPanel
        compact
        gateway={gateway}
        writable={writable}
        onGatewayChange={setGateway}
      />

      <Panel title="Configuración Modbus">
        <DetailList
          items={[
            {
              // Needed to reference the equipment from the gateway's
              // config.ini, so it is copyable rather than just readable.
              label: 'UUID del equipo',
              value: (
                <CopyValue
                  value={equipment.id}
                  label="Copiar el UUID del equipo"
                />
              ),
            },
            { label: 'ID Modbus', value: equipment.modbus_id },
            {
              label: 'Function Code',
              value: MODBUS_FUNCTION_LABEL[equipment.modbus_function],
            },
            { label: 'Marca', value: formatText(equipment.marca) },
            { label: 'Modelo', value: formatText(equipment.modelo) },
            {
              label: 'Transporte',
              value: MODBUS_TRANSPORT_LABEL[equipment.transporte],
            },
            {
              label: equipment.transporte === 'tcp' ? 'Host' : 'Puerto serie',
              value: (
                <span className="tabular-nums">
                  {equipmentEndpoint(equipment)}
                </span>
              ),
            },
            // Los parámetros de línea solo existen sobre RTU.
            ...(equipment.transporte === 'rtu'
              ? [
                  {
                    label: 'Parámetros de línea',
                    value: (
                      <span className="tabular-nums">
                        {equipment.baudrate} · {equipment.bits} bits ·{' '}
                        {equipment.paridad
                          ? SERIAL_PARITY_LABEL[equipment.paridad]
                          : formatText(null)}{' '}
                        · {equipment.stop_bits} stop
                      </span>
                    ),
                  },
                ]
              : []),
            {
              label: 'Nombre en el firmware',
              value: (
                <CopyValue
                  value={equipment.nombre_dispositivo}
                  label="Copiar el nombre del dispositivo"
                />
              ),
            },
            { label: 'Tipo en el firmware', value: equipment.device_type },
            {
              label: 'Lectura',
              value: [
                equipment.modbusconnect ? 'conecta' : 'no conecta',
                equipment.modbusread ? 'lee' : 'no lee',
                equipment.blockreading ? 'por bloques' : 'registro a registro',
              ].join(' · '),
            },
          ]}
        />
      </Panel>

      <VariablesTable
        resource={variables}
        selection={writable ? { selected, onChange: setSelected } : undefined}
        toolbar={
          <>
            {selected.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setConfirmingBulk(true);
                }}
              >
                Eliminar {selected.size}
              </Button>
            )}
            {newVariableButton}
          </>
        }
        emptyAction={newVariableButton}
        rowActions={(variable) =>
          writable ? (
            <Menu
              label={`Acciones de ${variable.nombre}`}
              items={[
                {
                  label: 'Editar',
                  onSelect: () => {
                    setTarget(variable);
                  },
                },
                {
                  label: 'Eliminar',
                  danger: true,
                  onSelect: () => {
                    setToDelete(variable);
                  },
                },
              ]}
            />
          ) : null
        }
      />

      {editingEquipment && (
        <EquipmentForm
          gatewayId={gateway.id}
          equipment={equipment}
          onClose={() => {
            setEditingEquipment(false);
          }}
          onSaved={(saved) => {
            setEquipment(saved);
            setEditingEquipment(false);
          }}
        />
      )}

      {target !== null && (
        <VariableForm
          key={target === 'new' ? 'new' : target.id}
          equipmentId={equipment.id}
          variable={target === 'new' ? null : target}
          onClose={() => {
            setTarget(null);
          }}
          onSaved={() => {
            setTarget(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmingBulk}
        title="Eliminar variables"
        message={`Se eliminarán ${selected.size} variables de este equipo. Esta acción no se puede deshacer.`}
        confirmLabel={`Eliminar ${selected.size}`}
        onCancel={() => {
          setConfirmingBulk(false);
        }}
        onConfirm={removeSelected}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar variable"
        message={
          toDelete
            ? `Se eliminará la variable "${toDelete.nombre}". Esta acción no se puede deshacer.`
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
