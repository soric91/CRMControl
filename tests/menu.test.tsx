/**
 * The row menu renders in a portal so the table's scroll container cannot clip
 * it. That moves it outside the component's own DOM subtree, which is exactly
 * what breaks click-outside and focus handling if they are wired to the
 * trigger alone.
 */

import { afterEach, describe, expect, test } from '@rstest/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Menu } from '../src/components/ui/Menu';

afterEach(cleanup);

function open(label = 'Acciones') {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('Menu', () => {
  test('renders nothing when it has no items', () => {
    render(<Menu label="Acciones" items={[]} />);
    expect(screen.queryByRole('button', { name: 'Acciones' })).toBeNull();
  });

  test('opens into a portal outside its own subtree', () => {
    const { container } = render(
      <Menu
        label="Acciones"
        items={[{ label: 'Editar', onSelect: () => undefined }]}
      />,
    );

    expect(screen.queryByRole('menu')).toBeNull();
    open();

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    // The panel is a child of body, not of the cell the trigger sits in.
    expect(container.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
  });

  test('marks the trigger as expanded while it is open', () => {
    render(
      <Menu
        label="Acciones"
        items={[{ label: 'Editar', onSelect: () => undefined }]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Acciones' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    open();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('runs the selected action once and closes', () => {
    let selected = 0;
    render(
      <Menu
        label="Acciones"
        items={[
          {
            label: 'Eliminar',
            danger: true,
            onSelect: () => {
              selected += 1;
            },
          },
        ]}
      />,
    );

    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));

    expect(selected).toBe(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a disabled item does not fire', () => {
    let selected = 0;
    render(
      <Menu
        label="Acciones"
        items={[
          {
            label: 'Eliminar',
            disabled: true,
            onSelect: () => {
              selected += 1;
            },
          },
        ]}
      />,
    );

    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    expect(selected).toBe(0);
  });

  test('Escape closes it and gives focus back to the trigger', () => {
    render(
      <Menu
        label="Acciones"
        items={[{ label: 'Editar', onSelect: () => undefined }]}
      />,
    );

    open();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Acciones' }),
    );
  });

  test('a click outside both the trigger and the panel closes it', () => {
    render(
      <Menu
        label="Acciones"
        items={[{ label: 'Editar', onSelect: () => undefined }]}
      />,
    );

    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a click inside the panel leaves it open', () => {
    render(
      <Menu
        label="Acciones"
        items={[{ label: 'Editar', onSelect: () => undefined }]}
      />,
    );

    open();
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  test('the arrow keys walk the enabled options', () => {
    render(
      <Menu
        label="Acciones"
        items={[
          { label: 'Editar', onSelect: () => undefined },
          { label: 'Duplicar', onSelect: () => undefined },
        ]}
      />,
    );

    open();
    const menu = screen.getByRole('menu');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Editar' }),
    );

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Duplicar' }),
    );

    // Wraps around rather than dead-ending at the last option.
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Editar' }),
    );
  });
});
