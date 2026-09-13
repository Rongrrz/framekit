/**
 * Start here for the public API: core.ts, animation.ts, and helpers.ts list each namespace.
 *
 * A GUI factory composes core/gui-object.ts with the node system to create and register a
 * handle. Node properties commit updates, RenderService applies them, the tree owns attachment,
 * and DestroyService releases descendants and resources. TweenService and SpringService use
 * that same property path. The tests/ directory mirrors these modules.
 */
/** Core nodes, values, hierarchy, state, and events. */
export * as fk from './core';

/** Springs, tweens, easing, and animation controllers. */
export * as fka from './animation';

/** Optional helpers that compose opinionated UI behavior. */
export * as fkh from './helpers';
