/**
 * The base of a register address is the one place where a mistake is silent:
 * `2006` is a valid number in either base and points at a different register
 * in each. The gateway then returns a plausible-looking wrong reading.
 *
 * What is tested here is only the client-side half — the live equivalence and
 * the instant complaint. The address that gets saved is resolved by the
 * backend from the raw text plus the notation.
 */

import { describe, expect, test } from '@rstest/core';
import { isRegisterChar, previewHex, readRegister } from '../src/lib/modbus';

describe('readRegister in hex', () => {
  test('takes the datasheet number with or without the prefix', () => {
    expect(readRegister('2006', 'hex')).toEqual({ ok: true, value: 8198 });
    expect(readRegister('0x2006', 'hex')).toEqual({ ok: true, value: 8198 });
    expect(readRegister('0X2006', 'hex')).toEqual({ ok: true, value: 8198 });
    expect(readRegister('  2006  ', 'hex')).toEqual({ ok: true, value: 8198 });
  });

  test('accepts the letters a–f', () => {
    expect(readRegister('ff', 'hex')).toEqual({ ok: true, value: 255 });
    expect(readRegister('0xFF', 'hex')).toEqual({ ok: true, value: 255 });
  });

  test('rejects what is not a hex number', () => {
    expect(readRegister('', 'hex').ok).toBe(false);
    expect(readRegister('0x', 'hex').ok).toBe(false);
    expect(readRegister('20 06', 'hex').ok).toBe(false);
    expect(readRegister('zz', 'hex').ok).toBe(false);
  });
});

describe('readRegister in decimal', () => {
  test('reads plain digits', () => {
    expect(readRegister('2000', 'decimal')).toEqual({ ok: true, value: 2000 });
    expect(readRegister('0', 'decimal')).toEqual({ ok: true, value: 0 });
  });

  test('refuses a hex prefix instead of guessing', () => {
    // Saying "0x2006 is decimal" is a contradiction, and picking one meaning
    // silently is exactly how the wrong register gets stored.
    const reading = readRegister('0x2006', 'decimal');
    expect(reading.ok).toBe(false);
    expect(reading.ok === false && reading.error).toMatch(/hexadecimal/i);
  });

  test('refuses the letters a–f', () => {
    expect(readRegister('ff', 'decimal').ok).toBe(false);
  });
});

describe('the mix-up this exists to catch', () => {
  test('the same text means two different registers', () => {
    // The Chint DTSU666 map says VOLTAGE_A is at 0x2006.
    expect(readRegister('2006', 'hex')).toEqual({ ok: true, value: 8198 });
    expect(readRegister('2006', 'decimal')).toEqual({ ok: true, value: 2006 });
  });

  test('the row already stored wrong reads as its literal decimal', () => {
    expect(readRegister('2000', 'decimal')).toEqual({ ok: true, value: 2000 });
  });
});

describe('isRegisterChar', () => {
  test('hex takes digits, a–f and the prefix letter', () => {
    for (const char of ['0', '9', 'a', 'F', 'x', 'X']) {
      expect(isRegisterChar(char, 'hex')).toBe(true);
    }
    expect(isRegisterChar('g', 'hex')).toBe(false);
    expect(isRegisterChar(' ', 'hex')).toBe(false);
  });

  test('decimal takes digits, and keeps the x so it can be objected to', () => {
    expect(isRegisterChar('7', 'decimal')).toBe(true);
    expect(isRegisterChar('a', 'decimal')).toBe(false);
    // Swallowing it would turn a pasted `0x2006` into `02006`: a wrong
    // register that looks right. It has to reach the validation.
    expect(isRegisterChar('x', 'decimal')).toBe(true);
  });
});

describe('previewHex', () => {
  test('matches the shape the firmware map files use', () => {
    expect(previewHex(8198)).toBe('0x2006');
    expect(previewHex(2000)).toBe('0x07D0');
    expect(previewHex(0)).toBe('0x0000');
  });
});
