import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

export interface KeychainOptions {
  /** Injected for testing — overrides platform credential read */
  _testFileReader?: (p: string) => string;
  _testRunner?: (cmd: string) => Promise<string>;
}

/**
 * Read Claude Code OAuth access token.
 *
 * Storage location differs by platform:
 * - macOS   : Keychain, service "Claude Code-credentials" (`security` CLI)
 * - Windows : ~/.claude/.credentials.json  (plain file; confirmed by community projects)
 * - Linux   : ~/.claude/.credentials.json  (plain file fallback; secret-tool optional)
 *
 * Env var CLAUDE_CODE_OAUTH_TOKEN always takes precedence (set via `claude setup-token`).
 *
 * Returns null on any failure — caller handles no-auth state gracefully.
 */
export async function readClaudeToken(opts: KeychainOptions = {}): Promise<string | null> {
  const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (envToken) return envToken;

  if (process.platform === 'darwin') return readMacos(opts._testRunner);
  return readCredentialsFile(opts._testFileReader);
}

// ─── macOS — Keychain ────────────────────────────────────────────────────────

async function readMacos(runner?: (cmd: string) => Promise<string>): Promise<string | null> {
  const run = runner ?? (async (cmd: string) => {
    const { stdout } = await execAsync(cmd);
    return stdout;
  });
  try {
    const raw = await run('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null');
    return parseTokenJson(raw.trim());
  } catch {
    return null;
  }
}

// ─── Windows / Linux — ~/.claude/.credentials.json ──────────────────────────

function readCredentialsFile(fileReader?: (p: string) => string): string | null {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
  const filePath = path.join(configDir, '.credentials.json');
  const read = fileReader ?? ((p: string) => fs.readFileSync(p, 'utf8'));
  try {
    const raw = read(filePath);
    return parseTokenJson(raw);
  } catch {
    return null;
  }
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function parseTokenJson(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    const token = parsed?.claudeAiOauth?.accessToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}
