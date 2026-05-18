# Contributing to TokSight

Thanks for helping improve TokSight. By contributing you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md) — be respectful, be constructive.

## Setup

```bash
git clone https://github.com/toksight/toksight
cd toksight
npm install
```

Press **F5** in VS Code to launch the Extension Development Host.

## Dev workflow

```bash
npm run watch   # rebuild on change (keep this running)
npm test        # run all tests
npm run lint    # type check
```

Tests are in `test/`. All unit tests cover pure functions — no VS Code API mocking needed. Integration tested manually via F5.

## Project structure

```
src/        Extension host (Node.js) — data pipeline, metrics, providers
webview/    Preact UI — sidebar, widget carousel, full-page dashboard
test/       Vitest unit tests
public/     Extension icon
```

## Guidelines

- No external UI libraries — Preact only, CSS-in-JS via inline styles
- No network calls except optional Anthropic OAuth quota fetch (behind `toksight.oauthEnabled`)
- All colors from `webview/styles/theme.ts` tokens — no hardcoded hex
- Keep tests passing: `npm test` must be green before submitting a PR

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make changes + add tests if applicable
4. `npm run lint && npm test`
5. Open a PR against `main`

## Reporting Security Issues

Please **do not** open public issues for security reports. See [SECURITY.md](SECURITY.md) for the private disclosure process.
