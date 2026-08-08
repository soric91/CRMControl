/**
 * Reading a register address in the base the operator says it is written in.
 *
 * **This is not the conversion that gets saved.** The form sends the text
 * exactly as typed together with `notacion_registro`, and the backend resolves
 * it — one rule, one place. What lives here only feeds two things the server
 * cannot do before the row exists: the live equivalence under the field, and
 * the instant complaint when the text and the chosen base contradict each
 * other. It mirrors `app/domain/firmware.parse_address`; if that changes, this
 * follows.
 *
 * The mix-up it exists to surface: the Chint DTSU666 map says `VOLTAGE_A` is
 * at `0x2006`. Read as decimal, `2006` is a different register, and the
 * gateway returns a number that looks perfectly valid.
 */

import type { RegisterNotation } from '../api/types';

const HEX_DIGITS = /^[0-9a-f]+$/i;
const DECIMAL_DIGITS = /^\d+$/;

/**
 * Characters the input lets through, so the rest never reach the field.
 *
 * `x` passes in **both** bases on purpose. Dropping it from a pasted `0x2006`
 * under decimal would turn it into `02006` — a valid-looking address pointing
 * at the wrong register, which is the exact failure this whole field exists to
 * prevent. It has to survive so the validation can object to it out loud.
 */
export function isRegisterChar(
  char: string,
  notation: RegisterNotation,
): boolean {
  return notation === 'hex'
    ? /^[0-9a-fx]$/i.test(char)
    : /^[0-9x]$/i.test(char);
}

export type RegisterReading =
  { ok: true; value: number } | { ok: false; error: string };

/**
 * `2006` and `0x2006` both read as 8198 under `hex`; the prefix is optional
 * because people paste datasheets both ways. Under `decimal` the prefix is
 * refused rather than guessed: the two say different things and picking one
 * silently is how the wrong register gets saved.
 */
export function readRegister(
  input: string,
  notation: RegisterNotation,
): RegisterReading {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'Obligatorio' };

  const hasPrefix = text.toLowerCase().startsWith('0x');
  const digits = hasPrefix ? text.slice(2) : text;

  if (notation === 'hex') {
    if (digits === '' || !HEX_DIGITS.test(digits)) {
      return {
        ok: false,
        error: 'Usá dígitos hexadecimales, por ejemplo 2006',
      };
    }
    return { ok: true, value: Number.parseInt(digits, 16) };
  }

  if (hasPrefix) {
    return {
      ok: false,
      error: 'Parece hexadecimal. Cambiá la base a Hex o sacá el 0x.',
    };
  }
  if (!DECIMAL_DIGITS.test(text)) {
    return { ok: false, error: 'Usá solo dígitos, por ejemplo 2000' };
  }
  return { ok: true, value: Number.parseInt(text, 10) };
}

/**
 * The shape the firmware's map files use, matching the backend's
 * `as_firmware_address`. Only for the preview: what a saved row shows comes
 * from `registro_display`.
 */
export function previewHex(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
}
