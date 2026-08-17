/**
 * Cómo se leen los datos de generación de una sede.
 *
 * Fuera del componente para poder probarlos: son tres estados, y el que
 * importa es el que no existe como valor.
 */

/**
 * `null` NO es "no tiene": es que nadie lo declaró, y la analítica lo deduce
 * de la energía exportada. Decir "No" ahí sería afirmar algo que no se revisó.
 *
 * `undefined` se trata igual: pasa cuando el backend que responde es anterior
 * al campo. Un panel nuevo contra una API vieja tiene que decir "no lo sé", no
 * inventar un "No" que el usuario leería como un hecho verificado.
 */
export function textoGeneracion(valor: boolean | null | undefined): string {
  if (valor === null || valor === undefined) {
    return 'Sin declarar (se detecta automáticamente)';
  }
  return valor ? 'Sí' : 'No, solo consumo';
}

/** La capacidad declarada, o un guion cuando no hay ninguna. */
export function textoCapacidad(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return `${valor} kWp`;
}
