/**
 * The primary FrameKit namespace.
 *
 * Core remains independent from animation; this facade adds the concise spring entry point
 * without reversing that dependency.
 */
export * from './core';
export { spring } from './animation/spring';
export type { SpringController, SpringOptions } from './animation/spring-controller';
