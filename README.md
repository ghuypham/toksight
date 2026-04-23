<div align="center">

<img src="public/icon.png" alt="TokSight" width="96" />

# TokSight

**Real-time Claude Code usage metrics — in your VS Code sidebar and terminal.**

[![Open VSX](https://img.shields.io/open-vsx/v/ghuypham/toksight?label=Open%20VSX&color=822be2)](https://open-vsx.org/extension/ghuypham/toksight)
[![npm](https://img.shields.io/npm/v/toksight?color=cb3837)](https://www.npmjs.com/package/toksight)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

100% local · Zero telemetry · Reads `~/.claude/projects/*.jsonl`

</div>

---

## What is TokSight?

TokSight reads the JSONL conversation logs that Claude Code writes locally and surfaces them as a rich, real-time dashboard — no API key, no cloud sync, no telemetry. Everything stays on your machine.

Available as a **VS Code extension** (sidebar + full dashboard) and a **CLI** (`npx toksight`) for terminal users.

---

## Screenshots

> _VS Code sidebar widget with live session metrics, quota bars, and efficiency score._

---

## Features

### VS Code Extension

| Feature | Description |
|---|---|
| **Live sidebar widget** | 2-slide carousel — Quota progress · Active session burn rate |
| **Sidebar groups** | NOW / TODAY / QUOTA / MODELS & TOOLS / INSIGHTS — always visible |
| **Full dashboard** | `Cmd+Shift+P` → _TokSight: Open Dashboard_ — Quota, Sessions, Projects, Models, Insights tabs |
| **Anthropic OAuth quota** | Official 5h / 7d / Sonnet / Opus utilization windows (optional, toggle off for 100% local) |
| **Per-project cost breakdown** | See spend split across all your Claude Code projects |
| **Session recaps** | What was built, tool errors, duration, tokens per session |
| **Cache savings** | The $ your prompt cache actually saved this week |
| **Efficiency score** | 0-100 score based on output ratio, cache rate, and session cadence |
| **Insights** | Up to 3 actionable rule-based insights — heavy tool use, low cache, budget pace |
| **Claude design system** | Parchment + Terracotta palette, warm dark mode, auto-follows VS Code theme |

### CLI (`npx toksight`)

```
npx toksight             # snapshot — print metrics, then exit
npx toksight --json      # machine-readable JSON (pipe-friendly)
npx toksight --path DIR  # custom JSONL directory
npx toksight --help
```

Terminal output includes sessions, projects, quota bars, model mix, efficiency score, and insights — all ANSI-colored.

---

## Install

### VS Code Extension — Open VSX

Search **TokSight** in the VS Code Extensions panel, or install via command palette:

```
ext install ghuypham.toksight
```

Available at [open-vsx.org/extension/ghuypham/toksight](https://open-vsx.org/extension/ghuypham/toksight).  
Supports VS Code ≥ 1.85, Cursor, VS Codium, Gitpod, and any VS Code-compatible editor.

### CLI — npm

```bash
npx toksight
```

Or install globally:

```bash
npm install -g toksight
toksight
```

### Requirements

- Claude Code must be installed and have run at least one session (creates `~/.claude/projects/`)
- Node.js ≥ 20 (for CLI)
- VS Code ≥ 1.85 (for extension)
- **macOS or Windows** — Linux is not officially supported in v0.1.0 (recursive `fs.watch` limitation; new project folders won't auto-detect until reload)

---

## Configuration

All settings are under `toksight.*` in VS Code settings (`Cmd+,`):

| Setting | Default | Description |
|---|---|---|
| `toksight.jsonlPath` | `~/.claude/projects/` | Custom JSONL directory |
| `toksight.pricingOverrides` | `{}` | Override model pricing ($/million tokens). E.g. `{ "claude-sonnet-4-6": { "inputPerMillion": 3 } }` |
| `toksight.carouselInterval` | `5000` | Widget carousel rotation interval (ms) |
| `toksight.insightsMax` | `3` | Max insights shown |
| `toksight.primaryUnit` | `cost` | Hero number unit: `cost` (shows $) or `tokens` |
| `toksight.budget5h` | `0` | Your 5-hour budget ($). Set > 0 to show % of cap + ETA. |
| `toksight.oauthEnabled` | `true` | Pull Anthropic OAuth quota windows. Set `false` for 100% local mode. |

For the CLI, use `--path` flag or set `TOKSIGHT_PATH` environment variable.

---

## How It Works

TokSight reads conversation logs that Claude Code writes to `~/.claude/projects/` — no network requests, no account required.

```
~/.claude/projects/{slug}/{uuid}.jsonl
          │
          ▼  fs.watch + debounce 2s
   Node.js Extension Host
   ├── jsonl-watcher       → watch + incremental parse
   ├── jsonl-parser        → JSONL line → typed message
   ├── data-aggregator     → tools / projects / sessions / recaps
   ├── metrics-calculator  → output ratio, cache rate, model mix, spend
   ├── insights-engine     → rule-based actionable insights
   ├── pricing-table       → model → $/token mapping
   ├── anthropic-usage-api → optional OAuth quota (cached, local)
   └── webview-provider    → postMessage → Preact UI
```

Data flows one way: `JSONL files → Watcher → Metrics → UI`

The CLI reuses the same modules — zero VS Code dependencies — and writes directly to stdout.

---

## Privacy

- **No telemetry** — TokSight never phones home.
- **No API keys required** — pricing is computed locally from a bundled table.
- **Anthropic OAuth quota** (optional) — if enabled, TokSight calls Anthropic's usage endpoint using the same OAuth token Claude Code stores in your system keychain. This endpoint is **not officially documented** — it may change or be removed without notice. Disable with `toksight.oauthEnabled: false` for fully offline operation.

---

## Development

Requirements: Node.js ≥ 20, VS Code ≥ 1.85

```bash
git clone https://github.com/ghuypham/toksight
cd toksight
npm install

npm run build          # build extension + webview + CLI (esbuild)
npm run watch          # watch mode
npm test               # run tests (vitest) — 155 tests across 34 files
npm run lint           # type check (tsc --noEmit)
npm run package        # produce .vsix for local install
```

Press **F5** in VS Code to launch an Extension Development Host with TokSight preloaded.

### Project Structure

```
src/            Extension host (Node.js) — pure functions, no VS Code imports except extension.ts
webview/        Preact UI — sidebar widget, sidebar groups, full-page dashboard
test/           Unit tests — pure functions only, VS Code API tested manually via F5
dist/           Build output (gitignored)
```

---

## Contributing

1. Fork the repo and create a feature branch.
2. Make your changes — run `npm test` and `npm run lint` before committing.
3. Open a pull request with a clear description of what changed and why.

Bug reports and feature requests welcome via [GitHub Issues](https://github.com/ghuypham/toksight/issues).

---

## License

[MIT](LICENSE) © TokSight
