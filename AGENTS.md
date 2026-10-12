# Local validation

Use focused validation during development. Keep the full test and build matrix in CI.

- For a routine change, run only the affected test files or cases. Do not automatically run all
  unit tests, browser tests, builds, and packaged-consumer checks.
- For DOM, focus, scrolling, or overlay changes, start with the affected Chromium cases. Run
  Firefox/WebKit locally when investigating browser-specific behavior or changing a cross-browser
  contract. CI runs the complete browser matrix.
- Type-check once after TypeScript changes. The commit hook checks formatting and lint; avoid
  repeating those checks manually unless needed to diagnose a failure.
- Do not rerun passing checks without a subsequent relevant change or unresolved failure.
  Add tests for observable regressions and important contracts, not private implementation steps.
- `npm run check` is static validation (formatting, types, lint). Reserve `npm run check:all` for
  broad changes, release preparation, or an explicit request for comprehensive local validation.
  Run packaged-consumer checks when exports, build configuration, or packaging change.
