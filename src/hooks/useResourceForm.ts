/**
 * Create/edit forms: values, live client-side validation, and the server's
 * field errors mapped back onto the inputs.
 *
 * A field shows the server error first — it is the newest information — and
 * falls back to the client rule once the user has touched the field.
 */

import { useState } from 'react';
import type { ApiErrorCode } from '../api';
import { asApiError } from '../lib/errors';

export interface UseResourceFormOptions<TValues, TResult> {
  initialValues: TValues;
  submit: (values: TValues) => Promise<TResult>;
  /** Pure client-side rules, keyed by field name. */
  validate?: (values: TValues) => Record<string, string>;
  /**
   * Which input a 409 belongs to. The backend reports "already exists"
   * without naming the column, but the form knows what is unique about it.
   */
  conflictField?: string;
  /** Wording this form wants instead of the generic one, per error code. */
  errorMessages?: Partial<Record<ApiErrorCode, string>>;
  onSuccess?: (result: TResult) => void;
}

export interface ResourceForm<TValues> {
  values: TValues;
  setValue: <K extends keyof TValues>(field: K, value: TValues[K]) => void;
  /** Error to render under a field, or undefined. */
  errorFor: (field: string) => string | undefined;
  /** Error that belongs to the form as a whole, not to one input. */
  formError: string | null;
  submitting: boolean;
  /** Wired to a `<form onSubmit>`; typed by what it actually uses. */
  handleSubmit: (event: { preventDefault: () => void }) => void;
  reset: (values?: TValues) => void;
}

export function useResourceForm<TValues extends object, TResult>({
  initialValues,
  submit,
  validate,
  conflictField,
  errorMessages,
  onSuccess,
}: UseResourceFormOptions<TValues, TResult>): ResourceForm<TValues> {
  const [values, setValues] = useState<TValues>(initialValues);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clientErrors = validate ? validate(values) : {};

  const run = async () => {
    setShowAllErrors(true);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    setServerErrors({});
    setFormError(null);
    try {
      const result = await submit(values);
      onSuccess?.(result);
    } catch (caught: unknown) {
      const error = asApiError(caught);
      const message = errorMessages?.[error.code] ?? error.message;

      if (error.code === 'validation_error') {
        setServerErrors(error.fieldErrors);
        setFormError(
          Object.keys(error.fieldErrors).length > 0 ? null : message,
        );
      } else if (error.code === 'already_exists' && conflictField) {
        setServerErrors({ [conflictField]: message });
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    values,
    submitting,
    formError,
    setValue: (field, value) => {
      setValues((current) => ({ ...current, [field]: value }));
      setTouched((current) => new Set(current).add(String(field)));
      // The server's verdict was about the old value.
      setServerErrors((current) => {
        if (!(String(field) in current)) return current;
        const next = { ...current };
        delete next[String(field)];
        return next;
      });
    },
    errorFor: (field) => {
      const serverError = serverErrors[field];
      if (serverError) return serverError;
      if (!showAllErrors && !touched.has(field)) return undefined;
      return clientErrors[field];
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void run();
    },
    reset: (next) => {
      setValues(next ?? initialValues);
      setTouched(new Set());
      setShowAllErrors(false);
      setServerErrors({});
      setFormError(null);
    },
  };
}
