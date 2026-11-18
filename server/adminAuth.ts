import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { DATA_DIR } from './config';

/**
 * Admin login backed by the t1000 database (table ignis_admins, see db/t1000/).
 *
 * - Enabled when T1000_DATABASE_URL is set. Without it the old ADMIN_PASSWORD / localhost guard in admin.ts applies.
 * - Login + password; passwords are scrypt hashes in the same format the seed script writes.
 * - Setup mode: when no active superadmin has a password (fresh install, or after `npm run admin:reset`),
 *   the server makes a one-time setup code at startup. It goes to the server log and to DATA_DIR/admin-setup-code.txt
 *   (root only). Only someone holding that code can set the login and password, so an open setup screen
 *   cannot be taken over from the internet.
 * - Sessions are random bearer tokens kept in memory for 12 hours; a restart logs everyone out.
 */

export interface AdminRow {
  id: number;
  login: string;
  password_hash: string;
  role: 'superadmin' | 'admin';
  is_active: number;
}

export interface AdminStore {
  findByLogin(login: string): Promise<AdminRow | null>;
  /** The superadmin account, active or not, if one exists. */
  superadmin(): Promise<AdminRow | null>;
  /** Sets login + password of the superadmin, creating the row when there is none. */
  saveSuperadmin(login: string, passwordHash: string): Promise<AdminRow>;
  touchLogin(id: number): Promise<void>;
}

// ---------- passwords ----------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, N, r, p, salt, hash] = (stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, 'base64');
    const got = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
    return crypto.timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}

// ---------- MariaDB store ----------

function mariaStore(url: string): AdminStore {
  // Loaded lazily so tests and setups without a database never touch the driver.
  let pool: import('mysql2/promise').Pool | null = null;
  const db = async () => {
    if (!pool) {
      const mysql = await import('mysql2/promise');
      pool = mysql.createPool({ uri: url, connectionLimit: 3, waitForConnections: true });
    }
    return pool;
  };
  const one = async (sql: string, params: unknown[]) => {
    const [rows] = await (await db()).query(sql, params);
    return ((rows as AdminRow[])[0] ?? null) as AdminRow | null;
  };
  const COLS = 'id, login, password_hash, role, is_active';
  return {
    findByLogin: (login) => one(`SELECT ${COLS} FROM ignis_admins WHERE login = ? LIMIT 1`, [login]),
    superadmin: () => one(`SELECT ${COLS} FROM ignis_admins WHERE role = 'superadmin' ORDER BY id LIMIT 1`, []),
    async saveSuperadmin(login, passwordHash) {
      const existing = await this.superadmin();
      const conn = await db();
      if (existing) {
        await conn.query(`UPDATE ignis_admins SET login = ?, password_hash = ?, is_active = 1 WHERE id = ?`, [login, passwordHash, existing.id]);
      } else {
        await conn.query(`INSERT INTO ignis_admins (login, password_hash, role, is_active) VALUES (?, ?, 'superadmin', 1)`, [login, passwordHash]);
      }
      return (await this.findByLogin(login))!;
    },
    async touchLogin(id) {
      await (await db()).query(`UPDATE ignis_admins SET last_login_at = NOW() WHERE id = ?`, [id]);
    },
  };
}

let store: AdminStore | null = process.env.T1000_DATABASE_URL ? mariaStore(process.env.T1000_DATABASE_URL) : null;

/** Tests swap in an in-memory store; null turns database login off. */
export function setAdminStore(next: AdminStore | null) {
  store = next;
  sessions.clear();
  setup = null;
}
export const dbLoginEnabled = () => !!store;

// ---------- setup code ----------

const SETUP_FILE = () => path.join(DATA_DIR, 'admin-setup-code.txt');
const SETUP_TTL_MS = 24 * 60 * 60 * 1000;
let setup: { code: string; expires: number } | null = null;

const needsSetup = (row: AdminRow | null) => !row || !row.is_active || !row.password_hash;

