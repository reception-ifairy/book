import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-config-'));
process.env.DATA_DIR = dir;
process.env.OPENAI_API_KEY = 'sk-env-openai-123456';
delete process.env.ANTHROPIC_API_KEY;

let cfg: typeof import('../server/config');
beforeAll(async () => {
  cfg = await import('../server/config');
});

describe('config', () => {
  it('masks keys to a prefix and the last four characters', () => {
    expect(cfg.maskKey('sk-ant-abcdefghijklmnop')).toBe('sk-ant…mnop');
    expect(cfg.maskKey(undefined)).toBeNull();
  });

  it('falls back to environment keys and prefers keys saved in the admin panel', () => {
    expect(cfg.keySource('openai')).toBe('env');
    expect(cfg.getKey('openai')).toBe('sk-env-openai-123456');
    expect(cfg.keySource('anthropic')).toBe('none');
    cfg.saveConfig({ ...cfg.getConfig(), keys: { openai: 'sk-admin-999999' } });
    expect(cfg.keySource('openai')).toBe('admin');
    expect(cfg.getKey('openai')).toBe('sk-admin-999999');
  });

  it('writes config.json readable only by the server user', () => {
    const mode = fs.statSync(path.join(dir, 'config.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('rejects invalid settings', () => {
    expect(() => cfg.saveConfig({ ...cfg.getConfig(), story: { model: '', effort: 'medium', maxDepth: 12 } })).toThrow();
    expect(() => cfg.saveConfig({ ...cfg.getConfig(), limits: { actionsPerMinute: 0, imagesPerDay: 1 } })).toThrow();
  });
});
