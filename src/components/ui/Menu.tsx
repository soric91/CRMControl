import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  /** Names the trigger, which is icon-only. */
  label: string;
  items: MenuItem[];
}

/** Space between the trigger and the panel, and from the viewport edges. */
const GAP = 4;
const MARGIN = 8;

interface Coords {
  top: number;
  left: number;
}

/**
 * Row-level actions, folded into a "…" button so the table stays quiet.
 *
 * The panel renders in a portal with `position: fixed` rather than absolutely
 * inside the cell: the table scrolls horizontally, and any scroll container
 * clips an absolutely positioned child. Fixed coordinates also let it flip
 * above the trigger when the row is near the bottom of the screen, instead of
 * pushing the page taller and forcing a scroll to reach the options.
 */
export function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  // Runs before paint, so the panel never shows at its unpositioned spot.
  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const anchor = trigger.getBoundingClientRect();
      const { height, width } = panel.getBoundingClientRect();

      const below = anchor.bottom + GAP;
      const above = anchor.top - GAP - height;
      // Prefer below; flip up only when it would not fit and there is room.
      const fitsBelow = below + height <= window.innerHeight - MARGIN;
      const top = fitsBelow || above < MARGIN ? below : above;

      setCoords({
        top: Math.min(
          Math.max(top, MARGIN),
          Math.max(window.innerHeight - height - MARGIN, MARGIN),
        ),
        // Right-aligned to the trigger, then kept inside the viewport.
        left: Math.min(
          Math.max(anchor.right - width, MARGIN),
          Math.max(window.innerWidth - width - MARGIN, MARGIN),
        ),
      });
    };

    place();
    // Capture phase: catches the scroll of any ancestor container, not just
    // the window.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    // The panel lives in a portal, so "outside" means neither of the two.
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (triggerRef.current?.contains(target) ||
          panelRef.current?.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  // Opening moves focus into the panel so the menu is usable from the
  // keyboard; after a click the browser keeps the ring hidden.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector('button:not([disabled])');
    if (first instanceof HTMLElement) first.focus();
  }, [open]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const options = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      ) ?? [],
    );
    if (options.length === 0) return;

    const current = options.findIndex(
      (option) => option === document.activeElement,
    );
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + step + options.length) % options.length;
    options[next]?.focus();
  };

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cx(
          'rounded-md p-1.5 transition-colors',
          open
            ? 'bg-surface-muted text-content'
            : 'text-content-subtle hover:bg-surface-muted hover:text-content',
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
        >
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onPanelKeyDown}
            style={{ top: coords.top, left: coords.left }}
            className={cx(
              'fixed z-50 min-w-44 overflow-y-auto rounded-lg border border-line',
              'bg-surface-raised py-1 shadow-xl',
              'max-h-[min(20rem,calc(100dvh-1rem))]',
              'animate-[menu-in_150ms_ease-out]',
            )}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  close(false);
                  item.onSelect();
                }}
                className={cx(
                  'block w-full px-3 py-2 text-left text-sm transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  item.danger
                    ? 'text-danger hover:bg-danger-soft'
                    : 'text-content hover:bg-surface-muted',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
