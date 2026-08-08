import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, authApi } from '../../api';
import { renewAccessToken } from '../../api/http';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';

interface PasswordFormValues {
  current_password: string;
  new_password: string;
  repeat_password: string;
}

export interface PasswordChangeFormProps {
  /** Rendered next to the submit button, e.g. a "Volver" link. */
  secondaryAction?: React.ReactNode;
  submitLabel?: string;
  onDone?: () => void;
}

/**
 * Shared by the voluntary change and the mandatory one. Both end the same way:
 * the password is replaced and the session is re-issued.
 */
export function PasswordChangeForm({
  secondaryAction,
  submitLabel = 'Guardar',
  onDone,
}: PasswordChangeFormProps) {
  const { notify } = useToast();
  const { clearPasswordChangeRequired } = useAuth();

  const form = useResourceForm<PasswordFormValues, void>({
    initialValues: {
      current_password: '',
      new_password: '',
      repeat_password: '',
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.current_password) {
        errors.current_password = 'Ingresá tu contraseña actual';
      }
      if (values.new_password.length < PASSWORD_MIN_LENGTH) {
        errors.new_password = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
      }
      if (values.new_password === values.current_password) {
        errors.new_password = 'Tiene que ser distinta de la actual';
      }
      if (values.repeat_password !== values.new_password) {
        errors.repeat_password = 'Las contraseñas no coinciden';
      }
      return errors;
    },
    errorMessages: {
      authentication_failed: 'La contraseña actual no es correcta',
    },
    submit: async (values) => {
      await authApi.changeOwnPassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });

      // The access token carries its scope as a claim, so the one in hand is
      // still restricted even though the account no longer is. Renewing it is
      // what actually unlocks the app.
      await renewAccessToken();
    },
    onSuccess: () => {
      clearPasswordChangeRequired();
      notify('success', 'Contraseña actualizada');
      form.reset();
      onDone?.();
    },
  });

  return (
    <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
      <Input
        id="current-password"
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        required
        value={form.values.current_password}
        error={form.errorFor('current_password')}
        onChange={(event) => {
          form.setValue('current_password', event.target.value);
        }}
      />
      <Input
        id="new-password"
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        maxLength={PASSWORD_MAX_BYTES}
        hint={`Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_BYTES} caracteres`}
        value={form.values.new_password}
        error={form.errorFor('new_password')}
        onChange={(event) => {
          form.setValue('new_password', event.target.value);
        }}
      />
      <Input
        id="repeat-password"
        label="Repetir contraseña nueva"
        type="password"
        autoComplete="new-password"
        required
        value={form.values.repeat_password}
        error={form.errorFor('repeat_password')}
        onChange={(event) => {
          form.setValue('repeat_password', event.target.value);
        }}
      />

      {form.formError && (
        <p role="alert" className="text-sm text-danger">
          {form.formError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" loading={form.submitting}>
          {submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}
