import { createGuiNode, type GuiNode, type Render } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { udim2FromOffset, udimToCss, type UDim2 } from '../values/udim';
import { vector2, type Vector2 } from '../values/vector2';

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

export function createFrame(initial: Partial<FrameProps> = {}): FrameNode {
  return createFrameNode('Frame', document.createElement('div'), defaultFrameProps(), initial);
}

export function defaultFrameProps(): FrameProps {
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

/** Builds controls that share Frame's positioning and appearance properties. */
export function createFrameNode<Props extends FrameProps>(
  kind: string,
  element: HTMLElement,
  defaults: Props,
  initial: Partial<Props>,
  renderExtra?: Render<Props>,
): GuiNode<Props> {
  element.dataset.framekit = kind;
  Object.assign(element.style, { position: 'absolute', boxSizing: 'border-box' });
  return createGuiNode(mergeProps(defaults, initial), element, (props, changed) => {
    renderFrame(element, props);
    renderExtra?.(props, changed);
  });
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
