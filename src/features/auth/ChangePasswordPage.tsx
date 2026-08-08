import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/DetailList';
import { useAuth } from '../../hooks/useAuth';
import { LANDING_PATH } from '../../lib/permissions';
import { PasswordChangeForm } from './PasswordChangeForm';

/** The voluntary change, reached from the account menu. */
export function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Cambiar contraseña" description={user?.email} />

      <div className="max-w-md">
        <Panel>
          <PasswordChangeForm
            secondaryAction={
              <Button
                onClick={() => {
                  void navigate(LANDING_PATH);
                }}
              >
                Volver
              </Button>
            }
          />
        </Panel>
      </div>
    </div>
  );
}
