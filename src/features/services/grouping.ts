import type { PlatformSetting, SettingOrigin } from '../../api';

/**
 * En qué bloque va cada variable, según su nombre.
 *
 * El grupo se deriva del prefijo y no se guarda en la base: los nombres ya lo
 * codifican, así que una columna `grupo` sería un segundo lugar donde decir lo
 * mismo — y alguien tendría que acordarse de completarla en cada alta.
 *
 * Ordenar alfabético dejaba `INFLUXDB_URL` (el InfluxDB local del equipo)
 * después del bloque `INFLUXDB_SERVER_*`, o sea las locales partidas al medio
 * por las del servidor. Esa es exactamente la distinción que importa acá: una
 * base vive en el gateway y la otra es central.
 */

export interface Grupo {
  titulo: string;
  descripcion: string;
  settings: PlatformSetting[];
  /** Falso cuando el valor no vive en el CRM: la fila se muestra sin acciones. */
  editable: boolean;
}

// El orden es el de lectura, no el alfabético: primero lo que define a dónde
// se conecta el equipo, después dónde guarda.
//
// El prefijo más largo va primero. Con `INFLUXDB_` antes que
// `INFLUXDB_SERVER_`, todas las del servidor caerían en el grupo local.
const BLOQUES: { prefijo: string; titulo: string; descripcion: string }[] = [
  {
    prefijo: 'MQTT_',
    titulo: 'Broker MQTT',
    descripcion: 'Por dónde el equipo publica sus lecturas.',
  },
  {
    prefijo: 'CRM_',
    titulo: 'Este CRM',
    descripcion: 'Dónde el equipo busca su configuración y reporta que vive.',
  },
  {
    prefijo: 'GATEWAY_',
    titulo: 'Software del equipo',
    descripcion:
      'Qué versión instala un gateway nuevo, y de dónde la baja. Se cambia después de probarla, no al publicarla.',
  },
  {
    prefijo: 'FIRMWARE_',
    titulo: 'Actualización remota',
    descripcion:
      'Cuándo se actualizan los equipos ya instalados. La hora es local a cada sede, y con el interruptor apagado ningún equipo baja nada.',
  },
  {
    prefijo: 'INFLUXDB_SERVER_',
    titulo: 'InfluxDB central',
    descripcion: 'La base del servidor, donde el equipo vuelca cada tanto.',
  },
  {
    prefijo: 'INFLUXDB_',
    titulo: 'InfluxDB local',
    descripcion: 'La base que corre en el propio gateway.',
  },
];

const OTRAS = {
  titulo: 'Otras',
  descripcion: 'Las que se agregaron a mano y no entran en ningún bloque.',
};

// Las que el CRM no llena van al final, en su propio bloque. Mezcladas entre
// las editables, una fila vacía sin botones se lee como una que falta cargar.
const NO_EDITABLES: {
  origen: SettingOrigin;
  titulo: string;
  descripcion: string;
}[] = [
  {
    origen: 'identidad',
    titulo: 'Identidad del equipo',
    descripcion:
      'Sale de la ficha del gateway en el CRM. Se ve acá para que su nombre viaje en la configuración.',
  },
  {
    origen: 'equipo',
    titulo: 'Se generan en el equipo',
    descripcion:
      'Las crea el propio gateway al instalarse, al azar, y no salen de ahí.',
  },
];

export function agrupar(settings: PlatformSetting[]): Grupo[] {
  const propias = settings.filter((s) => s.origen === 'plataforma');

  const grupos: Grupo[] = BLOQUES.map((bloque) => ({
    titulo: bloque.titulo,
    descripcion: bloque.descripcion,
    settings: [],
    editable: true,
  }));
  const otras: Grupo = { ...OTRAS, settings: [], editable: true };

  for (const setting of propias) {
    const indice = BLOQUES.findIndex((bloque) =>
      setting.clave.startsWith(bloque.prefijo),
    );
    // Una variable nueva sin prefijo conocido no desaparece: cae al final.
    // Esconderla sería peor que ponerla en un grupo discutible.
    (indice === -1 ? otras : grupos[indice]!).settings.push(setting);
  }

  const ajenas: Grupo[] = NO_EDITABLES.map((bloque) => ({
    titulo: bloque.titulo,
    descripcion: bloque.descripcion,
    settings: settings.filter((s) => s.origen === bloque.origen),
    editable: false,
  }));

  return [...grupos, otras, ...ajenas].filter(
    (grupo) => grupo.settings.length > 0,
  );
}
