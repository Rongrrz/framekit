import * as rendering from '../render.js';
import { vector2, type Vector2 } from '../values/vector2.js';
import { guiEventMethods, type GuiMethodTable, type GuiEventMethods } from './gui-events.js';
import {
  createNodeHandle,
  extendMethodTable,
  nodeMethods,
  type Instance,
  type InstanceProperties,
} from './instance.js';
import {
  createBaseState,
  getActiveNodeState,
  registerNode,
  type GuiCapabilities,
  type PropertyValidator,
} from './state.js';

/** Browser-computed geometry available on every GUI element. */
export type GuiGeometry = {
  /** Current viewport position in pixels after layout and transforms. */
  readonly AbsolutePosition: Vector2;
  /** Current rendered width and height in pixels. */
  readonly AbsoluteSize: Vector2;
};

/** A FrameKit instance backed by a browser HTMLElement. */
export type GuiElement<Properties extends InstanceProperties = InstanceProperties> =
  Instance<Properties> &
    GuiEventMethods &
    GuiGeometry & {
      /**
       * Low-level DOM escape hatch. Do not change hierarchy or FrameKit-owned inline styles;
       * those writes bypass node state and may be overwritten by the next property render.
       */
      readonly unsafeElement: HTMLElement;
    };

export type PropertyRenderer<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
) => Partial<Properties> | void;

type GuiNodeOptions<Properties extends InstanceProperties> = {
  className: string;
  properties: Properties;
  element: HTMLElement;
  renderProperties?: PropertyRenderer<Properties> | undefined;
  validateProperties?: PropertyValidator<Properties> | undefined;
  methods?: GuiMethodTable | undefined;
  canHaveParent?: boolean;
  canContainGuiChildren?: boolean;
  capabilities?: Partial<GuiCapabilities>;
};

/** Creates the handle, registers its validated state, then performs the initial render. */
export function createGuiNode<Properties extends InstanceProperties>({
  className,
  properties,
  element,
  renderProperties,
  validateProperties,
  methods = guiEventMethods,
  canHaveParent = true,
  canContainGuiChildren = true,
  capabilities = {},
}: GuiNodeOptions<Properties>): GuiElement<Properties> {
  const propertyNames = new Set(Object.keys(properties) as (keyof Properties)[]);
  const node = createNodeHandle(properties, getGuiMethodTable(methods), {
    unsafeElement: element,
  }) as GuiElement<Properties>;
  registerNode(node, {
    ...createBaseState(className, properties, validateProperties, canHaveParent),
    kind: 'gui',
    children: [],
    canContainGuiChildren,
    capabilities: Object.freeze({ guiObject: false, displayText: false, ...capabilities }),
    propertyNames,
    renderProperties,
    modifiers: new Map(),
    layoutChildren: new Set(),
  });
  rendering.renderNode(node, propertyNames);
  return node;
}

const guiMethodTables = new WeakMap<object, object>();
const guiNodeMethods = createGuiNodeMethods();

function getGuiMethodTable(methods: GuiMethodTable): object {
  const existing = guiMethodTables.get(methods);
  if (existing) return existing;
  const methodTable = extendMethodTable(guiNodeMethods, methods);
  guiMethodTables.set(methods, methodTable);
  return methodTable;
}

function createGuiNodeMethods(): object {
  const methodTable = Object.create(nodeMethods) as object;
  Object.defineProperties(methodTable, {
    AbsolutePosition: {
      get(this: GuiElement): Vector2 {
        getActiveNodeState(this);
        const bounds = this.unsafeElement.getBoundingClientRect();
        return vector2(bounds.left, bounds.top);
      },
    },
    AbsoluteSize: {
      get(this: GuiElement): Vector2 {
        getActiveNodeState(this);
        const bounds = this.unsafeElement.getBoundingClientRect();
        return vector2(bounds.width, bounds.height);
      },
    },
  });
  return Object.freeze(methodTable);
}
