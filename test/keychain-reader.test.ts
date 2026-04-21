import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('readClaudeToken — macOS (darwin)', () => {
  it('returns null when `security` command fails', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('item not found'));
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBeNull();
  });

  it('extracts accessToken from generic-password JSON payload', async () => {
    const runner = vi.fn().mockResolvedValue(VALID_JSON + '\n');
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBe('sk-ant-oat01-xyz');
  });

  it('returns null on empty output', async () => {
    const runner = vi.fn().mockResolvedValue('');
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBeNull();
  });

  it('returns null on malformed (non-JSON) output', async () => {
    const runner = vi.fn().mockResolvedValue('not json at all');
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBeNull();
  });

  it('returns null when JSON lacks claudeAiOauth.accessToken', async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify({ foo: 'bar' }));
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBeNull();
  });

  it('returns null when accessToken is empty string', async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify({ claudeAiOauth: { accessToken: '' } }));
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBeNull();
  });
});

describe('readClaudeToken — Windows/Linux (file-based)', () => {
  const skipOnMac = process.platform === 'darwin' ? it.skip : it;

  skipOnMac('reads token from ~/.claude/.credentials.json', async () => {
    const token = await readClaudeToken({ _testFileReader: () => VALID_JSON });
    expect(token).toBe('sk-ant-oat01-xyz');
  });

  skipOnMac('returns null when credentials file is missing', async () => {
    const reader = () => { throw new Error('ENOENT'); };
    const token = await readClaudeToken({ _testFileReader: reader });
    expect(token).toBeNull();
  });
});

describe('readClaudeToken — env var (all platforms)', () => {
  afterEach(() => { delete process.env.CLAUDE_CODE_OAUTH_TOKEN; });

  it('returns env var token immediately, skips platform path', async () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'env-token-xyz';
    const runner = vi.fn();
    const token = await readClaudeToken({ _testRunner: runner });
    expect(token).toBe('env-token-xyz');
    expect(runner).not.toHaveBeenCalled();
  });
});
