/**
 * Start here for the public API: core.ts, animation.ts, and helpers.ts list each namespace.
 *
 * A GUI factory composes core/gui-object.ts with runtime/gui-node.ts to create and register a
 * handle. Runtime node-properties.ts commits updates, render.ts applies them, tree.ts owns
 * attachment, and node-lifecycle.ts releases descendants and resources. Browser input and
 * animations use that same property path. The tests/ directory mirrors these modules.
 */
/** Core nodes, values, hierarchy, state, and events. */
export * as fk from './core';

/** Springs, tweens, easing, and animation controllers. */
export * as fka from './animation';

/** Optional helpers that compose opinionated UI behavior. */
export * as fkh from './helpers';
