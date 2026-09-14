/**
 * Private seam for sibling FrameKit namespaces.
 *
 * This module is intentionally absent from the package exports. Helpers use it for the few core
 * extension hooks that are not part of the public `fk` namespace.
 */
export {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
  assertInteger,
  assertNonNegativeFinite,
  assertPositiveFinite,
  assertString,
} from './internal/validation';
export { createLayoutModifier, createStyleModifier } from './node/modifier';
export type {
  LayoutChild,
  LayoutStyles,
  ResolveLayout,
  ResolveStyles,
  StyleProperty,
  Styles,
} from './node/modifier';
export { assertUDim } from './values/udim';
