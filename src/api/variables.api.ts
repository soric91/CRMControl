import { http } from './http';
import type { Variable, VariableUpdate } from './types';

export async function updateVariable(
  variableId: string,
  payload: VariableUpdate,
): Promise<Variable> {
  const { data } = await http.patch<Variable>(
    `/variables/${variableId}`,
    payload,
  );
  return data;
}

export async function deleteVariable(variableId: string): Promise<void> {
  await http.delete(`/variables/${variableId}`);
}
