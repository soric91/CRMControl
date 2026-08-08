import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { PasswordChangeForm } from './PasswordChangeForm';

/**
 * Shown instead of the whole app while the account still holds the password an
 * administrator generated. Standalone on purpose: with a restricted token
 * every other screen would answer 403, so offering navigation would only lead
 * to dead ends.
 */
export function ForcedPasswordChangePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-content">
            Elegí tu contraseña
          </h1>
          <p className="text-sm text-content-muted">
            Tu cuenta usa una contraseña que generó un administrador. Cambiala
            para poder entrar al panel.
          </p>
          {user && <p className="text-xs text-content-subtle">{user.email}</p>}
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <PasswordChangeForm
            submitLabel="Cambiar y continuar"
            secondaryAction={<Button onClick={signOut}>Cerrar sesión</Button>}
          />
        </div>
      </div>
    </div>
  );
}
