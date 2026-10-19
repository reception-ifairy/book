import { describe, expect, it } from 'vitest';
import { cleanProviderMessage } from '../server/providers/types';

describe('cleanProviderMessage', () => {
  it('extracts the human message from a raw Google error body', () => {
    const raw = new Error('{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}');
    expect(cleanProviderMessage(raw)).toBe('API key not valid. Please pass a valid API key.');
  });

  it('passes plain messages through and truncates very long ones', () => {
    expect(cleanProviderMessage(new Error('401 Incorrect API key'))).toBe('401 Incorrect API key');
    expect(cleanProviderMessage('x'.repeat(1000))).toHaveLength(300);
  });
});
