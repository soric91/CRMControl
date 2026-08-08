import { useState } from 'react';
import { useNavigate } from 'react-router';
import { clientsApi } from '../../api';
import type { Client } from '../../api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { IconPlus } from '../../components/ui/Icon';
import { Menu } from '../../components/ui/Menu';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedResource } from '../../hooks/usePaginatedResource';
import { canWrite } from '../../lib/permissions';
import { ClientForm } from './ClientForm';
import { ClientsTable } from './ClientsTable';

/** `null` means the drawer is closed; `'new'` creates; a client edits. */
type FormTarget = Client | 'new' | null;

export function ClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  const resource = usePaginatedResource((params) =>
    clientsApi.listClients(params),
  );

  const writable = user !== null && canWrite(user.role);

  const newClientButton = writable ? (
    <Button
      variant="primary"
      icon={<IconPlus className="size-4" />}
      onClick={() => {
        setFormTarget('new');
      }}
    >
      Nuevo cliente
    </Button>
  ) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes"
        description="Cada cliente agrupa sus sedes, gateways, equipos y variables."
        actions={newClientButton}
      />

      <ClientsTable
        resource={resource}
        emptyAction={newClientButton}
        onRowClick={(client) => {
          void navigate(`/clients/${client.id}`);
        }}
        rowActions={(client) => (
          <Menu
            label={`Acciones de ${client.nombre_empresa}`}
            items={[
              {
                label: 'Ver detalle',
                onSelect: () => {
                  void navigate(`/clients/${client.id}`);
                },
              },
              ...(writable
                ? [
                    {
                      label: 'Editar',
                      onSelect: () => {
                        setFormTarget(client);
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      />

      {formTarget !== null && (
        <ClientForm
          key={formTarget === 'new' ? 'new' : formTarget.id}
          client={formTarget === 'new' ? null : formTarget}
          onClose={() => {
            setFormTarget(null);
          }}
          onSaved={() => {
            setFormTarget(null);
            resource.reload();
          }}
        />
      )}
    </div>
  );
}
