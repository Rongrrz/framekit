import { node, type GuiNode, type NodeProps, type Render } from '../core/node';
import { Color3 } from '../primitives/Color3';
import { UDim2 } from '../primitives/UDim2';
import { Vector2 } from '../primitives/Vector2';
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
  AutomaticSize: AutomaticSize;
  ClipsDescendants: boolean;
  BorderSizePixel: number;
  BorderColor3: Color3;
  CornerRadius: number;
};

export type FrameNode = GuiNode<FrameProps>;

export function frameDefaults(): FrameProps {
  return {
    Name: 'Frame',
    Size: UDim2.fromOffset(100, 100),
    Position: UDim2.fromOffset(0, 0),
    AnchorPoint: new Vector2(0, 0),
    Visible: true,
    BackgroundColor3: Color3.fromRGB(200, 200, 200),
    BackgroundTransparency: 0,
    ZIndex: 1,
    AutomaticSize: 'None',
    ClipsDescendants: false,
    BorderSizePixel: 0,
    BorderColor3: Color3.fromRGB(0, 0, 0),
    CornerRadius: 0,
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
  return handle as GuiNode<Props>;
}

function renderFrame(element: HTMLElement, props: Readonly<FrameProps>): void {
  element.style.width =
    props.AutomaticSize === 'X' || props.AutomaticSize === 'XY' ? 'auto' : udimToCss(props.Size.X);
  element.style.height =
    props.AutomaticSize === 'Y' || props.AutomaticSize === 'XY' ? 'auto' : udimToCss(props.Size.Y);
  element.style.left = udimToCss(props.Position.X);
  element.style.top = udimToCss(props.Position.Y);
  element.style.transform = `translate(${-props.AnchorPoint.X * 100}%, ${-props.AnchorPoint.Y * 100}%)`;
  element.style.display = props.Visible ? '' : 'none';
  element.style.backgroundColor = props.BackgroundColor3.toCSS(props.BackgroundTransparency);
  element.style.zIndex = String(props.ZIndex);
  element.style.overflow = props.ClipsDescendants ? 'hidden' : 'visible';
  element.style.borderStyle = props.BorderSizePixel > 0 ? 'solid' : 'none';
  element.style.borderWidth = `${Math.max(0, props.BorderSizePixel)}px`;
  element.style.borderColor = props.BorderColor3.toCSS();
  element.style.borderRadius = `${Math.max(0, props.CornerRadius)}px`;
}
