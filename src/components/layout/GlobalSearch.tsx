/**
 * Jump straight to anything, from anywhere.
 *
 * Sites, gateways and equipment are searched by the backend. Clients still are
 * not — `/clients` has no `search` yet — so that group keeps filtering one
 * page in the browser until the parameter lands.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PAGE_LIMIT_MAX,
  clientsApi,
  equipmentApi,
  gatewaysApi,
  sitesApi,
} from '../../api';
import { asApiError } from '../../lib/errors';
import { IconSearch } from '../ui/Icon';

const MIN_QUERY_LENGTH = 2;
const PER_GROUP = 5;
const DEBOUNCE_MS = 250;

interface Hit {
  id: string;
  label: string;
  detail?: string;
  to: string;
}

interface Group {
  title: string;
  hits: Hit[];
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; groups: Group[] }
  | { kind: 'error'; message: string };

/**
 * A gateway or an equipment only knows its parent's id, and the detail routes
 * need the whole chain. Resolving it costs one request per level, which is
 * cheap for five results and keeps the links real.
 */
async function gatewayPath(siteId: string, gatewayId: string): Promise<string> {
  const site = await sitesApi.getSite(siteId);
  return `/clients/${site.client_id}/sites/${site.id}/gateways/${gatewayId}`;
}

async function search(term: string): Promise<Group[]> {
  const params = { search: term, limit: PER_GROUP };

  const [clients, sites, gateways, equipment] = await Promise.all([
    // Sin `search` todavía: se trae una página y se filtra acá.
    clientsApi.listClients({ limit: PAGE_LIMIT_MAX }),
    sitesApi.listSites(params),
    gatewaysApi.listGateways(params),
    equipmentApi.listEquipment(params),
  ]);

  const lowered = term.toLowerCase();
  const clientHits: Hit[] = clients.items
    .filter((client) => client.nombre_empresa.toLowerCase().includes(lowered))
    .slice(0, PER_GROUP)
    .map((client) => ({
      id: client.id,
      label: client.nombre_empresa,
      to: `/clients/${client.id}`,
    }));

  const siteHits: Hit[] = sites.items.map((site) => ({
    id: site.id,
    label: site.nombre,
    detail: site.direccion ?? undefined,
    to: `/clients/${site.client_id}/sites/${site.id}`,
  }));

  const gatewayHits: Hit[] = await Promise.all(
    gateways.items.map(async (gateway) => ({
      id: gateway.id,
      label: gateway.numero_serie,
      detail: gateway.estado === 'offline' ? 'Sin conexión' : 'En línea',
      to: await gatewayPath(gateway.site_id, gateway.id),
    })),
  );

  const equipmentHits: Hit[] = await Promise.all(
    equipment.items.map(async (item) => {
      const gateway = await gatewaysApi.getGateway(item.gateway_id);
      const base = await gatewayPath(gateway.site_id, gateway.id);
      return {
        id: item.id,
        label: item.nombre_dispositivo,
        detail: [item.marca, item.modelo].filter(Boolean).join(' '),
        to: `${base}/equipment/${item.id}`,
      };
    }),
  );

  return [
    { title: 'Clientes', hits: clientHits },
    { title: 'Sedes', hits: siteHits },
    { title: 'Gateways', hits: gatewayHits },
    { title: 'Equipos', hits: equipmentHits },
  ].filter((group) => group.hits.length > 0);
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const term = query.trim();

  useEffect(() => {
    if (term.length < MIN_QUERY_LENGTH) {
      setState({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });
    const timer = setTimeout(() => {
      search(term)
        .then((groups) => {
          if (!cancelled) setState({ kind: 'ready', groups });
        })
        .catch((caught: unknown) => {
          // Tragárselo haría que un buscador roto se vea igual que uno vacío.
          if (!cancelled) {
            setState({ kind: 'error', message: asApiError(caught).message });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const go = (hit: Hit) => {
    setQuery('');
    setOpen(false);
    void navigate(hit.to);
  };

  const firstHit =
    state.kind === 'ready' ? state.groups[0]?.hits[0] : undefined;
  const showResults = open && term.length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-content-subtle" />
      <input
        type="search"
        role="combobox"
        aria-expanded={showResults}
        aria-controls={showResults ? listId : undefined}
        aria-label="Buscar"
        placeholder="Buscar cliente, sede, gateway…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter' && firstHit) go(firstHit);
        }}
        className="w-full rounded-lg border border-line bg-surface-muted py-1.5 pr-3 pl-9 text-sm text-content transition-colors placeholder:text-content-subtle hover:border-line-strong"
      />

      {showResults && (
        <div
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-lg border border-line bg-surface-raised py-1 shadow-xl"
          style={{ minWidth: '20rem' }}
        >
          {state.kind === 'loading' ? (
            <p className="px-3 py-2 text-sm text-content-subtle">Buscando…</p>
          ) : state.kind === 'error' ? (
            <p className="px-3 py-2 text-sm text-danger">{state.message}</p>
          ) : state.kind === 'ready' && state.groups.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Resultados">
              {state.groups.map((group) => (
                <li key={group.title}>
                  <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-content-subtle uppercase">
                    {group.title}
                  </p>
                  <ul>
                    {group.hits.map((hit) => (
                      <li key={hit.id} role="option" aria-selected="false">
                        <button
                          type="button"
                          onClick={() => {
                            go(hit);
                          }}
                          className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                        >
                          <span className="text-sm text-content">
                            {hit.label}
                          </span>
                          {hit.detail && (
                            <span className="text-xs text-content-subtle">
                              {hit.detail}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-content-subtle">
              Sin coincidencias
            </p>
          )}
        </div>
      )}
    </div>
  );
}
