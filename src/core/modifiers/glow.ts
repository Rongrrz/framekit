import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import { mergeProperties, type NodeProperties } from '../../shared/runtime/node-state';
import { assertBoolean, assertNonNegativeFinite } from '../../shared/runtime/validation';
import { color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

/** Properties for a centered glow around a GUI parent. */
export type UIGlowProperties = NodeProperties & {
  /** Whether the modifier currently affects its parent. */
  Enabled: boolean;
  /** Glow color before transparency is applied. */
  Color: Color3;
  /** Glow transparency from 0 (opaque) to 1 (invisible). */
  Transparency: number;
  /** Radius of the soft outer halo in pixels. */
  Radius: number;
};

/** An element-less glow modifier. */
export type UIGlowNode = StyleModifierNode<UIGlowProperties>;

/** Creates an even glow around its GUI parent. */
export function createUIGlow(initial: Partial<UIGlowProperties> = {}): UIGlowNode {
  return createStyleModifier(
    'UIGlow',
    mergeProperties(
      {
        Name: 'UIGlow',
        Enabled: true,
        Color: color3FromRGB(255, 255, 255),
        Transparency: 0.35,
        Radius: 18,
      },
      initial,
    ),
    resolveGlowStyles,
  );
}

function resolveGlowStyles(properties: Readonly<UIGlowProperties>): Styles {
  assertBoolean(properties.Enabled, 'Enabled');
  return properties.Enabled ? { filter: resolveGlow(properties) } : {};
}

function resolveGlow(properties: Readonly<UIGlowProperties>): string {
  assertNonNegativeFinite(properties.Radius, 'Radius');
  const opacity = 1 - clamp(properties.Transparency, 0, 1);
  const coreTransparency = 1 - Math.min(1, opacity * 1.25);
  const haloTransparency = 1 - opacity * 0.5;
  const coreRadius = properties.Radius * 0.35;
  return [
    `drop-shadow(0px 0px ${coreRadius}px ${color3ToCss(properties.Color, coreTransparency)})`,
    `drop-shadow(0px 0px ${properties.Radius}px ${color3ToCss(properties.Color, haloTransparency)})`,
  ].join(' ');
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
