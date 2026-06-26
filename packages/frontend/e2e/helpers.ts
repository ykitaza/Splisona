import type { Page } from '@playwright/test';

const PERSONA_FIXTURE = {
  personaId: 'p-1',
  userId: 'u-1',
  displayName: 'ハルト',
  type: 'action_oriented',
  age: 32,
  gender: '男性',
  occupation: '営業職',
  freeText: '時間に追われるビジネスマン',
  createdAt: '2026-06-25T00:00:00Z',
  updatedAt: '2026-06-25T01:00:00Z',
};

const TEST_FIXTURE = {
  testId: 't-1',
  userId: 'u-1',
  title: 'LP比較テスト',
  status: 'completed',
  personaIds: ['p-1', 'p-2', 'p-3'],
  designAInput: { imageKey: 'a.png' },
  designBInput: { imageKey: 'b.png' },
  createdAt: '2026-06-20T14:30:00Z',
  updatedAt: '2026-06-20T15:00:00Z',
};

export async function mockApi(page: Page) {
  const API = 'http://localhost:3001';

  await page.route(`${API}/personas`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: [PERSONA_FIXTURE] });
    }
    return route.continue();
  });

  await page.route(`${API}/personas/*`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: PERSONA_FIXTURE });
    }
    return route.continue();
  });

  await page.route(`${API}/tests`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: [TEST_FIXTURE] });
    }
    return route.continue();
  });

  await page.route(`${API}/tests/*`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: TEST_FIXTURE });
    }
    return route.continue();
  });

  await page.route(`${API}/settings*`, (route) => {
    return route.fulfill({ json: {} });
  });
}
