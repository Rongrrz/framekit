import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertBoolean, assertNonNegativeFinite } from '#internal/validation.js';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '#values/color3.js';

/** Keyboard focus decoration inherited by the parent and its GUI descendants. */
export type UIFocusRingProperties = InstanceProperties & {
  /** Disabling reveals the ancestor's focus ring or the browser default. */
  Enabled: boolean;
  Color: Color3;
  /** Outline thickness in pixels; zero suppresses the outline. */
  Thickness: number;
  /** Distance from the focused object's edge in pixels. */
  Offset: number;
};

/** An element-less focus decoration; it never changes keyboard focus behavior. */
export type UIFocusRing = StyleModifier<UIFocusRingProperties>;

/** Sets a keyboard focus ring for a subtree. A closer modifier overrides an ancestor's ring. */
export function createUIFocusRing(
  initialProperties: Partial<UIFocusRingProperties> = {},
): UIFocusRing {
  return createStyleModifier(
    'UIFocusRing',
    mergeProperties(
      {
        Name: 'UIFocusRing',
        Enabled: true,
        Color: color3FromRGB(0, 120, 215),
        Thickness: 2,
        Offset: 3,
      },
      initialProperties,
    ),
    resolveFocusRingStyles,
    validateFocusRingProperties,
  );
}

function resolveFocusRingStyles(properties: Readonly<UIFocusRingProperties>): Styles {
  return properties.Enabled
    ? {
        '--framekit-focus-outline': `${properties.Thickness}px solid ${color3ToCss(properties.Color)}`,
        '--framekit-focus-offset': `${properties.Offset}px`,
      }
    : {};
}

function validateFocusRingProperties(properties: Readonly<UIFocusRingProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertColor3(properties.Color, 'Color');
  assertNonNegativeFinite(properties.Thickness, 'Thickness');
  assertNonNegativeFinite(properties.Offset, 'Offset');
}
