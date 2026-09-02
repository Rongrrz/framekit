import { connectHoverEvents } from '../shared/dom/hover-events';
import type { GuiEventMethodTable } from '../shared/runtime/gui-events';
import type { InstanceProperties } from '../shared/runtime/node';
import { mergeProperties, type PropertyValidator } from '../shared/runtime/node-state';
import {
  createGuiNode,
  setStyle,
  type GuiElement,
  type PropertyRenderer,
} from '../shared/runtime/render';
import {
  assertAllowedValue,
  assertBoolean,
  assertFiniteNumber,
  assertInteger,
} from '../shared/runtime/validation';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from './values/color3';
import { assertUDim2, udim2FromOffset, udimToCss, type UDim2 } from './values/udim';
import { assertVector2, vector2, type Vector2 } from './values/vector2';

/** Axes whose size should follow the rendered content. */
export type AutomaticSize = 'None' | 'X' | 'Y' | 'XY';

/** Layout and appearance properties shared by rectangular GUI objects. */
export type GuiObjectProperties = InstanceProperties & {
  /** Width and height relative to the parent. */
  Size: UDim2;
  /** Position relative to the parent. */
  Position: UDim2;
  /** Normalized point on this object placed at Position. */
  AnchorPoint: Vector2;
  /** Clockwise rotation in degrees. */
  Rotation: number;
  /** Whether the object participates in rendering. */
  Visible: boolean;
  /** Background color before transparency is applied. */
  BackgroundColor3: Color3;
  /** Background transparency from 0 (opaque) to 1 (invisible). */
  BackgroundTransparency: number;
  /** Stacking order among overlapping GUI objects. */
  ZIndex: number;
  /** Ordering value used by attached layout modifiers. */
  LayoutOrder: number;
  /** Axes that derive their size from rendered content. */
  AutomaticSize: AutomaticSize;
  /** Whether visual content is clipped to this object's bounds. */
  ClipsDescendants: boolean;
};

/** Shared instance shape for rectangular GUI objects. */
export type GuiObject<Properties extends GuiObjectProperties = GuiObjectProperties> =
  GuiElement<Properties>;

const automaticSizes: readonly AutomaticSize[] = ['None', 'X', 'Y', 'XY'];

/** Returns a fresh set of default GUI object properties. */
export function createDefaultGuiObjectProperties(): GuiObjectProperties {
  return {
    Name: 'GuiObject',
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

/** Builds a DOM-backed node with shared GUI object behavior. */
export function createGuiObjectNode<Properties extends GuiObjectProperties>(
  className: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initial: Partial<Properties>,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  eventMethods?: GuiEventMethodTable,
  validateAdditionalProperties?: PropertyValidator<Properties>,
): GuiObject<Properties> {
  element.dataset.framekit = className;
  Object.assign(element.style, { position: 'absolute', boxSizing: 'border-box' });

  const node = createGuiNode(
    className,
    mergeProperties(defaultProperties, initial),
    element,
    (properties, changed) => {
      renderGuiObject(element, properties, changed);
      renderAdditionalProperties?.(properties, changed);
    },
    (properties) => {
      validateGuiObjectProperties(properties);
      validateAdditionalProperties?.(properties);
    },
    eventMethods,
  );

  connectHoverEvents(node, element);
  return node;
}

function renderGuiObject(
  element: HTMLElement,
  properties: Readonly<GuiObjectProperties>,
  changed: ReadonlySet<PropertyKey>,
): void {
  if (changed.has('Size') || changed.has('AutomaticSize')) {
    setStyle(
      element,
      'width',
      properties.AutomaticSize === 'X' || properties.AutomaticSize === 'XY'
        ? 'auto'
        : udimToCss(properties.Size.X),
    );
    setStyle(
      element,
      'height',
      properties.AutomaticSize === 'Y' || properties.AutomaticSize === 'XY'
        ? 'auto'
        : udimToCss(properties.Size.Y),
    );
  }
  if (changed.has('Position')) {
    setStyle(element, 'position', 'absolute');
    setStyle(element, 'left', udimToCss(properties.Position.X));
    setStyle(element, 'top', udimToCss(properties.Position.Y));
  }
  if (changed.has('AnchorPoint')) {
    setStyle(
      element,
      'transform',
      `translate(${-properties.AnchorPoint.X * 100}%, ${-properties.AnchorPoint.Y * 100}%)`,
    );
  }
  if (changed.has('Rotation')) setStyle(element, 'rotate', `${properties.Rotation}deg`);
  if (changed.has('Visible')) setStyle(element, 'display', properties.Visible ? '' : 'none');
  if (changed.has('BackgroundColor3') || changed.has('BackgroundTransparency')) {
    setStyle(
      element,
      'background-color',
      color3ToCss(properties.BackgroundColor3, properties.BackgroundTransparency),
    );
  }
  if (changed.has('ZIndex')) setStyle(element, 'z-index', String(properties.ZIndex));
  if (changed.has('ClipsDescendants')) {
    setStyle(element, 'overflow', properties.ClipsDescendants ? 'hidden' : 'visible');
  }
}

function validateGuiObjectProperties(properties: Readonly<GuiObjectProperties>): void {
  assertAllowedValue(properties.AutomaticSize, automaticSizes, 'AutomaticSize');
  assertUDim2(properties.Size, 'Size');
  assertUDim2(properties.Position, 'Position');
  assertVector2(properties.AnchorPoint, 'AnchorPoint');
  assertFiniteNumber(properties.Rotation, 'Rotation');
  assertBoolean(properties.Visible, 'Visible');
  assertColor3(properties.BackgroundColor3, 'BackgroundColor3');
  assertFiniteNumber(properties.BackgroundTransparency, 'BackgroundTransparency');
  assertInteger(properties.ZIndex, 'ZIndex');
  assertInteger(properties.LayoutOrder, 'LayoutOrder');
  assertBoolean(properties.ClipsDescendants, 'ClipsDescendants');
}
