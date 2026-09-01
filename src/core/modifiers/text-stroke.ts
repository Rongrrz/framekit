import {
  textStrokeColorProperty,
  textStrokeContentProperty,
  textStrokeWidthProperty,
} from '../../shared/dom/text-stroke';
import {
  createStyleModifier,
  type StyleModifier,
  type Styles,
} from '../../shared/runtime/modifier';
import type { InstanceProperties } from '../../shared/runtime/node';
import { mergeProperties } from '../../shared/runtime/node-state';
import {
  assertBoolean,
  assertFiniteNumber,
  assertNonNegativeFinite,
} from '../../shared/runtime/validation';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

/** Properties for an outline drawn around a GUI parent's text. */
export type UITextStrokeProperties = InstanceProperties & {
  /** Whether the modifier currently affects its parent. */
  Enabled: boolean;
  /** Text outline color before transparency is applied. */
  Color: Color3;
  /** Text outline transparency from 0 (opaque) to 1 (invisible). */
  Transparency: number;
  /** Text outline thickness in pixels. */
  Thickness: number;
};

/** An element-less text-outline modifier. */
export type UITextStroke = StyleModifier<UITextStrokeProperties>;

/** Creates an outline behind a TextLabel or TextButton's rendered text. */
export function createUITextStroke(initial: Partial<UITextStrokeProperties> = {}): UITextStroke {
  return createStyleModifier(
    'UITextStroke',
    mergeProperties(
      {
        Name: 'UITextStroke',
        Enabled: true,
        Color: color3FromRGB(0, 0, 0),
        Transparency: 0,
        Thickness: 1,
      },
      initial,
    ),
    resolveTextStrokeStyles,
    validateTextStrokeProperties,
  );
}

function resolveTextStrokeStyles(
  properties: Readonly<UITextStrokeProperties>,
  targetProperties: Readonly<InstanceProperties>,
): Styles {
  if (!('Text' in targetProperties) || 'MultiLine' in targetProperties) {
    throw new TypeError('UITextStroke must be attached to a TextLabel or TextButton.');
  }
  if (!properties.Enabled) return {};

  return {
    [textStrokeColorProperty]: color3ToCss(properties.Color, properties.Transparency),
    [textStrokeContentProperty]: 'attr(data-framekit-text-content)',
    [textStrokeWidthProperty]: `${properties.Thickness}px`,
  };
}

function validateTextStrokeProperties(properties: Readonly<UITextStrokeProperties>): void {
  assertBoolean(properties.Enabled, 'Enabled');
  assertColor3(properties.Color, 'Color');
  assertFiniteNumber(properties.Transparency, 'Transparency');
  assertNonNegativeFinite(properties.Thickness, 'Thickness');
}
