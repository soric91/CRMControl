/**
 * The other half of the 422 story: the mapped field errors have to land under
 * the right input, and stop showing once the user edits that field.
 */

import { describe, expect, test } from '@rstest/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toApiError } from '../src/lib/errors';
import { useResourceForm } from '../src/hooks/useResourceForm';

const submitEvent = { preventDefault: () => undefined };

interface Values {
  nombre: string;
  modbus_id: string;
}

const VALIDATION_ERROR = toApiError(422, {
  error: {
    code: 'validation_error',
    message: 'Request payload failed validation',
    details: {
      errors: [
        { loc: ['body', 'modbus_id'], msg: 'Input should be <= 247' },
        { loc: ['body', 'nombre'], msg: 'Field required' },
      ],
    },
  },
});

const CONFLICT_ERROR = toApiError(409, {
  error: { code: 'already_exists', message: 'A client named X already exists' },
});

const BUSINESS_ERROR = toApiError(400, {
  error: {
    code: 'business_rule_violation',
    message: 'Un usuario cliente necesita client_id',
  },
});

function setup(submit: (values: Values) => Promise<Values>) {
  return renderHook(() =>
    useResourceForm<Values, Values>({
      initialValues: { nombre: 'Acme', modbus_id: '999' },
      conflictField: 'nombre',
      submit,
    }),
  );
}

describe('useResourceForm', () => {
  test('puts each 422 message under its own field', async () => {
    const { result } = setup(() => Promise.reject(VALIDATION_ERROR));

    act(() => {
      result.current.handleSubmit(submitEvent);
    });

    await waitFor(() => {
      expect(result.current.errorFor('modbus_id')).toBe(
        'Input should be <= 247',
      );
    });
    expect(result.current.errorFor('nombre')).toBe('Field required');
    // The errors belong to the inputs, so there is nothing left to say at the
    // form level.
    expect(result.current.formError).toBeNull();
  });

  test('clears a field error as soon as that field is edited', async () => {
    const { result } = setup(() => Promise.reject(VALIDATION_ERROR));

    act(() => {
      result.current.handleSubmit(submitEvent);
    });
    await waitFor(() => {
      expect(result.current.errorFor('modbus_id')).toBeDefined();
    });

    act(() => {
      result.current.setValue('modbus_id', '12');
    });

    expect(result.current.errorFor('modbus_id')).toBeUndefined();
    // The untouched field keeps its error.
    expect(result.current.errorFor('nombre')).toBe('Field required');
  });

  test('a 409 lands on the field the form declared as unique', async () => {
    const { result } = setup(() => Promise.reject(CONFLICT_ERROR));

    act(() => {
      result.current.handleSubmit(submitEvent);
    });

    await waitFor(() => {
      expect(result.current.errorFor('nombre')).toBe(
        'Ya existe un registro con esos datos',
      );
    });
  });

  test('a business rule message is shown at form level, verbatim', async () => {
    const { result } = setup(() => Promise.reject(BUSINESS_ERROR));

    act(() => {
      result.current.handleSubmit(submitEvent);
    });

    await waitFor(() => {
      expect(result.current.formError).toBe(
        'Un usuario cliente necesita client_id',
      );
    });
  });

  test('client-side rules block the request before it is sent', async () => {
    let submitted = 0;
    const { result } = renderHook(() =>
      useResourceForm<Values, Values>({
        initialValues: { nombre: '', modbus_id: '1' },
        validate: (values): Record<string, string> =>
          values.nombre === '' ? { nombre: 'Obligatorio' } : {},
        submit: (values) => {
          submitted += 1;
          return Promise.resolve(values);
        },
      }),
    );

    act(() => {
      result.current.handleSubmit(submitEvent);
    });

    await waitFor(() => {
      expect(result.current.errorFor('nombre')).toBe('Obligatorio');
    });
    expect(submitted).toBe(0);
  });
});
