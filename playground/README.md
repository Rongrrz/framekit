# Playground architecture

The playground is one persistent FrameKit hierarchy. Desktop and mobile never create separate component trees; the same instances receive layout-specific properties through one `PlaygroundLayout` value.

```text
playground/
├── src/
│   ├── main.ts              # mounts the app and reads local preview options
│   ├── app.ts               # composes the six page sections
│   ├── layout.ts            # breakpoints, geometry, and responsive property binding
│   ├── page-shell.ts        # canvas scaling, scrolling, and section navigation
│   ├── section.ts           # responsive section and heading structure
│   ├── ui.ts                # playground-specific text, button, and code factories
│   ├── theme.ts             # visual tokens and ambient motion styles
│   ├── behaviors/           # reusable interaction behavior and cleanup
│   └── components/          # page sections and stateful child components
├── tests/                   # composition, interaction, and responsive layout coverage
├── index.html               # browser entry point
├── tsconfig.json            # playground TypeScript boundary
└── vite.config.ts           # development, build, and test configuration
```

## Ownership

`src/app.ts` is the composition root. It owns the responsive mode and creates each section once. `src/page-shell.ts` owns continuous canvas scaling and scroll navigation. `src/layout.ts` owns the two sets of geometry and the small binding helper that applies them to existing instances.

Page sections own their copy, composition, and interactive scene:

- `hero.ts` owns the cursor-driven motion field and its retained trail.
- `motion.ts` owns the spring reactor and its selectable physics profiles.
- `modifiers.ts` owns the three independent motion scenes.
- `api.ts` owns the interactive one-call motion grammar.
- `lifecycle.ts` owns the animated resource teardown and rebuild.

There is deliberately no `shared/` folder. Reusable code is stored with a specific responsibility: interaction under `behaviors/`, visual factories in `ui.ts`, responsive geometry in `layout.ts`, and section structure in `section.ts`.

## Conventions

- Factories start with `create`; event behavior starts with `bind`.
- Components accept the shared layout value only when their geometry changes by breakpoint.
- Components watch state in place; they do not recreate subtrees to update the UI.
- Desktop and mobile properties stay beside the instance they affect.
- Component modules use explicit imports and expose one primary factory. There are no barrels.
- The playground is a consumer of the package, not a second public API.
