/**
 * Cómo se muestran los datos de generación de una sede.
 *
 * Tres estados, y el que importa es el que no existe como valor: nadie lo
 * declaró. Mostrar "No" ahí sería afirmar algo que no se revisó — y del otro
 * lado, ApiEMS lo deduce de la energía exportada justamente por eso.
 */

import { describe, expect, test } from '@rstest/core';
import {
  textoCapacidad,
  textoGeneracion,
} from '../src/features/sites/generacion';

describe('la generación declarada', () => {
  test('sí y no se muestran tal cual', () => {
    expect(textoGeneracion(true)).toBe('Sí');
    expect(textoGeneracion(false)).toBe('No, solo consumo');
  });

  test('sin declarar no es "no"', () => {
    expect(textoGeneracion(null)).toBe(
      'Sin declarar (se detecta automáticamente)',
    );
  });

  test('un backend anterior al campo tampoco es "no"', () => {
    // Un panel nuevo contra una API vieja recibe `undefined`. Decir "No, solo
    // consumo" ahí sería inventar un hecho verificado.
    expect(textoGeneracion(undefined)).toBe(
      'Sin declarar (se detecta automáticamente)',
    );
  });
});

describe('la capacidad instalada', () => {
  test('se muestra con su unidad', () => {
    expect(textoCapacidad('5.50')).toBe('5.50 kWp');
  });

  test('sin capacidad no se inventa un cero', () => {
    // Un cero se leería como "tiene paneles de 0 kWp", que es distinto de "no
    // sabemos cuántos".
    expect(textoCapacidad(null)).toBe('—');
    expect(textoCapacidad(undefined)).toBe('—');
    expect(textoCapacidad('')).toBe('—');
  });
});
