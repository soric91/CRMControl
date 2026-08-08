import { http } from './http';
import type {
  Page,
  PasswordSetPayload,
  User,
  UserCreate,
  UserListParams,
  UserUpdate,
} from './types';

export async function listUsers(
  params: UserListParams = {},
): Promise<Page<User>> {
  const { data } = await http.get<Page<User>>('/users', { params });
  return data;
}

export async function createUser(payload: UserCreate): Promise<User> {
  const { data } = await http.post<User>('/users', payload);
  return data;
}

export async function updateUser(
  userId: string,
  payload: UserUpdate,
): Promise<User> {
  const { data } = await http.patch<User>(`/users/${userId}`, payload);
  return data;
}

/** Admin setting someone else's password, for when they lost access. */
export async function setUserPassword(
  userId: string,
  payload: PasswordSetPayload,
): Promise<void> {
  await http.post(`/users/${userId}/password`, payload);
}

export async function deleteUser(userId: string): Promise<void> {
  await http.delete(`/users/${userId}`);
}
