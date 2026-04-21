# TokSight

Real-time Claude Code usage metrics in your VS Code sidebar.

**100% local. Zero network. Zero telemetry.**

## What you get

- **Live widget** — 2-slide carousel: Quota · Session Now
- **Sidebar groups** — NOW / TODAY / QUOTA / MODELS & TOOLS / INSIGHTS
- **Full dashboard** — Quota, Sessions, Projects, Models & Tools, Insights tabs with time-range filter
- **Anthropic OAuth quota** (optional) — official 5h / 7d / Sonnet / Opus utilization windows
- **Per-project cost split**, session recaps, tool error aggregation, friction history
- **Cache savings** — the $ your cache reads actually saved this week
- **Claude design system** — Parchment + Terracotta, warm dark mode, auto-follows VS Code theme

## Install

### From VSIX (recommended)

```bash
npm install
npm run build
npm run package
code --install-extension toksight-0.1.0.vsix
```

Or: VS Code → `Cmd+Shift+P` → `Extensions: Install from VSIX…` → pick the file.

### Dev mode (F5)

Open repo in VS Code, press **F5** — launches Extension Development Host with extension preloaded.

## Settings

| Setting | Default | Description |
|---|---|---|
| `toksight.jsonlPath` | `~/.claude/projects/` | JSONL directory |
| `toksight.pricingOverrides` | `{}` | Override model pricing per million tokens |
| `toksight.carouselInterval` | `5000` | Widget rotation interval (ms) |
| `toksight.insightsMax` | `3` | Max insights shown |
| `toksight.primaryUnit` | `cost` | `cost` ($) or `tokens` — hero number unit |
| `toksight.budget5h` | `0` | Your 5h budget ($). Set > 0 to show % + ETA. |
| `toksight.oauthEnabled` | `true` | Pull Anthropic OAuth quota windows. Off = 100% local. |

## Development

Requirements: Node.js ≥ 20, VS Code ≥ 1.85

```bash
npm install        # install deps
npm run watch      # auto-rebuild on change
npm test           # run tests (vitest)
npm run lint       # type check (tsc --noEmit)
npm run package    # produce .vsix
```

Tests: `npm test` — 155 tests across 34 files. All pure-function unit tests; VS Code API tested manually via F5.

## Architecture

```
~/.claude/projects/{slug}/{uuid}.jsonl
          │
          ▼  fs.watch + debounce 2s
   Extension Host (Node.js)
   ├── jsonl-watcher       → watch + incremental parse
   ├── jsonl-parser        → JSONL line → typed message
   ├── data-aggregator     → tools / MCP / projects / sessions / recaps
   ├── metrics-calculator  → output ratio, cache rate, model mix, spend
   ├── anthropic-usage-api → optional OAuth quota (cached 5 min)
   ├── pricing-table       → model → $/token
   ├── insights-engine     → rule-based actionable insights
   ├── status-bar-manager  → compact summary
   └── webview-provider    → postMessage → Preact (sidebar + dashboard + widget)
```

Data flows one way: `JSONL files → JsonlWatcher → MetricsCalculator → postMessage → Preact UI`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
