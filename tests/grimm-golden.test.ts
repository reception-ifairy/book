import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFakeAnthropic } from './fakeAnthropic';

/**
 * Characterisation test: the exact request bodies the Grimm Protocol world sends to Claude.
 * Other worlds are added beside Grimm, never through it, so these bytes must not change.
 * Regenerate deliberately with UPDATE_GOLDEN=1 when a Grimm change is intended.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'grimm-requests.json');

const fake = await startFakeAnthropic();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-golden-'));
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
delete process.env.ADMIN_PASSWORD;

const { createApp } = await import('../server/app');
let server: Server;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await fake.close();
});

const post = async (url: string, body: unknown) =>
  (await fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

describe('Grimm Protocol requests', () => {
  it('match the recorded golden bodies for a start, a choice and a custom move', async () => {
    const story = await post('/api/story', { taleId: 'red-hood', lang: 'en', heroName: 'Golden_Mo' });
    const root = story.pages[story.currentPageId];
    const step = await post(`/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[1].id });
    await post(`/api/story/${story.id}/act`, { pageId: step.page.id, custom: 'I offer the wolf a cup of tea' });

    const bodies = fake.requests.map((r) => r.body);
    expect(bodies).toHaveLength(3);
    if (process.env.UPDATE_GOLDEN || !fs.existsSync(FIXTURE)) {
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, JSON.stringify(bodies, null, 2) + '\n');
    }
    expect(bodies).toEqual(JSON.parse(fs.readFileSync(FIXTURE, 'utf8')));
  });
});
