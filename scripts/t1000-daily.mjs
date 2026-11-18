#!/usr/bin/env node
/**
 * Adds the starter daily-ops pool (db/t1000/daily.seed.json) to the t1000 tables (db/t1000/003_ignis_daily.sql).
 * Prints SQL; pipe it into MariaDB:
 *
 *   node scripts/t1000-daily.mjs | mysql t1000
 *
 * INSERT IGNORE by slug: entries that already exist, including ones edited in the admin panel, are left alone.
 * Strings go out as hex literals, so no content can break the SQL.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SEED_FILE = path.join(ROOT, 'db', 't1000', 'daily.seed.json');

const hex = (v) => `X'${Buffer.from(String(v), 'utf8').toString('hex')}'`;

export function buildDailySql(seed) {
  const out = ['SET NAMES utf8mb4;', 'START TRANSACTION;'];
  for (const q of seed.quests) {
    out.push(
      `INSERT IGNORE INTO ignis_quests (slug, title, description, kind, params, reward_xp, status) VALUES (${[hex(q.slug), hex(q.title), hex(q.description), hex(q.kind), hex(JSON.stringify(q.params ?? {})), Number(q.reward_xp) || 50, hex('active')].join(', ')});`,
    );
  }
  for (const g of seed.glitches) {
    out.push(`INSERT IGNORE INTO ignis_glitches (slug, text, status) VALUES (${hex(g.slug)}, ${hex(g.text)}, ${hex('active')});`);
  }
  out.push('COMMIT;');
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(buildDailySql(JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'))));
}
