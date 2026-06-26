import type { Page } from '@playwright/test';

const PERSONA_FIXTURES = [
  {
    personaId: 'p-1', userId: 'u-1', displayName: 'ハルト', type: 'action_oriented',
    source: 'default', age: 32, gender: '男性', occupation: '営業職',
    freeText: '時間に追われるビジネスマン',
    createdAt: '2026-06-25T00:00:00Z', updatedAt: '2026-06-25T01:00:00Z',
  },
  {
    personaId: 'p-2', userId: 'u-1', displayName: 'ミサト', type: 'cautious',
    source: 'default', age: 28, gender: '女性', occupation: 'マーケター',
    freeText: '慎重に比較してから決める性格',
    createdAt: '2026-06-24T00:00:00Z', updatedAt: '2026-06-24T01:00:00Z',
  },
  {
    personaId: 'p-3', userId: 'u-1', displayName: 'ユウト', type: 'info_savvy',
    source: 'preset', age: 45, gender: '男性', occupation: 'エンジニア',
    freeText: '技術に詳しく最新トレンドに敏感',
    createdAt: '2026-06-23T00:00:00Z', updatedAt: '2026-06-23T01:00:00Z',
  },
];

const TEST_FIXTURES = [
  {
    testId: 't-1', userId: 'u-1', title: 'LP比較テスト', status: 'completed',
    personaIds: ['p-1', 'p-2', 'p-3'],
    designAInput: { inputType: 'upload', imageKey: 'a.png' },
    designBInput: { inputType: 'upload', imageKey: 'b.png' },
    createdAt: '2026-06-20T14:30:00Z', updatedAt: '2026-06-20T15:00:00Z',
  },
  {
    testId: 't-2', userId: 'u-1', title: 'ランディングページ改善', status: 'completed',
    personaIds: ['p-1', 'p-2'],
    designAInput: { inputType: 'upload', imageKey: 'c.png' },
    designBInput: { inputType: 'upload', imageKey: 'd.png' },
    createdAt: '2026-06-18T10:00:00Z', updatedAt: '2026-06-18T11:00:00Z',
  },
  {
    testId: 't-running', userId: 'u-1', title: '実行中テスト', status: 'running',
    personaIds: ['p-1', 'p-2', 'p-3'],
    designAInput: { inputType: 'upload', imageKey: 'e.png' },
    designBInput: { inputType: 'upload', imageKey: 'f.png' },
    createdAt: '2026-06-25T10:00:00Z', updatedAt: '2026-06-25T10:05:00Z',
  },
];

const REPORT_FIXTURE = {
  abTest: TEST_FIXTURES[0],
  summary: {
    winner: 'A', supportRateA: 0.67, supportRateB: 0.33, supportRateNone: 0,
    totalPersonas: 3, completedPersonas: 3,
    avgScores: {
      A: { usability: 78, aesthetics: 82, clarity: 75, engagement: 80, trust: 77 },
      B: { usability: 65, aesthetics: 70, clarity: 68, engagement: 62, trust: 71 },
    },
    winnersReasonSummary: '視認性と操作性に優れ、CTAが明確',
    reasonSummaryA: ['視認性が高い', 'CTAが明確'],
    reasonSummaryB: ['デザインが斬新'],
    reasonSummaryStatus: 'ready',
  },
  evaluations: [
    {
      personaId: 'p-1', personaDisplayName: 'ハルト', winner: 'A', confidence: 85,
      reason: 'A案の方がCTAが目立ち行動しやすい', status: 'completed',
      scoresA: { usability: 85, aesthetics: 80, clarity: 78, engagement: 88, trust: 82 },
      scoresB: { usability: 65, aesthetics: 72, clarity: 60, engagement: 58, trust: 70 },
    },
    {
      personaId: 'p-2', personaDisplayName: 'ミサト', winner: 'A', confidence: 72,
      reason: 'A案の方が情報が整理されている', status: 'completed',
      scoresA: { usability: 78, aesthetics: 85, clarity: 80, engagement: 75, trust: 80 },
      scoresB: { usability: 70, aesthetics: 68, clarity: 72, engagement: 65, trust: 75 },
    },
    {
      personaId: 'p-3', personaDisplayName: 'ユウト', winner: 'B', confidence: 60,
      reason: 'B案のデザインが技術的に洗練されている', status: 'completed',
      scoresA: { usability: 70, aesthetics: 80, clarity: 68, engagement: 78, trust: 70 },
      scoresB: { usability: 60, aesthetics: 70, clarity: 72, engagement: 62, trust: 68 },
    },
  ],
};

const PROGRESS_FIXTURE = {
  status: 'completed', total: 3, completed: 3,
};

