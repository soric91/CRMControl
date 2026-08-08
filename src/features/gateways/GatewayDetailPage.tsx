import { useState } from 'react';
import { useNavigate } from 'react-router';
import { equipmentApi, gatewaysApi } from '../../api';
import type { Equipment } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
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
import { EQUIPMENT_TYPE_LABEL, formatText } from '../../lib/formatters';
import { canWrite } from '../../lib/permissions';
import { EquipmentForm } from '../equipment/EquipmentForm';
import { EquipmentTable } from '../equipment/EquipmentTable';
import { GatewayConfigPanel } from './GatewayConfigPanel';
import { GatewayCredentialPanel } from './GatewayCredentialPanel';
import { GatewayEnrollmentPanel } from './GatewayEnrollmentPanel';
import { GatewayForm } from './GatewayForm';
import { GatewayStatusBadge, LastSeen } from './GatewaysTable';
import { useGatewayOutlet } from './GatewayLayout';

type EquipmentFormTarget = Equipment | 'new' | null;

export function GatewayDetailPage() {
  const { client, site, gateway, setGateway } = useGatewayOutlet();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [editingGateway, setEditingGateway] = useState(false);
  const [target, setTarget] = useState<EquipmentFormTarget>(null);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);

  const equipment = usePaginatedResource(
    (params) => gatewaysApi.listGatewayEquipment(gateway.id, params),
    [gateway.id],
  );

  const writable = user !== null && canWrite(user.role);
  const basePath = `/clients/${client.id}/sites/${site.id}/gateways/${gateway.id}`;

  const remove = async (item: Equipment) => {
    try {
      await equipmentApi.deleteEquipment(item.id);
      notify('success', `Equipo Modbus ${item.modbus_id} eliminado`);
      equipment.reload();
    } catch (caught: unknown) {
      notify('error', asApiError(caught).message);
    } finally {
      setToDelete(null);
    }
  };

  const newEquipmentButton = writable ? (
    <Button
      variant="primary"
      size="sm"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setTarget('new');
      }}
    >
      Nuevo equipo
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={gateway.numero_serie}
        meta={<GatewayStatusBadge estado={gateway.estado} />}
        description={`Sede ${site.nombre}`}
        actions={
          writable && (
            <Button
              onClick={() => {
                setEditingGateway(true);
              }}
            >
              Editar gateway
            </Button>
          )
        }
      />

      <Panel title="Datos del gateway">
        <DetailList
          items={[
            {
              // The identity the firmware reports with; goes in config.ini.
              label: 'UUID del gateway',
              value: (
                <CopyValue
                  value={gateway.uuid}
                  label="Copiar el UUID del gateway"
                />
              ),
            },
            {
              label: 'Firmware',
              value: formatText(gateway.firmware_version),
            },
            {
              label: 'IP actual',
              value: (
                <span className="tabular-nums">
                  {formatText(gateway.ip_actual)}
                </span>
              ),
            },
            {
              label: 'Última conexión',
              value: <LastSeen iso={gateway.ultima_conexion} />,
            },
            {
              label: 'Intervalo de lectura',
              value: `${gateway.intervalo_lectura_segundos} s`,
            },
            {
              label: 'Ventana de lectura',
              value: `${String(gateway.hora_inicio).padStart(2, '0')}:00 – ${String(gateway.hora_fin).padStart(2, '0')}:00`,
            },
            { label: 'Nivel de log', value: gateway.log_level },
          ]}
        />
      </Panel>

      <GatewayConfigPanel
        gateway={gateway}
        writable={writable}
        onGatewayChange={setGateway}
      />

      <GatewayCredentialPanel gateway={gateway} writable={writable} />

      <GatewayEnrollmentPanel gateway={gateway} writable={writable} />

      <EquipmentTable
        resource={equipment}
        toolbar={newEquipmentButton}
        emptyAction={newEquipmentButton}
        onRowClick={(item) => {
          void navigate(`${basePath}/equipment/${item.id}`);
        }}
        rowActions={(item) => (
          <Menu
            label={`Acciones del equipo Modbus ${item.modbus_id}`}
            items={[
              {
                label: 'Ver variables',
                onSelect: () => {
                  void navigate(`${basePath}/equipment/${item.id}`);
                },
              },
              ...(writable
                ? [
                    {
                      label: 'Editar',
                      onSelect: () => {
                        setTarget(item);
                      },
                    },
                    {
                      label: 'Eliminar',
                      danger: true,
                      onSelect: () => {
                        setToDelete(item);
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      />

      {editingGateway && (
        <GatewayForm
          siteId={site.id}
          gateway={gateway}
          onClose={() => {
            setEditingGateway(false);
          }}
          onSaved={(saved) => {
            setGateway(saved);
            setEditingGateway(false);
          }}
        />
      )}

      {target !== null && (
        <EquipmentForm
          key={target === 'new' ? 'new' : target.id}
          gatewayId={gateway.id}
          equipment={target === 'new' ? null : target}
          onClose={() => {
            setTarget(null);
          }}
          onSaved={() => {
            setTarget(null);
            equipment.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar equipo"
        message={
          toDelete
            ? `Se eliminará el ${EQUIPMENT_TYPE_LABEL[toDelete.tipo].toLowerCase()} con ID Modbus ${toDelete.modbus_id} y todas sus variables. Esta acción no se puede deshacer.`
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
