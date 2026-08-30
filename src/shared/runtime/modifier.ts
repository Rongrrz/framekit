import { createNodeHandle, type Instance, type InstanceProperties } from './node';
import {
  createBaseState,
  registerNode,
  type BaseNodeState,
  type PropertyValidator,
} from './node-state';

declare const styleModifierBrand: unique symbol;
declare const layoutBrand: unique symbol;

export type Styles = Readonly<Record<string, string>>;

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
  targetProperties: Readonly<InstanceProperties>,
) => Styles;

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
    modifierKey: string;
    resolveStyles: ResolveStyles<Properties>;
  };

export type LayoutNodeState<Properties extends InstanceProperties = InstanceProperties> =
  BaseNodeState<Properties> & {
    kind: 'layout';
    modifierKey: string;
    resolveLayout: ResolveLayout<Properties>;
  };

export type Modifier = StyleModifier | LayoutModifier;

/** Creates an element-less modifier that styles its parent. */
export function createStyleModifier<Properties extends InstanceProperties>(
  modifierKey: string,
  properties: Properties,
  resolveStyles: ResolveStyles<Properties>,
  validateProperties?: PropertyValidator<Properties>,
): StyleModifier<Properties> {
  const node = createNodeHandle(properties) as StyleModifier<Properties>;
  const state: StyleModifierState<Properties> = {
    ...createBaseState(modifierKey, properties, validateProperties),
    kind: 'style',
    modifierKey,
    resolveStyles,
  };
  registerNode(node, state);
  return node;
}

/** Creates an element-less modifier that lays out its parent's children. */
export function createLayoutModifier<Properties extends InstanceProperties>(
  modifierKey: string,
  properties: Properties,
  resolveLayout: ResolveLayout<Properties>,
  validateProperties?: PropertyValidator<Properties>,
): LayoutModifier<Properties> {
  const node = createNodeHandle(properties) as LayoutModifier<Properties>;
  const state: LayoutNodeState<Properties> = {
    ...createBaseState(modifierKey, properties, validateProperties),
    kind: 'layout',
    modifierKey,
    resolveLayout,
  };
  registerNode(node, state);
  return node;
}
