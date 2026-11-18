#!/usr/bin/env node
/**
 * Forgot the admin password? Run on the server as root:
 *
 *   npm run admin:reset
 *   pm2 restart demo-ifairy-book
 *
 * It clears the superadmin's password in t1000.ignis_admins (the login stays). On the next start the
 * server prints a one-time setup code (pm2 logs demo-ifairy-book, or DATA_DIR/admin-setup-code.txt),
 * and /#/admin asks for that code plus a new login and password.
 *
 * Uses the root MariaDB socket (`mysql t1000`), so it works without knowing any password.
 */
import 'dotenv/config';
import { execFileSync } from 'child_process';

const sql = "UPDATE ignis_admins SET password_hash = '' WHERE role = 'superadmin'; SELECT ROW_COUNT();";
try {
  const out = execFileSync('mysql', ['-N', '-B', 't1000', '-e', sql], { encoding: 'utf8' }).trim();
  if (out === '0') {
    console.log('No superadmin row had a password to clear (setup mode will start anyway when none is set).');
  } else {
    console.log('Superadmin password cleared.');
  }
  console.log('Next: pm2 restart demo-ifairy-book, then read the setup code with: cat data/admin-setup-code.txt');
} catch (e) {
  console.error('admin:reset failed:', e.message);
  process.exit(1);
}
