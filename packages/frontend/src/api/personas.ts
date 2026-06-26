import { apiRequest } from './client';
import type { Persona, CreatePersonaInput, UpdatePersonaInput, PersonaDraft, ConversationMessage } from '../types';

export function listPersonas(): Promise<Persona[]> {
  return apiRequest('/personas');
}

export function getPersona(id: string): Promise<Persona> {
  return apiRequest(`/personas/${id}`);
}

export function createPersona(input: CreatePersonaInput): Promise<Persona> {
  return apiRequest('/personas', { method: 'POST', body: JSON.stringify(input) });
}

export function updatePersona(id: string, input: UpdatePersonaInput): Promise<Persona> {
  return apiRequest(`/personas/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deletePersona(id: string): Promise<{ deleted: true }> {
  return apiRequest(`/personas/${id}`, { method: 'DELETE' });
}

export function generateDraft(id: string): Promise<PersonaDraft> {
  return apiRequest(`/personas/${id}/draft`, { method: 'POST' });
}

export function sendInterviewMessage(
  id: string,
  messages: ConversationMessage[]
): Promise<string> {
  return apiRequest<{ content: string }>(`/personas/${id}/interview`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  }).then((res) => res.content);
}
