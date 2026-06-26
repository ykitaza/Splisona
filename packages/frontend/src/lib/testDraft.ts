export type DesignSideData =
  | { inputType: 'image_upload'; file: File; imageKey: string }
  | { inputType: 'figma_url'; url: string; imageKey: string }
  | { inputType: 'site_url'; url: string; imageKey: string };

export interface TestDraftData {
  title: string;
  sideA: DesignSideData | null;
  sideB: DesignSideData | null;
  personaIds: string[];
}

const _draft: TestDraftData = {
  title: '',
  sideA: null,
  sideB: null,
  personaIds: [],
};

export const testDraft = {
  get(): TestDraftData {
    return { ..._draft };
  },
  setTitle(title: string) {
    _draft.title = title;
  },
  setSide(side: 'A' | 'B', data: DesignSideData | null) {
    if (side === 'A') _draft.sideA = data;
    else _draft.sideB = data;
  },
  setPersonaIds(ids: string[]) {
    _draft.personaIds = ids;
  },
  reset() {
    _draft.title = '';
    _draft.sideA = null;
    _draft.sideB = null;
    _draft.personaIds = [];
  },
};
