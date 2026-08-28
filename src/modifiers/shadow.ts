import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProps, type NodeProps } from '../runtime/state';
import { assertBoolean, assertFiniteNumber, assertNonNegativeFinite } from '../runtime/validation';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';

export type UIShadowProps = NodeProps & {
  Enabled: boolean;
  Color: Color3;
  Transparency: number;
  Offset: Vector2;
  BlurRadius: number;
  SpreadRadius: number;
  Inset: boolean;
};

export type UIShadowNode = StyleModifierNode<UIShadowProps>;

/** Creates a drop-shadow modifier that composes with strokes and glows. */
export function createUIShadow(initial: Partial<UIShadowProps> = {}): UIShadowNode {
  return createStyleModifier(
    'UIShadow',
    mergeProps(
      {
        Name: 'UIShadow',
        Enabled: true,
        Color: color3(0, 0, 0),
        Transparency: 0.5,
        Offset: vector2(0, 8),
        BlurRadius: 16,
        SpreadRadius: 0,
        Inset: false,
      },
      initial,
    ),
    resolveShadowStyles,
  );
}

function resolveShadowStyles(props: Readonly<UIShadowProps>): Styles {
  assertBoolean(props.Enabled, 'Enabled');
  assertBoolean(props.Inset, 'Inset');
  return props.Enabled ? { 'box-shadow': resolveShadow(props) } : {};
}

function resolveShadow(props: Readonly<UIShadowProps>): string {
  assertVector2(props.Offset, 'Offset');
  assertNonNegativeFinite(props.BlurRadius, 'BlurRadius');
  assertFiniteNumber(props.SpreadRadius, 'SpreadRadius');
  const inset = props.Inset ? 'inset ' : '';
  return `${inset}${props.Offset.X}px ${props.Offset.Y}px ${props.BlurRadius}px ${props.SpreadRadius}px ${color3ToCss(props.Color, props.Transparency)}`;
}