function newSetupCode() {
  // 12 characters from an alphabet without look-alikes, shown as XXXX-XXXX-XXXX.
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const raw = Array.from({ length: 12 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  return raw.match(/.{4}/g)!.join('-');
}
const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

function clearSetupFile() {
  try {
    fs.rmSync(SETUP_FILE(), { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Called once at startup. In setup mode it creates the code, logs it and writes it to a root-only file.
 * Never throws: a database that is down only means the panel cannot log in yet.
 */
export async function initAdminAuth(log: (msg: string) => void = console.log) {
  if (!store) return;
  try {
    const row = await store.superadmin();
    if (!needsSetup(row)) {
      clearSetupFile();
      return;
    }
    setup = { code: newSetupCode(), expires: Date.now() + SETUP_TTL_MS };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SETUP_FILE(), `${setup.code}\n`, { mode: 0o600 });
    log(`[admin] No admin password is set. One-time setup code: ${setup.code} (valid 24 h, also in ${SETUP_FILE()}). Open /#/admin to set the login and password.`);
  } catch (e) {
    console.error('[admin] Could not reach the t1000 database for admin login:', (e as Error).message);
  }
}

// ---------- sessions ----------

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map<string, { id: number; login: string; expires: number }>();

function openSession(row: AdminRow) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, { id: row.id, login: row.login, expires: Date.now() + SESSION_TTL_MS });
  return { token, login: row.login, expiresIn: SESSION_TTL_MS / 1000 };
}

function sessionOf(req: Request) {
  const m = /^Bearer\s+(.+)$/i.exec(req.header('authorization') ?? '');
  if (!m) return null;
  const s = sessions.get(m[1].trim());
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(m[1].trim());
    return null;
  }
  return s;
}

/** The guard used by admin.ts when database login is on. */
export function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  if (sessionOf(req)) return next();
  return res.status(401).json({ error: setup ? 'Set the admin password first.' : 'Please log in.' });
}

// ---------- routes (mounted before the guard) ----------

export const adminAuth = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Wait 15 minutes and try again.' },
});

const Login = z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9._@-]+$/, 'Login: letters, digits and . _ @ - only.');
const Password = z.string().min(10, 'Password: at least 10 characters.').max(200);

adminAuth.get('/status', async (req, res) => {
  if (!store) {
    return res.json({ mode: process.env.ADMIN_PASSWORD ? 'password' : 'local', needsSetup: false, loggedIn: false });
  }
  const s = sessionOf(req);
  res.json({ mode: 'db', needsSetup: !!setup && setup.expires > Date.now(), loggedIn: !!s, login: s?.login ?? null });
});

adminAuth.post('/login', authLimiter, async (req, res) => {
  if (!store) return res.status(404).json({ error: 'Database login is not enabled.' });
  const body = z.object({ login: z.string().max(64), password: z.string().max(200) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Login and password are required.' });
  try {
    const row = await store.findByLogin(body.data.login.trim());
    // Hash even when the login is unknown, so response time does not reveal which logins exist.
    const ok = verifyPassword(body.data.password, row?.password_hash || hashPassword('timing-dummy'));
    if (!row || !row.is_active || !ok) return res.status(401).json({ error: 'Wrong login or password.' });
    await store.touchLogin(row.id).catch(() => {});
    res.json(openSession(row));
  } catch (e) {
    console.error('[admin] login failed:', (e as Error).message);
    res.status(503).json({ error: 'The admin database is not reachable right now.' });
  }
});

adminAuth.post('/setup', authLimiter, async (req, res) => {
  if (!store) return res.status(404).json({ error: 'Database login is not enabled.' });
  if (!setup || setup.expires < Date.now()) {
    return res.status(409).json({ error: 'Setup is not open. Restart the server after `npm run admin:reset` to get a new code.' });
  }
  const body = z.object({ code: z.string().max(40), login: Login, password: Password }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid input.' });
  const given = crypto.createHash('sha256').update(normalizeCode(body.data.code)).digest();
  const expected = crypto.createHash('sha256').update(normalizeCode(setup.code)).digest();
  if (!crypto.timingSafeEqual(given, expected)) return res.status(401).json({ error: 'Wrong setup code.' });
  try {
    const row = await store.saveSuperadmin(body.data.login, hashPassword(body.data.password));
    setup = null;
    clearSetupFile();
    sessions.clear();
    console.log(`[admin] Superadmin "${row.login}" set a new password. Setup code used up.`);
    res.json(openSession(row));
  } catch (e) {
    console.error('[admin] setup failed:', (e as Error).message);
    res.status(503).json({ error: 'The admin database is not reachable right now.' });
  }
});

adminAuth.post('/logout', (req, res) => {
  const m = /^Bearer\s+(.+)$/i.exec(req.header('authorization') ?? '');
  if (m) sessions.delete(m[1].trim());
  res.json({ ok: true });
});
