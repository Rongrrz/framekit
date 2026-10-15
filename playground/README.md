# Playground

Run `npm ci` and `npm run dev`, then open the URL printed by Vite. The documentation site and
`collections.html` consume the same FrameKit source as applications. Production builds omit
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
- `components/docs-shell.ts` owns article flow, topic navigation, outline, code blocks, and reading links.
- `components/reference-content.ts` holds the focused API chapters; `reference-page.ts` renders them.
- `guide-page.ts`, `home.ts`, and `overlays-page.ts` own their specialized content and examples.

The site uses Avenir Next when available, with Avenir and system sans fallbacks; code uses a
system monospace stack. No font download is required. The layout reflows rather than scaling
text into a fixed canvas. Desktop/mobile and light/dark transitions reuse existing instances.

## Inspector and collections

**Debug tools** or **F8** opens the shared `framekit/devtools` inspector. It lives outside the
application tree and has independent system typography and blue controls. Move it by the title
bar, resize from any edge/corner, or use the focusable keyboard controls. Search, picking,
selection history, ancestor navigation, and property filtering inspect the live application.
Closing restores focus; destroying the root removes the binding and its resources.

`collections.html` renders 100,000 data rows with a bounded virtual window. Insert at the top
to try scroll anchoring, or use End to select the last row without mounting every view.

Both entries are included in production builds. Keep local validation focused on affected unit
and Chromium cases; CI runs the complete browser matrix.

The `#/controls` chapter demonstrates command menus, native modal dialogs, tree keyboard
navigation, and explicit binding disposal. Open `/collections.html?heights=variable` for
the measured-height prototype with wrapped text and expandable rows.
