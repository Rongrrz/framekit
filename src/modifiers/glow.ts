import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { color3, color3ToCss, type Color3 } from '../values/color3';

export type UIGlowProps = NodeProps & {
  Enabled: boolean;
  Color: Color3;
  Transparency: number;
  Radius: number;
};

export type UIGlowNode = StyleModifierNode<UIGlowProps>;

/** Creates an even glow around its GUI parent. */
export function createUIGlow(initial: Partial<UIGlowProps> = {}): UIGlowNode {
  return createStyleModifier(
    'UIGlow',
    mergeProps(
      {
        Name: 'UIGlow',
        Enabled: true,
        Color: color3(255, 255, 255),
        Transparency: 0.35,
        Radius: 18,
      },
      initial,
    ),
    (props): Styles => (props.Enabled ? { filter: resolveGlow(props) } : {}),
  );
}

function resolveGlow(props: Readonly<UIGlowProps>): string {
  if (!Number.isFinite(props.Radius) || props.Radius < 0) {
    throw new TypeError('Radius must be a non-negative finite number.');
  }
  const opacity = 1 - clamp(props.Transparency, 0, 1);
  const coreTransparency = 1 - Math.min(1, opacity * 1.25);
  const haloTransparency = 1 - opacity * 0.5;
  const coreRadius = props.Radius * 0.35;
  return [
    `drop-shadow(0px 0px ${coreRadius}px ${color3ToCss(props.Color, coreTransparency)})`,
    `drop-shadow(0px 0px ${props.Radius}px ${color3ToCss(props.Color, haloTransparency)})`,
  ].join(' ');
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
