export interface TestDraftData {
  title: string;
  fileA: File | null;
  fileB: File | null;
  personaIds: string[];
}

const _draft: TestDraftData = {
  title: '',
  fileA: null,
  fileB: null,
  personaIds: [],
};

export const testDraft = {
  get(): TestDraftData {
    return { ..._draft };
  },
  setTitle(title: string) {
    _draft.title = title;
  },
  setFile(side: 'A' | 'B', file: File | null) {
    if (side === 'A') _draft.fileA = file;
    else _draft.fileB = file;
  },
  setPersonaIds(ids: string[]) {
    _draft.personaIds = ids;
  },
  reset() {
    _draft.title = '';
    _draft.fileA = null;
    _draft.fileB = null;
    _draft.personaIds = [];
  },
};
