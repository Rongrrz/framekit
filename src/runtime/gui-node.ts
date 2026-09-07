import { vector2, type Vector2 } from '../core/values/vector2';
import { guiEventMethods, type GuiMethodTable, type GuiEventMethods } from './gui-events';
import {
  createNodeHandle,
  extendMethodTable,
  nodeMethods,
  type Instance,
  type InstanceProperties,
} from './node';
import {
  createBaseState,
  getActiveNodeState,
  registerNode,
  type PropertyValidator,
} from './node-state';
import { renderNode } from './render';

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
      /** The low-level DOM escape hatch for browser integrations. */
      readonly element: HTMLElement;
    };

export type PropertyRenderer<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
) => void;

type GuiNodeOptions<Properties extends InstanceProperties> = {
  className: string;
  properties: Properties;
  element: HTMLElement;
  renderProperties?: PropertyRenderer<Properties> | undefined;
  validateProperties?: PropertyValidator<Properties> | undefined;
  methods?: GuiMethodTable | undefined;
  canHaveParent?: boolean;
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
}: GuiNodeOptions<Properties>): GuiElement<Properties> {
  const propertyNames = new Set(Object.keys(properties) as (keyof Properties)[]);
  const node = createNodeHandle(properties, getGuiMethodTable(methods), {
    element,
  }) as GuiElement<Properties>;
  registerNode(node, {
    ...createBaseState(className, properties, validateProperties, canHaveParent),
    kind: 'gui',
    children: [],
    propertyNames,
    renderProperties,
    modifiers: new Map(),
    appliedModifierStyles: new Set(),
    appliedLayoutStylesByChild: new Map(),
  });
  renderNode(node, propertyNames);
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
        const bounds = this.element.getBoundingClientRect();
        return vector2(bounds.left, bounds.top);
      },
    },
    AbsoluteSize: {
      get(this: GuiElement): Vector2 {
        getActiveNodeState(this);
        const bounds = this.element.getBoundingClientRect();
        return vector2(bounds.width, bounds.height);
      },
    },
  });
  return Object.freeze(methodTable);
}
