# Security and tooling review

Reviewed 2026-10-14. This is a source and dependency review with regression tests, not a
penetration-test certification. FrameKit is a browser DOM library; Node runs its development,
build, and test tools.

## Fixed findings

- **Excessive work in scaled text:** estimate refinement could walk one pixel at a time,
  forcing thousands of layout measurements when host CSS or browser font limits disagreed
  with canvas metrics. Refinement now uses the existing binary fitter, retaining the quick
  accurate-estimate path. Tests cover extreme simulated metrics and real CSS overrides.
  This bounds measurement count logarithmically in the available font-size range.

- **Password disclosure in diagnostics:** `inspectInstance` copied password `Text` into the
  inspector and diagnostic snapshots. Password TextInputs now return `[redacted]` there,
  including after destruction. The live input value and normal application reads are unchanged.
  This prevents accidental disclosure in screenshots and diagnostic output; same-origin scripts
  can still read a native input. Arbitrary application secrets in other properties are not
  automatically identifiable or redacted.
- **Immutable-property bypass:** frozen objects could inherit mutable values, and a custom
  `Symbol.toStringTag` could bypass structured-data copying. Property snapshots now copy all
  object data and reuse frozen graphs only with standard or null prototypes. Native/custom
  prototypes are not preserved. Callers cannot mutate a copied structured property through
  these paths. JSON `__proto__` keys remain inert own data and are rejected as unknown properties.
- **Development dependency advisories:** the previous lockfile flagged seven affected packages,
  including inherited critical findings through Tinypool. Updated Vitest, oxfmt, Vite, commitlint,
  lint/browser tooling, and compatible patch releases remove the reported advisories. The
  install audit reports zero vulnerabilities. The isolated React comparison lockfile also
  audited clean. Advisory databases change; CI audits both lockfiles and fails at high severity.

## Reviewed boundaries

| Boundary                                      | Current protection and remaining responsibility                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text, labels, text controls, inspector values | Rendered as literal DOM text or native input values; no user HTML evaluation. Browser regressions exercise markup and event-handler payloads.                                                                                                                                                           |
| Links and images                              | Parsed with the browser URL parser and checked against protocol allowlists before committing. Obfuscated `javascript:` and non-image `data:` sources are rejected; failed updates preserve existing state and DOM. This does not establish that an allowed destination or its contents are trustworthy. |
| Blob URLs                                     | Supported for image loading and link navigation/downloads. Applications must not turn untrusted HTML into a navigable same-origin blob.                                                                                                                                                                 |
| Semantic tags                                 | Factories accept finite tag allowlists, excluding script and arbitrary custom tags.                                                                                                                                                                                                                     |
| Properties and snapshots                      | Unknown property keys and invalid numeric/structured values are rejected. Copies preserve supported data and cycles, without retaining live accessors. JavaScript getters themselves are executable caller code, so do not treat arbitrary JavaScript objects as untrusted JSON.                        |
| Styles and text outlines                      | Values are assigned through DOM style APIs and literal text attributes, not HTML or stylesheet string concatenation with user text.                                                                                                                                                                     |
| Playground code blocks                        | The one `innerHTML` rendering path receives Shiki-generated markup. Existing tests verify literal source rendering and that example script tags do not become executable DOM. Do not pass arbitrary HTML to that sink.                                                                                  |
| Inspector and raw DOM                         | Inspector is opt-in through `framekit/devtools`. `unsafeElement` gives the application normal DOM authority. Neither is a sandbox for third-party JavaScript or plugins.                                                                                                                                |
| Input service                                 | Runs locally and marks handled/text-entry events as processed. It does not transmit keystrokes. Consumers should respect processed input; this flag is routing information, not an access-control boundary.                                                                                             |
| Browser requests and authentication           | Images and links can request/navigate to caller-chosen resources. The host application owns destination policy, CSP, authentication, authorization, CSRF protections, and server validation.                                                                                                            |

No `eval` or `new Function` execution sink was found in library or Playground source.
Security cases passed Chromium, Firefox, and WebKit. Prototype and snapshot cases are also
covered by focused unit tests. These checks do not prove the absence of undiscovered issues.

## Stack decisions

| Area                                     | Recommendation                                                                                     | Reason                                                                                                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node                                     | Keep Node 24 LTS for development; CI covers 22 and 24. Use the latest patched 24 release locally.  | Browser operation speed is determined by browser JavaScript and DOM work. Switching the development runtime does not remove those costs. Node 20 is end-of-life and is removed from CI. `.nvmrc` pins 24.22.0. |
| npm                                      | Keep npm and committed lockfiles.                                                                  | Reproducible installs and an existing working CI/package workflow. No measured requirement justifies a package-manager migration.                                                                              |
| Vite, TypeScript                         | Keep the current build architecture. TypeScript is updated within 6.0; evaluate 7 separately.      | The repository uses the TypeScript compiler API for boundary checks. A compiler major migration deserves its own compatibility validation rather than being bundled into security fixes.                       |
| Vitest, happy-dom                        | Keep for focused unit tests, with patched Vitest 5.                                                | Fast checks for state, validation, lifecycle, and DOM structure. DOM emulation cannot validate real layout or every vendor CSS behavior.                                                                       |
| Playwright                               | Keep native browser coverage and production browser benchmarks.                                    | URL parsing, rendering, focus, overlays, cleanup, and security boundaries need actual browsers.                                                                                                                |
| oxfmt, oxlint                            | Keep as repository formatter and linter.                                                           | Both are established and now updated; no reason to add a second repository formatter/linter.                                                                                                                   |
| Prettier, Shiki                          | Keep scoped to Playground; next move static example formatting/highlighting to build time.         | They serve a different purpose from repository formatting, but readonly documentation does not need to ship formatting machinery to the browser. Do not put them in FrameKit's runtime dependencies.           |
| Runtime validation/sanitization packages | Add none for the current API.                                                                      | Existing typed property checks and literal-text rendering cover the current design. If rich HTML is introduced, design an explicit trust boundary and evaluate a maintained sanitizer then.                    |
| Dependency maintenance                   | Added weekly Dependabot updates for both npm projects and GitHub Actions, plus CI advisory checks. | Keeps security maintenance routine rather than depending on an occasional manual scan.                                                                                                                         |

The final production Playground build emits a **2,033.93 kB minified / 465.81 kB gzip**
`code-formatting` chunk. It is loaded on demand, and is separate from the library bundle.
Build-time formatting/highlighting is the strongest concrete stack cleanup identified here.

Node support status: [official release schedule](https://nodejs.org/en/about/previous-releases).
Final unit and build validation uses an isolated Node 24.22.0 installation. `.nvmrc` pins that
patched LTS version for project development. The workstation default remains Node 24.11.0; use
`nvm install && nvm use` to select the project version without relying on that older executable.

## Release follow-through

Keep the complete test/build/browser/packaged-consumer matrix in CI. Review the packed file list
before publishing, confirm both dependency audits still pass, and publish from a trusted clean
checkout with npm account protection and provenance. Package publication is not performed by
this review.
