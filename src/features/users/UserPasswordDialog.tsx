import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, usersApi } from '../../api';
import type { User } from '../../api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';

interface PasswordValues {
  new_password: string;
}

export interface UserPasswordDialogProps {
  user: User;
  onClose: () => void;
}

/** An admin setting someone else's password, for when they lost access. */
export function UserPasswordDialog({ user, onClose }: UserPasswordDialogProps) {
  const { notify } = useToast();

  const form = useResourceForm<PasswordValues, void>({
    initialValues: { new_password: '' },
    validate: (values): Record<string, string> =>
      values.new_password.length < PASSWORD_MIN_LENGTH
        ? { new_password: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` }
        : {},
    submit: async (values) => {
      await usersApi.setUserPassword(user.id, {
        new_password: values.new_password,
      });
    },
    onSuccess: () => {
      notify('success', `Contraseña de ${user.email} actualizada`);
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Restablecer contraseña"
      description={user.email}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="user-password-form"
            variant="primary"
            loading={form.submitting}
          >
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="user-password-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="user-new-password"
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          maxLength={PASSWORD_MAX_BYTES}
          value={form.values.new_password}
          error={form.errorFor('new_password')}
          onChange={(event) => {
            form.setValue('new_password', event.target.value);
          }}
        />
        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
