import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFakeAnthropic } from './fakeAnthropic';
import { startFakeOpenAI } from './fakeOpenAI';
import { ART_SLOTS } from '../shared/artkit';

const anthropic = await startFakeAnthropic();
const openai = await startFakeOpenAI();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-artkit-'));
process.env.ANTHROPIC_BASE_URL = anthropic.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.OPENAI_BASE_URL = openai.url;
process.env.OPENAI_API_KEY = 'sk-openai-test';
delete process.env.ADMIN_PASSWORD;

const { createApp } = await import('../server/app');
const { composePrompt } = await import('../server/artkit/planner');
let server: Server;
let base = '';
beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await anthropic.close();
  await openai.close();
});

const call = async (method: string, url: string, body?: unknown) => {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
};

const waitForRender = async () => {
  for (let i = 0; i < 100; i++) {
    const { body } = await call('GET', '/api/admin/artkit');
    if (!body.kit.running) return body;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error('render never finished');
};

/** Claude's plan; deliberately skips one slot to check the fallback prompt. */
const plan = {
  style_name: 'Hearth & Circuit',
  summary: 'Cozy cartoon cyber-magic workshop.',
  palette: [{ name: 'Ember', hex: '#ff7a2f', role: 'accent' }, { name: 'Bad', hex: 'orange', role: 'invalid' }],
  line_and_shading: 'Bold ink outlines, flat cel shading.',
  lighting: 'Fireplace glow and fairy lights.',
  motifs: ['fairy lights', 'runes'],
  ignis_model_sheet: 'IGNIS: grimoire body, CRT head, fairy wings, ember antenna.',
  avoid: ['neon cyberpunk', 'gore'],
  assets: ART_SLOTS.filter((s) => s.id !== 'icon-dumb').map((s) => ({ slot: s.id, prompt: `Prompt for ${s.id}`, alt: `Alt for ${s.id}` })),
};

describe('art kit', () => {
  it('refuses to render before there is a plan, and serves an empty public kit', async () => {
    expect((await call('POST', '/api/admin/artkit/generate', {})).status).toBe(400);
    expect((await call('GET', '/api/artkit')).body).toEqual({ version: 0, assets: {}, alt: {} });
    expect((await call('GET', '/favicon.png')).status).toBe(404);
  });

  it('plans with Claude over a stream and covers every slot', async () => {
    anthropic.enqueue(plan);
    const res = await call('POST', '/api/admin/artkit/plan', { notes: 'more gingerbread' });
    expect(res.status).toBe(200);
    const p = res.body.kit.plan;
    expect(p.assets).toHaveLength(ART_SLOTS.length);
    expect(p.assets.find((a: any) => a.slot === 'icon-dumb').prompt).toContain('banana peel');
    expect(p.palette).toEqual([{ name: 'Ember', hex: '#ff7a2f', role: 'accent' }]);
    expect(res.body.kit.notes).toBe('more gingerbread');

    const req = anthropic.requests.at(-1)!;
    expect(req.body.stream).toBe(true);
    expect(req.body.output_config.effort).toBe('high');
    expect(req.body.messages[0].content).toContain('more gingerbread');
    expect(req.body.messages[0].content).toContain('cover-wawel-dragon');
  });

  it('builds image prompts with the style bible, IGNIS sheet only where IGNIS appears', async () => {
    const { body } = await call('GET', '/api/admin/artkit');
    const p = body.kit.plan;
    const hero = composePrompt(p, ART_SLOTS.find((s) => s.id === 'ignis-hero')!);
    const cover = composePrompt(p, ART_SLOTS.find((s) => s.id === 'cover-red-hood')!);
    expect(hero).toContain('IGNIS model sheet');
    expect(hero).toContain('transparent background');
    expect(cover).not.toContain('IGNIS model sheet');
    expect(cover).toContain('Hearth & Circuit');
    expect(cover).toContain('No text');
    expect(composePrompt(p, ART_SLOTS.find((s) => s.id === 'brand-share')!)).not.toContain('No text');
  });

  it('lets the admin edit a prompt', async () => {
    const res = await call('PUT', '/api/admin/artkit/plan/icon-sudo', { prompt: 'A glowing terminal with a wand, very shiny', alt: 'Terminal with wand' });
    expect(res.body.kit.plan.assets.find((a: any) => a.slot === 'icon-sudo').prompt).toContain('very shiny');
    expect((await call('PUT', '/api/admin/artkit/plan/nope', { prompt: 'long enough prompt', alt: 'x' })).status).toBe(404);
  });

  it('renders every slot with OpenAI using the right size and background', async () => {
    openai.failWhen(/Prompt for cover-cinderella/);
    expect((await call('POST', '/api/admin/artkit/generate', {})).status).toBe(200);
    expect((await call('POST', '/api/admin/artkit/generate', {})).status).toBe(409);
    const view = await waitForRender();
    expect(openai.requests).toHaveLength(ART_SLOTS.length);
    const sent = (id: string) => openai.requests.find((r) => r.body.prompt.includes(`for ${id}`) || (id === 'icon-dumb' && r.body.prompt.includes('banana')))!.body;
    expect(sent('icon-chaos')).toMatchObject({ model: 'gpt-image-1', size: '1024x1024', background: 'transparent', output_format: 'png', quality: 'medium' });
    expect(sent('scene-workshop')).toMatchObject({ size: '1536x1024', background: 'opaque' });
    expect(view.kit.assets['cover-cinderella'].status).toBe('failed');
    expect(view.kit.assets['cover-cinderella'].error).toMatch(/^OpenAI: .*rejected by the safety system/);
    expect(view.kit.assets['icon-chaos'].status).toBe('done');

    openai.failWhen(null);
    await call('POST', '/api/admin/artkit/generate', { slots: ['cover-cinderella'] });
    const after = await waitForRender();
    expect(after.kit.assets['cover-cinderella'].status).toBe('done');
  });

  it('publishes to players, serves the files and the favicon / share shortcuts, and can roll back', async () => {
    const pub = await call('POST', '/api/admin/artkit/publish');
    expect(pub.body.kit.published.version).toBe(1);
    const kit = (await call('GET', '/api/artkit')).body;
    expect(Object.keys(kit.assets)).toHaveLength(ART_SLOTS.length);
    expect(kit.alt['icon-chaos']).toBe('Alt for icon-chaos');

    const file = await fetch(base + kit.assets['icon-chaos']);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('image/png');
    expect(file.headers.get('cache-control')).toContain('immutable');

    const fav = await call('GET', '/favicon.png');
    expect(fav.status).toBe(302);
    expect(fav.headers.get('location')).toBe(kit.assets['brand-mark']);
    expect((await call('GET', '/og.png')).headers.get('location')).toBe(kit.assets['brand-share']);
    expect((await fetch(base + '/artkit/..%2Fkit.json')).status).not.toBe(200);

    await call('DELETE', '/api/admin/artkit/published');
    expect((await call('GET', '/api/artkit')).body.version).toBe(0);
  });

  it('needs an OpenAI key to render', async () => {
    const key = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await call('POST', '/api/admin/artkit/generate', { slots: ['brand-mark'] });
      expect(res.status).toBe(503);
    } finally {
      process.env.OPENAI_API_KEY = key;
    }
  });
});
