import { useState, useEffect, useCallback } from 'react';
import { listPersonas, createPersona, updatePersona, deletePersona, generateDraft } from '../api/personas';
import type { Persona, CreatePersonaInput, UpdatePersonaInput, PersonaDraft } from '../types';

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPersonas()
      .then(setPersonas)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '読み込み失敗'))
      .finally(() => setIsLoading(false));
  }, []);

  const create = useCallback(async (input: CreatePersonaInput): Promise<Persona> => {
    const persona = await createPersona(input);
    setPersonas((prev) => [...prev, persona]);
    return persona;
  }, []);

  const update = useCallback(async (id: string, input: UpdatePersonaInput): Promise<Persona> => {
    const persona = await updatePersona(id, input);
    setPersonas((prev) => prev.map((p) => (p.personaId === id ? persona : p)));
    return persona;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await deletePersona(id);
    setPersonas((prev) => prev.filter((p) => p.personaId !== id));
  }, []);

  const draft = useCallback((id: string): Promise<PersonaDraft> => {
    return generateDraft(id);
  }, []);

  return {
    personas,
    isLoading,
    error,
    createPersona: create,
    updatePersona: update,
    deletePersona: remove,
    generateDraft: draft,
  };
}
