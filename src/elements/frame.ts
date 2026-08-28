import type { GuiEventMethodTable } from '../runtime/gui-events';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { createGuiNode, type GuiNode, type PropertyRenderer } from '../runtime/render';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
  assertInteger,
} from '../runtime/validation';
import { color3FromRGB, color3ToCss, type Color3 } from '../values/color3';
import { udim2FromOffset, udimToCss, type UDim2 } from '../values/udim';
import { assertVector2, vector2, type Vector2 } from '../values/vector2';
import { connectHoverEvents } from './hover-events';

/** Axes whose size should follow the rendered content. */
export type AutomaticSize = 'None' | 'X' | 'Y' | 'XY';

/** Layout and appearance properties shared by rectangular GUI nodes. */
export type FrameProperties = NodeProperties & {
  /** Width and height relative to the parent. */
  Size: UDim2;
  /** Position relative to the parent. */
  Position: UDim2;
  /** Normalized point on this node placed at Position. */
  AnchorPoint: Vector2;
  /** Clockwise rotation in degrees. */
  Rotation: number;
  /** Whether the node participates in rendering. */
  Visible: boolean;
  /** Background color before transparency is applied. */
  BackgroundColor3: Color3;
  /** Background transparency from 0 (opaque) to 1 (invisible). */
  BackgroundTransparency: number;
  /** Stacking order among overlapping GUI nodes. */
  ZIndex: number;
  /** Ordering value used by attached layout modifiers. */
  LayoutOrder: number;
  /** Axes that derive their size from rendered content. */
  AutomaticSize: AutomaticSize;
  /** Whether visual content is clipped to this node's bounds. */
  ClipsDescendants: boolean;
};

/** A rectangular DOM-backed GUI container. */
export type FrameNode = GuiNode<FrameProperties>;

const automaticSizes: readonly AutomaticSize[] = ['None', 'X', 'Y', 'XY'];

/** Creates a rectangular GUI container. */
export function createFrame(initial: Partial<FrameProperties> = {}): FrameNode {
  return createFrameBasedNode(
    'Frame',
    document.createElement('div'),
    createDefaultFrameProperties(),
    initial,
  );
}

/** Creates a frame carrying immutable prefab-specific fields. */
export function createFrameWithFields<Fields extends object>(
  initial: Partial<FrameProperties>,
  fields: Fields,
): FrameNode & Readonly<Fields> {
  return createFrameBasedNode(
    'Frame',
    document.createElement('div'),
    createDefaultFrameProperties(),
    initial,
    undefined,
    undefined,
    fields,
  );
}

export function createDefaultFrameProperties(): FrameProperties {
  return {
    Name: 'Frame',
    Size: udim2FromOffset(100, 100),
    Position: udim2FromOffset(0, 0),
    AnchorPoint: vector2(0, 0),
    Rotation: 0,
    Visible: true,
    BackgroundColor3: color3FromRGB(200, 200, 200),
    BackgroundTransparency: 0,
    ZIndex: 1,
    LayoutOrder: 0,
    AutomaticSize: 'None',
    ClipsDescendants: false,
  };
}

/** Builds controls that share Frame's positioning and appearance properties. */
export function createFrameBasedNode<
  Properties extends FrameProperties,
  Fields extends object = object,
>(
  nodeType: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initial: Partial<Properties>,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  eventMethods?: GuiEventMethodTable,
  fields?: Fields,
): GuiNode<Properties> & Readonly<Fields> {
  element.dataset.framekit = nodeType;
  Object.assign(element.style, { position: 'absolute', boxSizing: 'border-box' });
  const node = createGuiNode(
    nodeType,
    mergeProperties(defaultProperties, initial),
    element,
    (properties, changed) => {
      renderFrame(element, properties);
      renderAdditionalProperties?.(properties, changed);
    },
    eventMethods,
    fields,
  );
  connectHoverEvents(node, element);
  return node;
}

function renderFrame(element: HTMLElement, properties: Readonly<FrameProperties>): void {
  assertAllowedValue(properties.AutomaticSize, automaticSizes, 'AutomaticSize');
  assertVector2(properties.AnchorPoint, 'AnchorPoint');
  assertFiniteNumber(properties.Rotation, 'Rotation');
  assertBoolean(properties.Visible, 'Visible');
  assertInteger(properties.ZIndex, 'ZIndex');
  assertBoolean(properties.ClipsDescendants, 'ClipsDescendants');

  element.style.position = 'absolute';
  element.style.width =
    properties.AutomaticSize === 'X' || properties.AutomaticSize === 'XY'
      ? 'auto'
      : udimToCss(properties.Size.X);
  element.style.height =
    properties.AutomaticSize === 'Y' || properties.AutomaticSize === 'XY'
      ? 'auto'
      : udimToCss(properties.Size.Y);
  element.style.left = udimToCss(properties.Position.X);
  element.style.top = udimToCss(properties.Position.Y);
  element.style.transform = `translate(${-properties.AnchorPoint.X * 100}%, ${-properties.AnchorPoint.Y * 100}%)`;
  element.style.setProperty('rotate', `${properties.Rotation}deg`);
  element.style.display = properties.Visible ? '' : 'none';
  element.style.backgroundColor = color3ToCss(
    properties.BackgroundColor3,
    properties.BackgroundTransparency,
  );
  element.style.zIndex = String(properties.ZIndex);
  element.style.overflow = properties.ClipsDescendants ? 'hidden' : 'visible';
}
