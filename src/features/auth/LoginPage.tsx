import { Navigate, useLocation, useNavigate } from 'react-router';
import { PASSWORD_MIN_LENGTH } from '../../api';
import type { LoginPayload } from '../../api';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useResourceForm } from '../../hooks/useResourceForm';
import { LANDING_PATH } from '../../lib/permissions';

/** Reads the path `ProtectedRoute` stashed before bouncing to login. */
function redirectTarget(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return null;
  }
  const { from } = state;
  return typeof from === 'string' && from !== '/login' ? from : null;
}

export function LoginPage() {
  const { user, status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const form = useResourceForm<LoginPayload, void>({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) errors.email = 'Ingresá un email válido';
      if (values.password.length < PASSWORD_MIN_LENGTH) {
        errors.password = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
      }
      return errors;
    },
    errorMessages: {
      authentication_failed: 'Email o contraseña incorrectos',
    },
    submit: async (values) => {
      await signIn(values);
      const target = redirectTarget(location.state) ?? LANDING_PATH;
      await navigate(target, { replace: true });
    },
  });

  if (status === 'authenticated' && user) {
    return <Navigate to={LANDING_PATH} replace />;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-contrast">
            E
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-content">
              EMS Console
            </h1>
            <p className="text-sm text-content-muted">
              Administración de dispositivos
            </p>
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-sm"
        >
          <Input
            id="login-email"
            label="Email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={form.values.email}
            error={form.errorFor('email')}
            onChange={(event) => {
              form.setValue('email', event.target.value);
            }}
          />
          <Input
            id="login-password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={form.values.password}
            error={form.errorFor('password')}
            onChange={(event) => {
              form.setValue('password', event.target.value);
            }}
          />

          {form.formError && (
            <p role="alert" className="text-sm text-danger">
              {form.formError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={form.submitting}
            className="mt-1 w-full"
          >
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
