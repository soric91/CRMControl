import { Outlet, useOutletContext, useParams } from 'react-router';
import { equipmentApi } from '../../api';
import type { Equipment } from '../../api';
import { useCrumb } from '../../components/layout/Breadcrumbs';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonPanel } from '../../components/ui/Skeleton';
import { useResource } from '../../hooks/useResource';
import { EQUIPMENT_TYPE_LABEL } from '../../lib/formatters';
import { useGatewayOutlet } from '../gateways/GatewayLayout';
import type { GatewayOutletContext } from '../gateways/GatewayLayout';

export interface EquipmentOutletContext extends GatewayOutletContext {
  equipment: Equipment;
  setEquipment: (equipment: Equipment) => void;
}

export function useEquipmentOutlet(): EquipmentOutletContext {
  return useOutletContext<EquipmentOutletContext>();
}

/** Equipment has no name of its own; its Modbus id is what identifies it. */
export function equipmentLabel(equipment: Equipment): string {
  return `${EQUIPMENT_TYPE_LABEL[equipment.tipo]} ${equipment.modbus_id}`;
}

export function EquipmentLayout() {
  const parent = useGatewayOutlet();
  const { equipmentId = '' } = useParams();
  const resource = useResource(
    () => equipmentApi.getEquipment(equipmentId),
    [equipmentId],
  );
  const equipment = resource.data;

  useCrumb(
    equipment
      ? {
          to: `/clients/${parent.client.id}/sites/${parent.site.id}/gateways/${parent.gateway.id}/equipment/${equipment.id}`,
          label: equipmentLabel(equipment),
        }
      : null,
  );

  if (resource.loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <SkeletonPanel />
      </div>
    );
  }

  if (resource.error) {
    return (
      <ErrorState
        error={resource.error}
        onRetry={resource.reload}
        notFoundTitle="Este equipo no existe o no está a tu alcance"
      />
    );
  }

  if (!equipment) return null;

  const context: EquipmentOutletContext = {
    ...parent,
    equipment,
    setEquipment: resource.set,
  };
  return <Outlet context={context} />;
}
