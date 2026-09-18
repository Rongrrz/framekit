/**
 * Start here for the public API: core/, animation/, and helpers/ own each namespace.
 *
 * Core owns nodes and their DOM lifecycle. Animation uses that same property path, while helpers
 * compose optional behavior from the public building blocks. The tests/ directory mirrors these
 * ownership boundaries.
 */
/** Core nodes, values, hierarchy, state, and events. */
export * as fk from './core/index.js';

/** Springs, tweens, easing, and animation controllers. */
export * as fka from './animation/index.js';

/** Optional helpers that compose opinionated UI behavior. */
export * as fkh from './helpers/index.js';
