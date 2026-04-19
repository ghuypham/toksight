import { describe, it, expect, vi } from 'vitest';
import { readClaudeToken } from '../src/keychain-reader';

const VALID_JSON = JSON.stringify({
  claudeAiOauth: {
    accessToken: 'sk-ant-oat01-xyz',
    refreshToken: 'sk-ant-ort01-abc',
    expiresAt: 1900000000000,
    scopes: ['user:profile', 'user:inference'],
    subscriptionType: 'max',
  },
});

describe('readClaudeToken', () => {
  it('returns null when `security` command fails', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('item not found'));
    const token = await readClaudeToken({ runner });
    expect(token).toBeNull();
  });

  it('extracts accessToken from generic-password JSON payload', async () => {
    const runner = vi.fn().mockResolvedValue(VALID_JSON + '\n');
    const token = await readClaudeToken({ runner });
    expect(token).toBe('sk-ant-oat01-xyz');
  });

  it('returns null on empty output', async () => {
    const runner = vi.fn().mockResolvedValue('');
    const token = await readClaudeToken({ runner });
    expect(token).toBeNull();
  });

  it('returns null on malformed (non-JSON) output', async () => {
    const runner = vi.fn().mockResolvedValue('not json at all');
    const token = await readClaudeToken({ runner });
    expect(token).toBeNull();
  });

  it('returns null when JSON lacks claudeAiOauth.accessToken', async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify({ foo: 'bar' }));
    const token = await readClaudeToken({ runner });
    expect(token).toBeNull();
  });

  it('returns null when accessToken is empty string', async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify({ claudeAiOauth: { accessToken: '' } }));
    const token = await readClaudeToken({ runner });
    expect(token).toBeNull();
  });
});
