import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// A throwaway data dir, no legacy password and no real database before the server modules load.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-auth-'));
delete process.env.ADMIN_PASSWORD;
delete process.env.T1000_DATABASE_URL;

const { createApp } = await import('../server/app');
const auth = await import('../server/adminAuth');
type AdminRow = import('../server/adminAuth').AdminRow;

/** The t1000 ignis_admins table, in memory. */
function memoryStore(rows: AdminRow[] = []): import('../server/adminAuth').AdminStore {
  return {
    findByLogin: async (login) => rows.find((r) => r.login === login) ?? null,
    superadmin: async () => rows.find((r) => r.role === 'superadmin') ?? null,
    async saveSuperadmin(login, password_hash) {
      const row = rows.find((r) => r.role === 'superadmin');
      if (row) Object.assign(row, { login, password_hash, is_active: 1 });
      else rows.push({ id: rows.length + 1, login, password_hash, role: 'superadmin', is_active: 1 });
      return rows.find((r) => r.login === login)!;
    },
    touchLogin: async () => {},
  };
}

let server: Server;
let base = '';
beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  auth.setAdminStore(null);
  server.close();
});

const call = async (method: string, url: string, body?: unknown, token?: string) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

describe('password hashing', () => {
  it('verifies the right password only', () => {
    const h = auth.hashPassword('correct horse battery');
    expect(h.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(auth.verifyPassword('correct horse battery', h)).toBe(true);
    expect(auth.verifyPassword('wrong horse battery', h)).toBe(false);
    expect(auth.verifyPassword('anything', '')).toBe(false);
  });
});

describe('admin login backed by the t1000 database', () => {
  it('opens setup with a one-time code when no password is set, then logs in with the new password', async () => {
    auth.setAdminStore(memoryStore([{ id: 1, login: 'superadmin', password_hash: '', role: 'superadmin', is_active: 1 }]));
    const logs: string[] = [];
    await auth.initAdminAuth((m) => logs.push(m));
    const code = /setup code: ([A-Z0-9-]+)/.exec(logs.join('\n'))?.[1];
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const file = path.join(process.env.DATA_DIR!, 'admin-setup-code.txt');
    expect(fs.readFileSync(file, 'utf8').trim()).toBe(code);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);

    expect((await call('GET', '/api/admin/auth/status')).body).toMatchObject({ mode: 'db', needsSetup: true, loggedIn: false });
    expect((await call('GET', '/api/admin/config')).status).toBe(401);

    // No code, a wrong code, or a weak password never sets anything.
    expect((await call('POST', '/api/admin/auth/setup', { code: 'AAAA-BBBB-CCCC', login: 'boss', password: 'long enough pw' })).status).toBe(401);
    expect((await call('POST', '/api/admin/auth/setup', { code, login: 'boss', password: 'short' })).status).toBe(400);

    // The code is forgiving about case and dashes.
    const setup = await call('POST', '/api/admin/auth/setup', { code: code!.toLowerCase().replace(/-/g, ''), login: 'boss', password: 'long enough pw' });
    expect(setup.status).toBe(200);
    expect(setup.body.login).toBe('boss');
    expect(fs.existsSync(file)).toBe(false);

    // The setup session works, and setup is closed for good.
    expect((await call('GET', '/api/admin/config', undefined, setup.body.token)).status).toBe(200);
    expect((await call('GET', '/api/admin/auth/status', undefined, setup.body.token)).body).toMatchObject({ needsSetup: false, loggedIn: true, login: 'boss' });
    expect((await call('POST', '/api/admin/auth/setup', { code, login: 'evil', password: 'long enough pw' })).status).toBe(409);

    // Login: wrong password and unknown login look the same; the right one opens a session.
    expect((await call('POST', '/api/admin/auth/login', { login: 'boss', password: 'nope nope nope' })).status).toBe(401);
    expect((await call('POST', '/api/admin/auth/login', { login: 'ghost', password: 'long enough pw' })).body.error).toBe('Wrong login or password.');
    const login = await call('POST', '/api/admin/auth/login', { login: 'boss', password: 'long enough pw' });
    expect(login.status).toBe(200);
    expect((await call('GET', '/api/admin/config', undefined, login.body.token)).body.loginMode).toBe('db');

    // The legacy password header no longer opens anything; logout ends the session.
    expect((await call('GET', '/api/admin/config', undefined, 'not-a-token')).status).toBe(401);
    await call('POST', '/api/admin/auth/logout', {}, login.body.token);
    expect((await call('GET', '/api/admin/config', undefined, login.body.token)).status).toBe(401);
  });

  it('starts without setup when a superadmin already has a password', async () => {
    auth.setAdminStore(memoryStore([{ id: 1, login: 'boss', password_hash: auth.hashPassword('long enough pw'), role: 'superadmin', is_active: 1 }]));
    const logs: string[] = [];
    await auth.initAdminAuth((m) => logs.push(m));
    expect(logs).toEqual([]);
    expect((await call('GET', '/api/admin/auth/status')).body).toMatchObject({ mode: 'db', needsSetup: false });
    expect((await call('POST', '/api/admin/auth/setup', { code: 'AAAA-BBBB-CCCC', login: 'x', password: 'long enough pw' })).status).toBe(409);
  });

  it('falls back to the old guard when no database is configured', async () => {
    auth.setAdminStore(null);
    expect((await call('GET', '/api/admin/auth/status')).body).toMatchObject({ mode: 'local' });
    expect((await call('GET', '/api/admin/config')).status).toBe(200); // localhost, no ADMIN_PASSWORD
  });
});
