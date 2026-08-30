# Playground architecture

The playground is one persistent FrameKit hierarchy. Desktop and mobile do not have separate component implementations; viewport changes update the layout of the same nodes through one shared `PlaygroundLayout` value.

```text
playground/
├── main.ts                  # reads preview options and mounts the app
├── app.ts                   # composes the hierarchy and owns responsive mode
├── layout.ts                # breakpoint, scale, and section geometry
├── page-shell.ts            # scaling, scrolling, and navigation mechanics
├── section.ts               # common page-section structure
├── section-layout.ts        # derives section offsets from ordered heights
├── ui.ts                    # playground-specific text, button, and code factories
├── theme.ts                 # colors and typography
├── behaviors/               # reusable copy and hover behavior with lifecycle cleanup
├── components/              # page sections and their substantial child components
└── tests/                   # composition, behavior, and layout coverage
```

## Dependency direction

```text
main → app → section component → owned child component → behaviors / ui → framekit
```

`app.ts` is the only composition root. It creates a `PlaygroundLayout` value and updates it with `fkh.bindResponsiveLayout`. Components that need a discrete layout change watch that value; continuous page scaling remains in `page-shell.ts` because it must respond to every viewport width.

A page section may import a substantial child component that it owns, such as `hero.ts` importing `hero-preview.ts`. Unrelated sections do not import one another. Small sections stay in one file; extracting every card or label would only add navigation.

There is deliberately no `shared/` folder. Reusable code is grouped by what it owns instead:

- `behaviors/` owns reusable interaction and cleanup behavior.
- `ui.ts` owns the playground's small visual factory vocabulary.
- `section.ts` owns the repeated page-section shell.
- `section-layout.ts` owns the pure offset calculation.
- `theme.ts` owns visual tokens.

## Conventions

- Factories start with `create`: `createHero`, `createHeroPreview`, `createPageShell`.
- Event behavior starts with `bind`: `bindButtonMotion`, `bindCardMotion`.
- Direct synchronization starts with `set`: `setModifierAttached`.
- Component modules expose one primary factory and use explicit imports instead of barrels.
- The playground is not a second package API; only the FrameKit package root defines public exports.

## Adding a component

1. Add its height to `sectionLayout` when it occupies a page section.
2. Add one factory under `components/`.
3. Keep its state and responsive property changes in that module.
4. Compose it once in `app.ts`.
5. Extract a child component only when it owns meaningful state, behavior, or a substantial subtree.
6. Move repeated behavior into the smallest accurately named owner; do not create catch-all folders.
