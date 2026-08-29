# Playground architecture

The playground has two intentional presentations of the same product story. Desktop and mobile share visual tokens and interaction behavior, but each owns its composition and geometry. This keeps the phone experience purpose-built instead of turning the desktop canvas into a pile of breakpoint branches.

```text
playground/
├── index.html               # playground-only browser entry point
├── main.ts                  # reads preview options and mounts the playground
├── responsive-app.ts        # owns persistent desktop/mobile layout switching
├── theme.ts                 # shared colors and typography
├── tsconfig.json            # isolated playground project references
├── tsconfig.app.json        # application and showcase test type checking
├── tsconfig.node.json       # playground tooling type checking
├── vite.config.ts           # playground development and production build
├── vitest.config.ts         # playground-only test discovery
├── shared/
│   ├── interaction.ts       # reusable hover, button, card, and copy behavior
│   ├── playground-app.ts    # shared section order and application composition
│   ├── page-shell.ts        # responsive scaling and spring scrolling
│   ├── section-layout.ts    # calculated section offsets and page height
│   └── ui.ts                # small visual constructors
├── features/
│   └── motion.ts            # shared motion modes and behavior; views own geometry
├── tests/
│   └── *.test.ts            # composition, behavior, and layout tests
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
main → responsive app → device app → device section → features / device primitives / shared → theme / framekit
```

Sections never import other sections. The application root is the only place that knows their order. Shared modules never import desktop or mobile code. That makes every section independently readable and prevents circular feature dependencies.

## Module ownership

- `main.ts` owns preview URL parsing and mounting only.
- `responsive-app.ts` creates both presentations once and switches them with `fkh.bindResponsiveLayout`.
- `shared/playground-app.ts` owns the common section order.
- Each `app.ts` supplies its shell metrics, section views, and navigation view.
- Each device section owns its nodes, geometry, and presentation-only behavior.
- Cross-device feature models and behavior live under `features`; device sections keep their own geometry and composition.
- Device `layout.ts` files list section heights; offsets and page height are derived automatically.
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

1. Add its height to each device's `sectionLayout`.
2. Create one file in that device's `sections` directory.
3. Export one section factory and keep its state local.
4. Import it and add it to the device tree in `app.ts`.
5. Put stable cross-device data or behavior under `features`; keep device-specific geometry in the section views.

This structure optimizes for locality first, reuse second, and abstraction only when the repeated concept has a stable name.
