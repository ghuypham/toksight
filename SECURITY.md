# Security Policy

## Supported Versions

Only the latest minor version of TokSight receives security fixes.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Please report vulnerabilities privately via [GitHub Security Advisories](https://github.com/ghuypham/toksight/security/advisories/new).

If GitHub Security Advisories is unavailable, contact the maintainer directly: [@ghuypham](https://github.com/ghuypham).

### What to include

- A clear description of the issue and its impact
- Steps to reproduce (minimal code, screenshots, or PoC)
- TokSight version + VS Code version + OS
- Any suggested mitigation, if known

### What to expect

- **Acknowledgement** within 72 hours
- **Initial triage** within 7 days (severity, scope, fix plan)
- **Fix + disclosure** coordinated; security release tagged + advisory published
- **Credit** in the release notes (or anonymous, if you prefer)

## Scope

In-scope:
- TokSight VS Code extension source (`src/`, `webview/`)
- CLI binary (`dist/cli.js`)
- Local data handling (JSONL parsing, OAuth token reading)
- Webview CSP, message protocol, sandboxing

Out-of-scope:
- Issues in upstream dependencies (report to the dependency directly)
- VS Code itself or Anthropic's Claude Code
- Social engineering, physical access, or denial of service against the user's own machine

## Privacy & Data Handling

TokSight is designed to be **local-first**:

- All Claude Code JSONL parsing runs on-device; no data is sent to any TokSight server (none exists)
- The optional Anthropic OAuth quota fetch reads a token from the user's local OS keychain (macOS) or `~/.claude/.credentials.json` (Windows/Linux) and sends it only to `api.anthropic.com`
- No telemetry, no analytics, no remote logging

If you find any code path that sends user data to a third party other than Anthropic's documented endpoints, that is a vulnerability — please report it.
