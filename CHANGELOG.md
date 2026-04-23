# Changelog

All notable changes to TokSight will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-04-24

Initial public release.

### Added

- **Sidebar dashboard** — Live view of Claude Code usage grouped by Live / Today / Reference / Insights
- **Explorer widget** — Compact 3-slide carousel: quota, active session, recap (pinnable)
- **Full-page dashboard** — Multi-tab view: Now, Today, Breakdown, Activity, Sessions, Projects, Models & Tools
- **Status bar** — At-a-glance score, today spend, 5h window
- **Efficiency score** — Composite metric from output ratio, cache rate, session density
- **Insights engine** — Up to 3 actionable, rule-based insights per session
- **Quota bars with color thresholds** — Neutral → amber → red as you approach limits
- **MCP & Skills split** — Distinct sidebar groups so you see which extension surface burns tokens
- **OAuth usage API (opt-out)** — Fetches 5h window and weekly limits from Anthropic (requires login; disable via `toksight.oauthEnabled`)
- **CLI mode** — `npx toksight` for a terminal snapshot; supports `--json` and `--path` flags

### Privacy

- 100% local: reads `~/.claude/projects/*.jsonl` only
- Zero outbound network calls, except the opt-in Anthropic OAuth usage endpoint when `toksight.oauthEnabled: true`

### Supported platforms

- macOS (primary)
- Windows (primary)
- Linux: not officially supported in 0.1.0 (recursive `fs.watch` limitation — new project folders won't auto-detect until reload)

### Known limitations

- The Anthropic OAuth usage endpoint is unofficial; Anthropic may change it without notice
- 5h billing window is estimated (no public Anthropic API for exact window)
- Efficiency score benchmarks are initial estimates, not calibrated with community data
