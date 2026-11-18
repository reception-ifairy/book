import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TINY_PNG } from './fakeOpenAI';
import { DEFAULT_BRANDING } from '../shared/branding';

// Local-only admin (no password, no database): requests from this machine pass the guard.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-branding-'));
delete process.env.ADMIN_PASSWORD;
delete process.env.T1000_DATABASE_URL;

const { createApp } = await import('../server/app');
const { renderIndex } = await import('../server/branding');

let server: Server;
let base = '';
beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const call = async (method: string, url: string, body?: unknown) => {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
};

const TEMPLATE = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const png = `data:image/png;base64,${TINY_PNG}`;

describe('branding', () => {
  it('starts with the current ARB look', async () => {
    const { body } = await call('GET', '/api/branding');
    expect(body).toMatchObject({ name: DEFAULT_BRANDING.name, shortName: 'ARB', theme: 'workshop', cards: 'paper', logo: null });
  });

  it('saves a theme, card style and colours, merging colours field by field', async () => {
    let r = await call('PUT', '/api/admin/branding', { theme: 'nebula', cards: 'holo', colors: { primary: '#ff4f9a' } });
    expect(r.status).toBe(200);
    r = await call('PUT', '/api/admin/branding', { colors: { neon: '#00ffcc' } });
    expect(r.body.colors).toEqual({ primary: '#ff4f9a', highlight: null, neon: '#00ffcc' });
    expect((await call('GET', '/api/branding')).body).toMatchObject({ theme: 'nebula', cards: 'holo' });
  });

  it('rejects bad values', async () => {
    expect((await call('PUT', '/api/admin/branding', { theme: 'vaporwave' })).status).toBe(400);
    expect((await call('PUT', '/api/admin/branding', { colors: { primary: 'red' } })).status).toBe(400);
    expect((await call('PUT', '/api/admin/branding', { name: '   ' })).status).toBe(400);
  });

  it('accepts a PNG logo checked by its bytes and serves it as the favicon', async () => {
    const r = await call('PUT', '/api/admin/branding/images/logo', { dataUrl: png });
    expect(r.status).toBe(200);
    expect(r.body.logo).toMatch(/^\/brand\/logo-[a-z0-9]+\.png$/);
    const file = await fetch(base + r.body.logo);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('image/png');
    const fav = await call('GET', '/favicon.png');
    expect(fav.status).toBe(302);
    expect(fav.headers.get('location')).toBe(r.body.logo);
  });

  it('refuses SVG, HTML dressed as PNG, and unknown image kinds', async () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64')}`;
    expect((await call('PUT', '/api/admin/branding/images/logo', { dataUrl: svg })).status).toBe(400);
    const fake = `data:image/png;base64,${Buffer.from('<html><script>alert(1)</script></html>').toString('base64')}`;
    expect((await call('PUT', '/api/admin/branding/images/share', { dataUrl: fake })).status).toBe(400);
    expect((await call('PUT', '/api/admin/branding/images/banner', { dataUrl: png })).status).toBe(404);
  });

  it('removes the logo and its file; the favicon falls back (404 with no Art Kit)', async () => {
    const { body } = await call('GET', '/api/branding');
    const r = await call('DELETE', '/api/admin/branding/images/logo');
    expect(r.body.logo).toBeNull();
    await new Promise((res) => setTimeout(res, 50));
    expect(fs.existsSync(path.join(process.env.DATA_DIR!, 'branding', 'files', path.basename(body.logo)))).toBe(false);
    expect((await call('GET', '/favicon.png')).status).toBe(404);
  });

  it('bakes title, meta tags, theme and escaped values into index.html', () => {
    const html = renderIndex(TEMPLATE, {
      ...DEFAULT_BRANDING,
      name: 'Bureau <script>alert(1)</script>',
      shortName: 'B&B',
      description: 'Tales "with" quotes',
      theme: 'nebula',
      cards: 'holo',
      colors: { primary: '#ff4f9a', highlight: null, neon: null },
    });
    expect(html).toContain('<html lang="en" data-theme="nebula" data-cards="holo" style="--color-ember:#ff4f9a;--color-ember-soft:#ff4f9a2e">');
    expect(html).toContain('<title>B&amp;B · Bureau &lt;script&gt;alert(1)&lt;/script&gt;</title>');
    expect(html).toContain('<meta name="description" content="Tales &quot;with&quot; quotes" />');
    expect(html).toContain('<meta name="theme-color" content="#0d0b26" />');
    expect(html).toContain('<meta property="og:title" content="B&amp;B · Bureau');
    // The JSON for the client cannot close its own script tag.
    const json = html.match(/<script id="branding-data" type="application\/json">(.*?)<\/script>/)![1];
    expect(json).not.toContain('<');
    expect(JSON.parse(json).name).toBe('Bureau <script>alert(1)</script>');
  });
});
