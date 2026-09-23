import { createNodeHandle, type InstanceProperties } from './instance.js';
import type {
  LayoutModifier,
  LayoutNodeState,
  ResolveLayout,
  ResolveStyles,
  StyleModifier,
  StyleModifierState,
  ValidateModifierTarget,
} from './modifier-types.js';
import { createBaseState, registerNode, type PropertyValidator } from './registry.js';

export type {
  LayoutChild,
  LayoutModifier,
  LayoutNodeState,
  LayoutStyles,
  Modifier,
  ModifierTarget,
  ResolveLayout,
  ResolveStyles,
  StyleModifier,
  StyleModifierState,
  ValidateModifierTarget,
} from './modifier-types.js';
export type { StyleProperty, Styles } from '../systems/style-output.js';

/** Creates an element-less modifier that styles its parent. */
export function createStyleModifier<Properties extends InstanceProperties>(
  className: string,
  properties: Properties,
  resolveStyles: ResolveStyles<Properties>,
  validateProperties?: PropertyValidator<Properties>,
  validateTarget?: ValidateModifierTarget<Properties>,
): StyleModifier<Properties> {
  const node = createNodeHandle(properties) as StyleModifier<Properties>;
  const state: StyleModifierState<Properties> = {
    ...createBaseState(className, properties, validateProperties),
    kind: 'style',
    resolveStyles,
    validateTarget,
  };
  registerNode(node, state);
  return node;
}

/** Creates an element-less modifier that lays out its parent's children. */
export function createLayoutModifier<Properties extends InstanceProperties>(
  className: string,
  properties: Properties,
  resolveLayout: ResolveLayout<Properties>,
  validateProperties?: PropertyValidator<Properties>,
): LayoutModifier<Properties> {
  const node = createNodeHandle(properties) as LayoutModifier<Properties>;
  const state: LayoutNodeState<Properties> = {
    ...createBaseState(className, properties, validateProperties),
    kind: 'layout',
    resolveLayout,
  };
  registerNode(node, state);
  return node;
}
