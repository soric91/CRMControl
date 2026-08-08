import type { ReactNode } from 'react';
import type { ThemeMode } from '../../context/ThemeContext';
import { THEME_MODE } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/useTheme';
import { cx } from '../../lib/cx';
import { IconMoon, IconSun, IconSystem } from '../ui/Icon';

const MODES: Record<ThemeMode, { label: string; icon: ReactNode }> = {
  light: { label: 'Tema claro', icon: <IconSun className="size-4" /> },
  dark: { label: 'Tema oscuro', icon: <IconMoon className="size-4" /> },
  system: {
    label: 'Según el sistema',
    icon: <IconSystem className="size-4" />,
  },
};

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="Tema"
      className="inline-flex rounded-lg border border-line p-0.5"
    >
      {THEME_MODE.map((option) => (
        <button
          key={option}
          type="button"
          aria-label={MODES[option].label}
          title={MODES[option].label}
          aria-pressed={mode === option}
          onClick={() => {
            setMode(option);
          }}
          className={cx(
            'rounded-md p-1.5 transition-colors',
            mode === option
              ? 'bg-accent-soft text-accent-soft-content'
              : 'text-content-subtle hover:text-content',
          )}
        >
          {MODES[option].icon}
        </button>
      ))}
    </div>
  );
}
