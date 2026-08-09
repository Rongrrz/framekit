import { node, type GuiNode, type NodeProps, type Render } from '../core/node';
import { color3, color3ToCss, type Color3 } from '../primitives/color3';
import { udim2FromOffset, type UDim2 } from '../primitives/udim2';
import { vector2, type Vector2 } from '../primitives/vector2';
import { udimToCss } from '../rendering/dom';

export type AutomaticSize = 'None' | 'X' | 'Y' | 'XY';

export type FrameProps = NodeProps & {
  Size: UDim2;
  Position: UDim2;
  AnchorPoint: Vector2;
  Visible: boolean;
  BackgroundColor3: Color3;
  BackgroundTransparency: number;
  ZIndex: number;
  LayoutOrder: number;
  AutomaticSize: AutomaticSize;
  ClipsDescendants: boolean;
};

export type FrameNode = GuiNode<FrameProps>;

export function frameDefaults(): FrameProps {
  return {
    Name: 'Frame',
    Size: udim2FromOffset(100, 100),
    Position: udim2FromOffset(0, 0),
    AnchorPoint: vector2(0, 0),
    Visible: true,
    BackgroundColor3: color3(200, 200, 200),
    BackgroundTransparency: 0,
    ZIndex: 1,
    LayoutOrder: 0,
    AutomaticSize: 'None',
    ClipsDescendants: false,
  };
}

/** Shared factory primitive for frame-derived controls. */
export function frameNode<Props extends FrameProps>(
  kind: string,
  element: HTMLElement,
  defaults: Props,
  initial: Partial<Props>,
  renderExtra?: Render<Props>,
): GuiNode<Props> {
  element.dataset.framekit = kind;
  Object.assign(element.style, { position: 'absolute', boxSizing: 'border-box' });
  const handle = node({ ...defaults, ...initial }, element, (props, changed) => {
    renderFrame(element, props);
    renderExtra?.(props, changed);
  });
  return handle;
}

function renderFrame(element: HTMLElement, props: Readonly<FrameProps>): void {
  element.style.position = 'absolute';
  element.style.width =
    props.AutomaticSize === 'X' || props.AutomaticSize === 'XY' ? 'auto' : udimToCss(props.Size.X);
  element.style.height =
    props.AutomaticSize === 'Y' || props.AutomaticSize === 'XY' ? 'auto' : udimToCss(props.Size.Y);
  element.style.left = udimToCss(props.Position.X);
  element.style.top = udimToCss(props.Position.Y);
  element.style.transform = `translate(${-props.AnchorPoint.X * 100}%, ${-props.AnchorPoint.Y * 100}%)`;
  element.style.display = props.Visible ? '' : 'none';
  element.style.backgroundColor = color3ToCss(props.BackgroundColor3, props.BackgroundTransparency);
  element.style.zIndex = String(props.ZIndex);
  element.style.overflow = props.ClipsDescendants ? 'hidden' : 'visible';
}
