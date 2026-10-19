import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertPositiveFinite } from '#internal/validation.js';

/** Opts a list child into sharing spare space along the list's fill direction. */
export type UIFlexItemProperties = InstanceProperties & {
  /** Relative share of spare space added to Size. Equal weights share equally. */
  Weight: number;
};

/** An element-less modifier for a flexible child of a UIListLayout. */
export type UIFlexItem = StyleModifier<UIFlexItemProperties>;

/** Uses Size as the preferred size, sharing spare space and shrinking to fit when needed. */
export function createUIFlexItem(
  initialProperties: Partial<UIFlexItemProperties> = {},
): UIFlexItem {
  return createStyleModifier(
    'UIFlexItem',
    mergeProperties({ Name: 'UIFlexItem', Weight: 1 }, initialProperties),
    resolveFlexItem,
    (properties) => assertPositiveFinite(properties.Weight, 'UIFlexItem Weight'),
  );
}

function resolveFlexItem(properties: Readonly<UIFlexItemProperties>): Styles {
  return { 'flex-grow': String(properties.Weight), 'flex-shrink': '1' };
}
