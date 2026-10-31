import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

// A config.json written by an older version, with one broken section, is in place before the module loads.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-config-load-'));
process.env.DATA_DIR = dir;
fs.writeFileSync(
  path.join(dir, 'config.json'),
  JSON.stringify({ keys: { anthropic: 'sk-ant-saved-1234567890' }, story: { model: 'claude-haiku-5-5', effort: 'low' }, universe: { url: 'not a url' } }),
);
const cfg = await import('../server/config');

describe('loading config.json', () => {
  it('resets only the broken section, fills new fields from defaults, and keeps the saved keys', () => {
    const c = cfg.getConfig();
    expect(c.keys.anthropic).toBe('sk-ant-saved-1234567890');
    expect(c.story).toEqual({ model: 'claude-haiku-5-5', effort: 'low', maxDepth: 12 });
    expect(c.universe).toEqual({ enabled: false, url: 'http://127.0.0.1:8793', grant: 'if-ai' });
    expect(c.limits.actionsPerMinute).toBe(12);
  });
});
