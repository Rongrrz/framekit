# Playground architecture

The playground is one persistent FrameKit hierarchy. Desktop and mobile do not have separate component implementations; viewport changes update the layout of the same nodes through one shared `PlaygroundLayout` value.

```text
playground/
├── main.ts                  # reads preview options and mounts the app
├── app.ts                   # composes the hierarchy and owns responsive mode
├── layout.ts                # breakpoint, scale, and section geometry
├── page-shell.ts            # scaling, scrolling, and navigation mechanics
├── section.ts               # shared section structure
├── theme.ts                 # colors and typography
├── components/              # one factory per responsive playground section
├── features/                # behavior shared by multiple components
├── shared/                  # small UI and interaction building blocks
└── tests/                   # composition, behavior, and layout coverage
```

## Dependency direction

```text
main → app → components → features / shared → theme / framekit
```

`app.ts` is the only composition root. It creates a `PlaygroundLayout` value and updates it with `fkh.bindResponsiveLayout`. Components that need a discrete layout change watch that value; continuous page scaling remains in `page-shell.ts` because it must respond to every viewport width.

Components do not import one another. Each component owns its nodes, local state, interactions, and responsive property changes. Shared modules stay small and only contain behavior used by multiple components.

## Conventions

- Factories start with `create`: `createHero`, `createSection`, `createScaledPageShell`.
- Event behavior starts with `bind`: `bindButtonMotion`, `bindCardMotion`.
- Direct synchronization starts with `set`: `setModifierAttached`.
- Component modules expose one primary factory and use explicit imports instead of barrels.
- The playground is not a second package API; only the FrameKit package root defines public exports.

## Adding a component

1. Add its height to `sectionLayout` when it occupies a page section.
2. Add one factory under `components/`.
3. Keep its state and responsive property changes in that module.
4. Compose it once in `app.ts`.
5. Move behavior into `features/` or `shared/` only after another component genuinely needs it.
