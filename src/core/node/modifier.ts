import { createNodeHandle, type Instance, type InstanceProperties } from './instance';
import {
  createBaseState,
  registerNode,
  type BaseNodeState,
  type GuiCapabilities,
  type GuiNodeState,
  type PropertyValidator,
} from './state';
import type { Styles } from './style-output';

export type { StyleProperty, Styles } from './style-output';

declare const styleModifierBrand: unique symbol;
declare const layoutBrand: unique symbol;

/** The stable rendering surface exposed to an attached modifier. */
export type ModifierTarget = Readonly<{
  properties: Readonly<InstanceProperties>;
  capabilities: GuiCapabilities;
}>;

/** An element-less instance that styles its GUI parent. */
export type StyleModifier<Properties extends InstanceProperties = InstanceProperties> =
  Instance<Properties> & {
    readonly [styleModifierBrand]: true;
  };

/** An element-less instance that lays out its GUI parent's direct children. */
export type LayoutModifier<Properties extends InstanceProperties = InstanceProperties> =
  Instance<Properties> & {
    readonly [layoutBrand]: true;
  };

export type ResolveStyles<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
  target: ModifierTarget,
) => Styles;

export type ValidateModifierTarget<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
  target: ModifierTarget,
) => void;

export type LayoutChild = Readonly<{
  Name: string;
  LayoutOrder: number;
}>;

export type LayoutStyles = Readonly<{
  parent: Styles;
  children: readonly Styles[];
}>;

export type ResolveLayout<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
  children: readonly LayoutChild[],
) => LayoutStyles;

export type StyleModifierState<Properties extends InstanceProperties = InstanceProperties> =
  BaseNodeState<Properties> & {
    kind: 'style';
    resolveStyles: ResolveStyles<Properties>;
    validateTarget: ValidateModifierTarget<Properties> | undefined;
  };

export type LayoutNodeState<Properties extends InstanceProperties = InstanceProperties> =
  BaseNodeState<Properties> & {
    kind: 'layout';
    resolveLayout: ResolveLayout<Properties>;
  };

export type Modifier = StyleModifier | LayoutModifier;

export function getModifierTarget<Properties extends InstanceProperties>(
  state: GuiNodeState<Properties>,
): ModifierTarget {
  return { properties: state.properties, capabilities: state.capabilities };
}

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
