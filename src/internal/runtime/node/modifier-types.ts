import type { Styles } from '../systems/style-output.js';
import type { Instance, InstanceProperties } from './instance.js';
import type { BaseNodeState, GuiCapabilities, GuiNodeState } from './registry.js';

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
