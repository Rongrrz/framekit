import type { GuiEventMethodTable } from '../runtime/gui-events';
import { createGuiNode, type GuiNode, type PropertyRenderer } from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
  assertInteger,
} from '../runtime/validation';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { udim2FromOffset, udimToCss, type UDim2 } from '../values/udim';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';
import { connectHoverEvents } from './hover-events';

export type AutomaticSize = 'None' | 'X' | 'Y' | 'XY';

export type FrameProps = NodeProps & {
  Size: UDim2;
  Position: UDim2;
  AnchorPoint: Vector2;
  Rotation: number;
  Visible: boolean;
  BackgroundColor3: Color3;
  BackgroundTransparency: number;
  ZIndex: number;
  LayoutOrder: number;
  AutomaticSize: AutomaticSize;
  ClipsDescendants: boolean;
};

export type FrameNode = GuiNode<FrameProps>;

const automaticSizes: readonly AutomaticSize[] = ['None', 'X', 'Y', 'XY'];

export function createFrame(initial: Partial<FrameProps> = {}): FrameNode {
  return createFrameBasedNode(
    'Frame',
    document.createElement('div'),
    createDefaultFrameProps(),
    initial,
  );
}

export function createDefaultFrameProps(): FrameProps {
  return {
    Name: 'Frame',
    Size: udim2FromOffset(100, 100),
    Position: udim2FromOffset(0, 0),
    AnchorPoint: vector2(0, 0),
    Rotation: 0,
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
export function createFrameBasedNode<Props extends FrameProps>(
  nodeType: string,
  element: HTMLElement,
  defaultProps: Props,
  initial: Partial<Props>,
  renderAdditionalProperties?: PropertyRenderer<Props>,
  eventMethods?: GuiEventMethodTable,
): GuiNode<Props> {
  element.dataset.framekit = nodeType;
  Object.assign(element.style, { position: 'absolute', boxSizing: 'border-box' });
  const node = createGuiNode(
    mergeProps(defaultProps, initial),
    element,
    (props, changed) => {
      renderFrame(element, props);
      renderAdditionalProperties?.(props, changed);
    },
    eventMethods,
  );
  connectHoverEvents(node, element);
  return node;
}

function renderFrame(element: HTMLElement, props: Readonly<FrameProps>): void {
  assertAllowedValue(props.AutomaticSize, automaticSizes, 'AutomaticSize');
  assertVector2(props.AnchorPoint, 'AnchorPoint');
  assertFiniteNumber(props.Rotation, 'Rotation');
  assertBoolean(props.Visible, 'Visible');
  assertInteger(props.ZIndex, 'ZIndex');
  assertBoolean(props.ClipsDescendants, 'ClipsDescendants');
  element.style.position = 'absolute';
  element.style.width =
    props.AutomaticSize === 'X' || props.AutomaticSize === 'XY' ? 'auto' : udimToCss(props.Size.X);
  element.style.height =
    props.AutomaticSize === 'Y' || props.AutomaticSize === 'XY' ? 'auto' : udimToCss(props.Size.Y);
  element.style.left = udimToCss(props.Position.X);
  element.style.top = udimToCss(props.Position.Y);
  element.style.transform = `translate(${-props.AnchorPoint.X * 100}%, ${-props.AnchorPoint.Y * 100}%)`;
  element.style.setProperty('rotate', `${props.Rotation}deg`);
  element.style.display = props.Visible ? '' : 'none';
  element.style.backgroundColor = color3ToCss(props.BackgroundColor3, props.BackgroundTransparency);
  element.style.zIndex = String(props.ZIndex);
  element.style.overflow = props.ClipsDescendants ? 'hidden' : 'visible';
}
