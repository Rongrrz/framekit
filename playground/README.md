# Playground architecture

The playground is a small FrameKit documentation site. Its visual hierarchy is inspired by focused documentation sites, while the implementation remains FrameKit and plain TypeScript.

```text
playground/src/
|-- app.ts                    # composition root and shared state
|-- router.ts                 # tiny hash router and page visibility
|-- page-shell.ts             # scrolling, scaling, and page canvas
|-- layout.ts                 # responsive dimensions and bindings
|-- theme.ts                  # palettes, fonts, type scale, and global styles
|-- ui.ts                     # local visual factories
|-- behaviors/                # reusable interaction behavior
`-- components/
    |-- navigation.ts         # persistent site navigation
    |-- home.ts               # product landing page
    |-- docs-shell.ts         # shared documentation page structure
    |-- guide-page.ts         # learning path
    `-- api-page.ts           # API reference
```

## Ownership

`app.ts` creates one layout value, one theme value, and one route value. Home, Guide, and API are created once and route changes only update their visibility. This preserves instance identity and avoids mounting separate applications.

`docs-shell.ts` owns the layout shared by Guide and API: left navigation, the main article, and an on-page outline. Each page owns only its content. `page-shell.ts` owns scrolling and scaling for every route.

`theme.ts` is the single source of truth for color and typography. One retained spring drives a shared palette, so every FrameKit surface and DOM-only color retargets together without overlapping animations. Components use semantic colors and a shared type scale. Interface and reading text use the same system sans stack; code uses the shared monospace stack.

## Conventions

- The playground consumes FrameKit; it does not add public package APIs.
- Factories start with `create`; behavior bindings start with `bind`.
- Desktop and mobile reuse the same instances.
- Light and dark mode update existing instances in place.
- Navigation uses local hash routes and remains usable without a framework router.
- Motion is used only when it helps explain an API or interaction.
