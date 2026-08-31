# Playground architecture

The playground is an API-first guide built as one persistent FrameKit hierarchy. Desktop and mobile share the same component instances, and light and dark mode update those instances in place.

```text
playground/
|-- src/
|   |-- main.ts              # mounts the app and reads local preview options
|   |-- app.ts               # composes the three page sections and shared state
|   |-- layout.ts            # breakpoints, geometry, and responsive property binding
|   |-- page-shell.ts        # canvas scaling, native scrolling, and section navigation
|   |-- section.ts           # responsive section structure
|   |-- ui.ts                # playground-specific text, button, and code factories
|   |-- theme.ts             # palettes, theme binding, and document-level styles
|   |-- behaviors/           # reusable interaction behavior and cleanup
|   |-- links.ts             # source and guide destinations
|   `-- components/          # hero, API guide, navigation, and footer
|-- tests/                   # composition, theme, and responsive layout coverage
|-- index.html               # browser entry point
|-- tsconfig.json            # playground TypeScript boundary
`-- vite.config.ts           # development, build, and test configuration
```

## Ownership

`src/app.ts` is the composition root. It owns the responsive layout value and theme value, then creates every section once. `src/page-shell.ts` owns continuous canvas scaling, the styled native scrollbar, and section navigation. `src/layout.ts` owns desktop and mobile geometry and the small binding helper that applies it to existing instances.

`src/theme.ts` is the single source of truth for color. Components bind semantic tokens such as `surface`, `text`, or `accent` to the shared theme value instead of containing theme branches. It also keeps the document background, browser theme color, and saved preference in sync.

The page deliberately has only three content sections:

- `hero.ts` explains the object model and previews `TextScaled` in the real API.
- `guide.ts` teaches create, change, connect, and cleanup before introducing optional APIs.
- `footer.ts` points to the current README guide and provides the install command.

`src/links.ts` owns the guide destination. It currently targets the repository README and can move to a dedicated documentation site without changing component code.

There is deliberately no `shared/` folder. Reusable code is stored with a specific responsibility: interaction under `behaviors/`, visual factories in `ui.ts`, responsive geometry in `layout.ts`, and section structure in `section.ts`.

## Conventions

- Factories start with `create`; event behavior starts with `bind`.
- Components accept the shared layout value only when their geometry changes by breakpoint.
- Components bind to shared state in place; they do not recreate subtrees to update the UI.
- Theme-aware properties use semantic tokens rather than direct light/dark checks.
- Desktop and mobile properties stay beside the instance they affect.
- Component modules use explicit imports and expose one primary factory. There are no barrels.
- The playground is a consumer of the package, not a second public API.
