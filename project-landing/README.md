# Project landing

Run `npm ci` and `npm run dev`, then open the URL printed by Vite. The documentation site,
`collections.html`, and `inbox.html` consume the same FrameKit source as applications. Production builds omit
the inspector integration.

## Documentation routes

| Route         | What readers get                                                                |
| ------------- | ------------------------------------------------------------------------------- |
| `#/`          | A working counter and paths into the guide                                      |
| `#/guide`     | Local installation, mounting, a complete counter, and cleanup                   |
| `#/elements`  | Native controls, semantic elements, events, focus, links, and documents         |
| `#/layout`    | Scale/offset geometry, automatic sizing, modifiers, breakpoints, scrolling      |
| `#/state`     | Owned values, computed state, signals, keyed children, virtual lists            |
| `#/lifecycle` | Tree ownership, detach/unmount/destroy, external cleanup, property transactions |
| `#/animation` | Springs, tweens, playback, competing property writers, reduced motion           |
| `#/controls`  | Command menus, native dialogs, tree navigation, and binding disposal            |
| `#/overlays`  | Tooltip/popover ownership and interactive examples                              |
| `#/devtools`  | Launch options, shortcuts, picking, window controls, snapshots                  |
| `#/api`       | A short API map linking to the appropriate chapters                             |

Examples have copy controls and horizontal scrolling. Each chapter states the behavior that
matters alongside its example. Desktop navigation stays visible while reading; smaller screens
provide a **Browse documentation** menu. Native topic links support deep links, browser history,
and opening another tab. Route changes update the title and move focus to the article heading.

## Structure and ownership

- `app.ts` composes one persistent tree and the shared layout, palette, and route values.
- `router.ts` owns route names, documentation navigation, and visibility. Pages retain identity.
- `page-shell.ts` owns native scrolling. Content height comes from normal document flow.
- `site.css` owns fluid site layout, reading widths, and responsive rails; it never styles devtools.
- `theme.ts` owns palettes, font stacks, typography, theme persistence, and immediate palette switching.
- `components/docs-shell.ts` owns the page rails and topic navigation.
- `components/docs-article.ts` owns article flow, sections, examples, outlines, and reading links.
- `components/reference/` holds one API chapter per topic; `reference-content.ts` registers them
  and `reference-page.ts` renders them.
- `examples/` holds readable TypeScript, HTML, and shell excerpts. The Node-only `tooling/` pipeline
  prepares their display and clipboard output; `components/code-block.ts` renders it immediately.
- `guide-page.ts`, `home.ts`, and `overlays-page.ts` own their specialized content and examples.

The site uses Avenir Next when available, with Avenir and system sans fallbacks; code uses a
system monospace stack. No font download is required. The layout reflows rather than scaling
text into a fixed canvas. Desktop/mobile and light/dark transitions reuse existing instances.

## Documentation examples

Edit examples as ordinary files in `examples/`, preserving blank lines between logical blocks.
Import them with `?example`, for example
`import counterExample from '../../examples/home/counter.ts?example'`, then pass the result to
`createCodeBlock`. The import returns formatted `source` and highlighted `html`; the Copy button
uses the same source shown in the block. Keep displayed filenames meaningful for the reader.

Vite runs Prettier and Shiki in Node during development and production builds. Example edits
refresh the prepared output automatically. Invalid syntax fails with the example's filename;
there is no generated directory to maintain or browser formatting download. The build rejects
Prettier/Shiki modules in emitted browser chunks. Both code palettes are prepared together, so
theme switches remain synchronous.

These files are documentation excerpts and can reference surrounding application variables.
They are excluded from standalone TypeScript and unused-variable lint checks; the repository
formatter still checks their formatting, and the example loader parses their syntax.

## Inspector and collections

**Debug tools** or **F8** opens the shared `framekit/devtools` inspector. It lives outside the
application tree and has independent system typography and blue controls. Move it by the title
bar, resize from any edge/corner, or use the focusable keyboard controls. Search, picking,
selection history, ancestor navigation, and property filtering inspect the live application.
Closing restores focus; destroying the root removes the binding and its resources.

`collections.html` renders 100,000 data rows with a bounded virtual window. Insert at the top
to try scroll anchoring, or use End to select the last row without mounting every view.

All three entries are included in production builds. Keep local validation focused on affected unit
and Chromium cases; CI runs the complete browser matrix.

The `#/controls` chapter demonstrates command menus, native modal dialogs, tree keyboard
navigation, and explicit binding disposal. Open `/collections.html?heights=variable` for
the measured-height prototype with wrapped text and expandable rows.

`/inbox.html` is the application validation screen: 2,000 variable-height messages, filtering,
selection, expansion, late image attachments, and a delayed local FontFace load. The font button
uses Arial, Liberation Sans, DejaVu Sans, or Helvetica when available. It changes actual font
metrics without contacting a font service; the attachment remains a separate HTTP asset so tests
can control network completion. Destroying the screen removes its font and pending work.
