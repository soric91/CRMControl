import { clearSession, http, storeSession } from './http';
import type {
  LoginPayload,
  PasswordChangePayload,
  TokenPair,
  User,
} from './types';

export async function login(payload: LoginPayload): Promise<TokenPair> {
  const { data } = await http.post<TokenPair>('/auth/login', payload);
  storeSession(data);
  return data;
}

export function logout(): void {
  // The backend keeps no server-side session, so signing out is local.
  clearSession();
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await http.get<User>('/auth/me');
  return data;
}

export async function changeOwnPassword(
  payload: PasswordChangePayload,
): Promise<void> {
  await http.post('/auth/password', payload);
}