export async function mockApi(page: Page) {
  const API = 'http://localhost:3001';
  let personaStore = [...PERSONA_FIXTURES];
  let testStore = [...TEST_FIXTURES];
  let settingsStore: Record<string, unknown> = {};
  const abortedTests = new Set<string>();

  await page.route(`${API}/personas`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: personaStore });
    }
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const newPersona = {
        ...body,
        personaId: `p-new-${Date.now()}`,
        userId: 'u-1',
        source: 'custom',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      personaStore.push(newPersona);
      return route.fulfill({ json: newPersona });
    }
    return route.continue();
  });

  await page.route(`${API}/personas/*/draft`, (route) => {
    return route.fulfill({
      json: {
        freeText: '[AI生成] テスト用のペルソナ説明文です。',
        suggestedDescription: '[AI生成] 推奨する説明文です。',
      },
    });
  });

  await page.route(`${API}/personas/*/interview`, (route) => {
    return route.fulfill({ json: { content: 'こんにちは。インタビューのスタブ応答です。' } });
  });

  await page.route(`${API}/personas/*`, (route) => {
    const url = route.request().url();
    const idMatch = url.match(/\/personas\/([^/]+)$/);
    const id = idMatch?.[1];
    if (route.request().method() === 'GET') {
      const persona = personaStore.find((p) => p.personaId === id) ?? PERSONA_FIXTURES[0];
      return route.fulfill({ json: persona });
    }
    if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const idx = personaStore.findIndex((p) => p.personaId === id);
      if (idx >= 0) {
        personaStore[idx] = { ...personaStore[idx], ...body, updatedAt: new Date().toISOString() };
        return route.fulfill({ json: personaStore[idx] });
      }
      return route.fulfill({ json: { ...PERSONA_FIXTURES[0], ...body } });
    }
    if (route.request().method() === 'DELETE') {
      personaStore = personaStore.filter((p) => p.personaId !== id);
      return route.fulfill({ json: { ok: true } });
    }
    return route.continue();
  });

  await page.route(`${API}/tests`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: testStore });
    }
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const newTest = {
        ...body,
        testId: `t-new-${Date.now()}`,
        userId: 'u-1',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      testStore.push(newTest);
      return route.fulfill({ json: newTest });
    }
    return route.continue();
  });

  await page.route(`${API}/tests/*/report`, (route) => {
    return route.fulfill({ json: REPORT_FIXTURE });
  });

  await page.route(`${API}/tests/*/progress`, (route) => {
    const url = route.request().url();
    const idMatch = url.match(/\/tests\/([^/]+)\/progress$/);
    const id = idMatch?.[1];
    if (id && abortedTests.has(id)) {
      return route.fulfill({ json: { status: 'failed', total: 3, completed: 1 } });
    }
    if (url.includes('/t-running/')) {
      return route.fulfill({ json: { status: 'running', total: 3, completed: 1 } });
    }
    return route.fulfill({ json: PROGRESS_FIXTURE });
  });

  await page.route(`${API}/tests/*/execute`, (route) => {
    return route.fulfill({ json: { started: true } });
  });

  await page.route(`${API}/tests/*/abort`, (route) => {
    const url = route.request().url();
    const idMatch = url.match(/\/tests\/([^/]+)\/abort$/);
    if (idMatch?.[1]) abortedTests.add(idMatch[1]);
    return route.fulfill({ json: { aborted: true } });
  });

  await page.route(`${API}/tests/*/upload-url`, (route) => {
    return route.fulfill({ json: { uploadUrl: 'http://localhost:3001/stub-upload/test.png', imageKey: 'local/test.png' } });
  });

  await page.route(`${API}/tests/*/capture`, (route) => {
    return route.fulfill({ json: { imageKey: 'local/capture.png', previewUrl: 'http://localhost:3001/stub-upload/capture.png' } });
  });

  await page.route(`${API}/tests/*`, (route) => {
    const url = route.request().url();
    const idMatch = url.match(/\/tests\/([^/]+)$/);
    const id = idMatch?.[1];
    if (route.request().method() === 'GET') {
      const test = testStore.find((t) => t.testId === id) ?? TEST_FIXTURES[0];
      return route.fulfill({ json: test });
    }
    if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const idx = testStore.findIndex((t) => t.testId === id);
      if (idx >= 0) testStore[idx] = { ...testStore[idx], ...body };
      return route.fulfill({ json: { ok: true } });
    }
    if (route.request().method() === 'DELETE') {
      testStore = testStore.filter((t) => t.testId !== id);
      return route.fulfill({ json: { ok: true } });
    }
    return route.continue();
  });

  await page.route(`${API}/settings`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: settingsStore });
    }
    if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      if (body.section && body.data !== undefined) {
        settingsStore[body.section] = body.data;
      }
      return route.fulfill({ json: { ok: true } });
    }
    return route.continue();
  });

  await page.route(`${API}/config`, (route) => {
    return route.fulfill({ json: { modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0' } });
  });

  await page.route(`${API}/stub-upload/**`, (route) => {
    return route.fulfill({ status: 200, body: '' });
  });
}
