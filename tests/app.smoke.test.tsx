/**
 * Boot smoke test: providers, router and guards wired together. It catches the
 * class of mistake that type checking cannot — a provider missing above a hook
 * that needs it, or a route tree that renders nothing.
 */

import { afterEach, expect, test } from '@rstest/core';
import { cleanup, render, screen } from '@testing-library/react';
import App from '../src/App';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('an anonymous visitor lands on the login screen', async () => {
  render(<App />);

  expect(
    await screen.findByRole('button', { name: 'Iniciar sesión' }),
  ).toBeInTheDocument();
  // The label carries a required marker, so it is matched by prefix.
  expect(screen.getByLabelText(/^Email/)).toBeRequired();
  expect(screen.getByLabelText(/^Contraseña/)).toBeRequired();
});

test('the theme toggle is reachable before signing in', async () => {
  render(<App />);

  expect(
    await screen.findByRole('button', { name: 'Tema oscuro' }),
  ).toBeInTheDocument();
});
