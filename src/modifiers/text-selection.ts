import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertBoolean } from '#internal/validation.js';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '#values/color3.js';

/** Native text-selection colors inherited by the parent and its descendants. */
export type UITextSelectionProperties = InstanceProperties & {
  /** Disabling reveals an ancestor's selection colors or the browser defaults. */
  Enabled: boolean;
  TextColor3: Color3;
  BackgroundColor3: Color3;
};

/** An element-less decoration for selectable text; selection behavior stays native. */
export type UITextSelection = StyleModifier<UITextSelectionProperties>;

/** Sets selection colors for a subtree without changing which text is selectable. */
export function createUITextSelection(
  initialProperties: Partial<UITextSelectionProperties> = {},
): UITextSelection {
  return createStyleModifier(
    'UITextSelection',
    mergeProperties(
      {
        Name: 'UITextSelection',
        Enabled: true,
        TextColor3: color3FromRGB(255, 255, 255),
        BackgroundColor3: color3FromRGB(0, 120, 215),
      },
      initialProperties,
    ),
    resolveTextSelection,
    validateTextSelection,
  );
}

function resolveTextSelection(properties: Readonly<UITextSelectionProperties>): Styles {
  return properties.Enabled
    ? {
        '--framekit-selection-text': color3ToCss(properties.TextColor3),
        '--framekit-selection-background': color3ToCss(properties.BackgroundColor3),
      }
    : {};
}

function validateTextSelection(properties: Readonly<UITextSelectionProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertColor3(properties.TextColor3, 'TextColor3');
  assertColor3(properties.BackgroundColor3, 'BackgroundColor3');
}
