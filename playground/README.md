# Playground architecture

The playground has two intentional presentations of the same product story. Desktop and mobile share visual tokens and interaction behavior, but each owns its composition and geometry. This keeps the phone experience purpose-built instead of turning the desktop canvas into a pile of breakpoint branches.

```text
playground/
├── main.ts                  # selects and mounts one device application
├── theme.ts                 # shared colors and typography
├── shared/
│   ├── interaction.ts       # reusable hover, button, card, and copy behavior
│   ├── modifier.ts          # modifier attachment semantics
│   ├── page-shell.ts        # responsive scaling and spring scrolling
│   └── ui.ts                # small visual constructors
├── desktop/
│   ├── app.ts               # desktop section composition
│   ├── geometry.ts          # desktop-only scale helpers
│   ├── layout.ts            # dimensions and vertical section map
│   └── sections/            # one module per desktop section
└── mobile/
    ├── app.ts               # mobile section composition
    ├── layout.ts            # dimensions and vertical section map
    ├── primitives.ts        # mobile-only section structure
    └── sections/            # one module per mobile section
```

## Dependency direction

Dependencies flow down the hierarchy:

```text
main → device app → device section → device primitives / shared → theme / framekit
```

Sections never import other sections. The application root is the only place that knows their order. Shared modules never import desktop or mobile code. That makes every section independently readable and prevents circular feature dependencies.

## Module ownership

- `main.ts` owns device selection and mounting only.
- Each `app.ts` owns section order and navigation wiring only.
- Each section owns its nodes, local example data, shared values, and event bindings.
- Device `layout.ts` files are the single source of truth for design width, content width, page height, and section offsets.
- Device primitives contain patterns that are repeated within one presentation but would be dishonest to call cross-device abstractions.
- `shared` accepts code only after both device applications genuinely need the same behavior.

## Naming rules

- Factories start with `create`: `createHero`, `createSection`, `createScaledPageShell`.
- Event behavior starts with `bind`: `bindButtonMotion`, `bindCardMotion`.
- Direct synchronization starts with `set`: `setModifierAttached`.
- Layout values describe their role: `designWidth`, `contentWidth`, `pageHeight`, `sectionLayout`.
- Directory scope removes redundant prefixes. Inside `mobile/sections/hero.ts`, `createHero` is clearer than `createMobileHeroSection`.

## Export rules

Section modules expose one primary factory. Device applications use explicit file imports rather than an internal barrel, so the composition root remains searchable and tree ownership stays visible. The playground does not create a second public API; only the package root defines FrameKit's consumer-facing exports.

## Adding a section

1. Add its metrics to the device's `sectionLayout`.
2. Create one file in that device's `sections` directory.
3. Export one section factory and keep its state local.
4. Import it and add it to the device tree in `app.ts`.
5. Share a helper only when both presentations need the same semantics.

This structure optimizes for locality first, reuse second, and abstraction only when the repeated concept has a stable name.
