import { describe, expect, test } from '@rstest/core';
import {
  asApiError,
  fieldErrorsFromDetails,
  isApiError,
  toApiError,
} from '../src/lib/errors';

describe('fieldErrorsFromDetails', () => {
  test('maps Pydantic loc paths to field names', () => {
    const fieldErrors = fieldErrorsFromDetails({
      errors: [
        {
          loc: ['body', 'modbus_id'],
          msg: 'Input should be less than or equal to 247',
          type: 'less_than_equal',
        },
        { loc: ['body', 'tipo'], msg: 'Input should be a valid enumeration' },
      ],
    });

    expect(fieldErrors).toEqual({
      modbus_id: 'Input should be less than or equal to 247',
      tipo: 'Input should be a valid enumeration',
    });
  });

  test('keeps nested paths and drops only the location tag', () => {
    const fieldErrors = fieldErrorsFromDetails({
      errors: [{ loc: ['body', 'contacto', 'email'], msg: 'invalid' }],
    });

    expect(fieldErrors).toEqual({ 'contacto.email': 'invalid' });
  });

  test('keeps the first message when a field fails twice', () => {
    const fieldErrors = fieldErrorsFromDetails({
      errors: [
        { loc: ['body', 'escala'], msg: 'primero' },
        { loc: ['body', 'escala'], msg: 'segundo' },
      ],
    });

    expect(fieldErrors).toEqual({ escala: 'primero' });
  });

  test('survives a query-parameter error and a missing errors list', () => {
    expect(
      fieldErrorsFromDetails({
        errors: [{ loc: ['query', 'limit'], msg: 'x' }],
      }),
    ).toEqual({ limit: 'x' });
    expect(fieldErrorsFromDetails(undefined)).toEqual({});
    expect(fieldErrorsFromDetails({})).toEqual({});
  });

  test('ignores entries that are not Pydantic issues', () => {
    expect(fieldErrorsFromDetails({ errors: ['boom', null, 42] })).toEqual({});
  });
});

describe('toApiError', () => {
  test('reads the backend envelope and maps 422 details to fields', () => {
    const error = toApiError(422, {
      error: {
        code: 'validation_error',
        message: 'Request payload failed validation',
        details: { errors: [{ loc: ['body', 'email'], msg: 'not an email' }] },
      },
    });

    expect(error.status).toBe(422);
    expect(error.code).toBe('validation_error');
    expect(error.fieldErrors).toEqual({ email: 'not an email' });
  });

  test('shows a business rule message verbatim, it is written for the user', () => {
    const error = toApiError(400, {
      error: {
        code: 'business_rule_violation',
        message: 'Un usuario cliente necesita client_id',
        details: {},
      },
    });

    expect(error.message).toBe('Un usuario cliente necesita client_id');
  });

  test('falls back to internal_error on an unknown code', () => {
    const error = toApiError(500, {
      error: { code: 'something_new', message: 'boom' },
    });

    expect(error.code).toBe('internal_error');
    expect(error.fieldErrors).toEqual({});
  });

  test('a request that never reached the backend is a network error', () => {
    expect(toApiError(0, null).code).toBe('network_error');
  });

  test('a body that is not an envelope does not crash the mapping', () => {
    expect(toApiError(502, '<html>bad gateway</html>').code).toBe(
      'internal_error',
    );
  });
});

describe('isApiError / asApiError', () => {
  test('recognises a mapped error and rejects anything else', () => {
    expect(isApiError(toApiError(404, null))).toBe(true);
    expect(isApiError(new Error('nope'))).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError({ status: 404 })).toBe(false);
  });

  test('asApiError passes mapped errors through and wraps the rest', () => {
    const mapped = toApiError(403, {
      error: { code: 'not_authorized', message: 'x' },
    });
    expect(asApiError(mapped)).toBe(mapped);
    expect(asApiError(new Error('boom')).code).toBe('internal_error');
  });
});
