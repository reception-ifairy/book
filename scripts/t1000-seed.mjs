#!/usr/bin/env node
/**
 * Saves this project's superadmin and API keys into the t1000 tables (db/t1000/001_ignis_storage.sql).
 * Prints SQL; pipe it straight into MariaDB:
 *
 *   node scripts/t1000-seed.mjs | mysql t1000
 *
 * Reads ADMIN_PASSWORD and IGNIS_T1000_SECRET from .env, and the keys from DATA_DIR/config.json
 * with *_API_KEY in .env as fallback (the same order as getKey() in server/config.ts).
 * The output holds only a scrypt hash and AES-256-GCM ciphertext, never a plain secret.
 * It upserts, so running it again refreshes the rows.
 *
 *   node scripts/t1000-seed.mjs --verify   reads the rows back (mysql t1000 as root) and checks
 *                                           that they decrypt to the current values; prints no secret.
 */
import 'dotenv/config';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const PROVIDERS = { anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' };
const SUPERADMIN_LOGIN = 'superadmin';
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const die = (msg) => {
  console.error(`t1000-seed: ${msg}`);
  process.exit(1);
};
const hex = (buf) => `0x${Buffer.from(buf).toString('hex')}`;
const str = (s) => `X'${Buffer.from(s, 'utf8').toString('hex')}'`;

const secret = process.env.IGNIS_T1000_SECRET || '';
if (!/^[0-9a-f]{64}$/i.test(secret)) die('IGNIS_T1000_SECRET must be 64 hex characters (32 bytes) in .env.');
const aesKey = Buffer.from(secret, 'hex');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const got = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(got, expected);
}

function encryptKey(provider, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  cipher.setAAD(Buffer.from(provider, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { iv, ciphertext, tag: cipher.getAuthTag() };
}

function decryptKey(provider, { iv, ciphertext, tag }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAAD(Buffer.from(provider, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

let saved = {};
try {
  const dataDir = path.resolve(process.env.DATA_DIR || 'data');
  saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8')).keys || {};
} catch {
  console.error('t1000-seed: no readable config.json, using .env keys only.');
}
const keyFor = (provider) => saved[provider] || process.env[PROVIDERS[provider]] || '';
const password = process.env.ADMIN_PASSWORD || '';

if (process.argv.includes('--verify')) {
  const query = (sql) =>
    execFileSync('mysql', ['-N', '-B', 't1000', '-e', sql], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('\t'));
  let ok = true;
  const [admin] = query(`SELECT password_hash, role, is_active FROM ignis_admins WHERE login = '${SUPERADMIN_LOGIN}'`);
  const adminOk = Boolean(admin && password && verifyPassword(password, admin[0]) && admin[1] === 'superadmin' && admin[2] === '1');
  console.log(`superadmin: ${adminOk ? 'OK (hash matches ADMIN_PASSWORD)' : 'MISSING or does not match'}`);
  ok &&= adminOk;
  const rows = query('SELECT provider, HEX(ciphertext), HEX(iv), HEX(auth_tag), key_hint FROM ignis_api_keys');
  for (const provider of Object.keys(PROVIDERS)) {
    const row = rows.find((r) => r[0] === provider);
    const current = keyFor(provider);
    if (!row) {
      console.log(`${provider}: ${current ? 'MISSING' : 'no key (none configured)'}`);
      ok &&= !current;
      continue;
    }
    let same = false;
    try {
      const plain = decryptKey(provider, {
        ciphertext: Buffer.from(row[1], 'hex'),
        iv: Buffer.from(row[2], 'hex'),
        tag: Buffer.from(row[3], 'hex'),
      });
      same = plain === current;
    } catch {
      same = false;
    }
    console.log(`${provider}: ${same ? `OK (decrypts to the current key, ends …${row[4]})` : 'does NOT match the current key'}`);
    ok &&= same;
  }
  process.exit(ok ? 0 : 1);
}

const out = ['SET NAMES utf8mb4;', 'START TRANSACTION;'];

if (password) {
  out.push(
    `INSERT INTO ignis_admins (login, password_hash, role, is_active) VALUES (${str(SUPERADMIN_LOGIN)}, ${str(hashPassword(password))}, 'superadmin', 1)` +
      ` ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'superadmin', is_active = 1;`,
  );
} else {
  console.error('t1000-seed: ADMIN_PASSWORD is empty, superadmin skipped.');
}

for (const provider of Object.keys(PROVIDERS)) {
  const value = keyFor(provider);
  if (!value) {
    console.error(`t1000-seed: no ${provider} key, skipped.`);
    continue;
  }
  const { iv, ciphertext, tag } = encryptKey(provider, value);
  out.push(
    `INSERT INTO ignis_api_keys (provider, ciphertext, iv, auth_tag, key_hint, updated_by) VALUES (${str(provider)}, ${hex(ciphertext)}, ${hex(iv)}, ${hex(tag)}, ${str(value.slice(-4))}, ${str('t1000-seed')})` +
      ' ON DUPLICATE KEY UPDATE ciphertext = VALUES(ciphertext), iv = VALUES(iv), auth_tag = VALUES(auth_tag), key_hint = VALUES(key_hint), updated_by = VALUES(updated_by);',
  );
}

out.push('COMMIT;');
console.log(out.join('\n'));
