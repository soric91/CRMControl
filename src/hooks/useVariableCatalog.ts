import { useEffect, useState } from 'react';
import { variableCatalogApi } from '../api';
import type { Medicion } from '../api';

/**
 * El catálogo de mediciones, pedido una sola vez por sesión.
 *
 * Es una lista fija que no depende del cliente ni del equipo, así que volver
 * a pedirla cada vez que se abre el formulario sería una petición por nada.
 * El caché vive a nivel de módulo: sobrevive al desmontaje del componente.
 */
let cached: Medicion[] | null = null;
let inFlight: Promise<Medicion[]> | null = null;

async function load(): Promise<Medicion[]> {
  if (cached) return cached;
  inFlight ??= variableCatalogApi.listVariableCatalog().then((mediciones) => {
    cached = mediciones;
    inFlight = null;
    return mediciones;
  });
  return inFlight;
}

export interface VariableCatalog {
  mediciones: Medicion[];
  loading: boolean;
}

export function useVariableCatalog(): VariableCatalog {
  const [mediciones, setMediciones] = useState<Medicion[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    void load()
      .then((result) => {
        if (alive) setMediciones(result);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { mediciones, loading };
}
