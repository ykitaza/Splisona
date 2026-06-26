export type DesignSideData =
  | { inputType: 'image_upload'; file: File; imageKey: string }
  | { inputType: 'figma_url'; url: string; imageKey: string }
  | { inputType: 'site_url'; url: string; imageKey: string };

export interface TestDraftData {
  title: string;
  sideA: DesignSideData | null;
  sideB: DesignSideData | null;
  personaIds: string[];
  resumeId?: string;
}

const _draft: TestDraftData = {
  title: '',
  sideA: null,
  sideB: null,
  personaIds: [],
};

export function sideToDesignInput(side: DesignSideData): import('../types').DesignInput {
  if (side.inputType === 'figma_url') return { inputType: 'figma_url', figmaUrl: side.url, imageKey: side.imageKey || undefined };
  if (side.inputType === 'site_url') return { inputType: 'site_url', siteUrl: side.url, imageKey: side.imageKey || undefined };
  return { inputType: 'image_upload', imageKey: side.imageKey || undefined };
}

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
  resume(data: TestDraftData) {
    Object.assign(_draft, data);
  },
  reset() {
    _draft.title = '';
    _draft.sideA = null;
    _draft.sideB = null;
    _draft.personaIds = [];
    delete _draft.resumeId;
  },
};
