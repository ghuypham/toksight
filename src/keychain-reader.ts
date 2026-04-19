import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface KeychainOptions {
  /** Injected for testing */
  runner?: (cmd: string) => Promise<string>;
}

/**
 * Read Claude Code OAuth access token from macOS Keychain.
 *
 * Claude Code stores credentials as a Keychain GENERIC password with
 * service name `"Claude Code-credentials"`. The password value is JSON:
 *   { claudeAiOauth: { accessToken, refreshToken, expiresAt, scopes, subscriptionType } }
 *
 * Returns null on any failure (missing entry, malformed JSON, non-macOS, etc.).
 */
export async function readClaudeToken(opts: KeychainOptions = {}): Promise<string | null> {
  const runner = opts.runner ?? (async (cmd: string) => {
    const { stdout } = await execAsync(cmd);
    return stdout;
  });

  try {
    const raw = await runner('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null');
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = JSON.parse(trimmed);
    const token = parsed?.claudeAiOauth?.accessToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}
