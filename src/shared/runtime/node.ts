import { destroy, isDestroyed, onDestroy } from './node-lifecycle';
import { getNodeProperty, setNodeProperties, subscribeToPropertyChange } from './node-properties';
import type { Unsubscribe } from './signal';
import {
  append,
  children,
  descendants,
  detach,
  findFirstChild,
  getClassName,
  getFullName,
  getParent,
  printTree,
  setParent,
  toTreeString,
} from './tree';
import { watchValue, type Value } from './value';

/** Properties shared by every FrameKit node. */
export type NodeProperties = {
  /** The editable hierarchy name used by lookup and debug paths. */
  Name: string;
};

declare const nodeProperties: unique symbol;
const propertyTablesByMethodTable = new WeakMap<object, Map<string, object>>();

/** A persistent typed object in the FrameKit hierarchy. */
export type Node<Properties extends NodeProperties = NodeProperties> = {
  readonly [nodeProperties]: Properties;
  /** The concrete FrameKit node type, such as `Frame` or `TextButton`. */
  readonly ClassName: string;
  /** This node's hierarchy parent. Assigning it reparents or detaches the node. */
  Parent: Node | undefined;
} & Properties &
  NodeMethods<Properties>;

/** Operations shared by every FrameKit node. */
export type NodeMethods<Properties extends NodeProperties = NodeProperties> = {
  /** Validates and applies several properties in one render pass. */
  setProperties(patch: Partial<Properties>): void;
  /** Subscribes to one property and reports its new and previous values. */
  onPropertyChanged<Property extends keyof Properties>(
    property: Property,
    listener: (value: Properties[Property], previousValue: Properties[Property]) => void,
  ): Unsubscribe;
  /** Reparents a child beneath this node. */
  addChild(child: Node): void;
  /** Detaches this node without destroying it. */
  removeFromParent(): void;
  /** Returns a snapshot of the direct children. */
  getChildren(): readonly Node[];
  /** Returns a depth-first snapshot of every nested child. */
  getDescendants(): readonly Node[];
  /** Finds a direct child by Name, or any descendant when recursive is true. */
  findFirstChild(name: string, recursive?: boolean): Node | undefined;
  /** Returns the dot-separated Name path from the hierarchy root. */
  getFullName(): string;
  /** Formats this node and its descendants as a readable tree. */
  toTreeString(): string;
  /** Prints `toTreeString()` to the console. */
  printTree(): void;
  /** Permanently destroys this node and its descendants. */
  destroy(): void;
  /** Reports whether this node has been destroyed. */
  isDestroyed(): boolean;
  /** Registers cleanup work and returns a function that unregisters it. */
  onDestroy(callback: () => void): Unsubscribe;
  /** Watches a value immediately and until this node is destroyed. */
  watch<T>(value: Value<T>, listener: (value: T) => void): Unsubscribe;
};

/** Creates a node handle with direct property access. */
export function createNodeHandle<Properties extends NodeProperties>(
  initialProperties: Readonly<Properties>,
  methods: object = nodeMethods,
  fields: object = {},
): Node<Properties> {
  const propertyTable = createNodeHandlePropertyTable(initialProperties, methods);
  const handle = Object.assign(Object.create(propertyTable) as object, fields);
  return Object.freeze(handle) as Node<Properties>;
}

function createNodeHandlePropertyTable<Properties extends NodeProperties>(
  properties: Readonly<Properties>,
  methodTable: object,
): object {
  let tablesByShape = propertyTablesByMethodTable.get(methodTable);
  if (!tablesByShape) {
    tablesByShape = new Map();
    propertyTablesByMethodTable.set(methodTable, tablesByShape);
  }

  const propertyNames = Object.keys(properties).sort();
  const shape = propertyNames.join('\0');
  const existingTable = tablesByShape.get(shape);
  if (existingTable) return existingTable;

  const propertyTable = Object.create(methodTable) as object;
  for (const propertyName of propertyNames) {
    Object.defineProperty(propertyTable, propertyName, {
      enumerable: true,
      get(this: Node<Properties>) {
        return getNodeProperty(this, propertyName as keyof Properties);
      },
      set(this: Node<Properties>, value: Properties[keyof Properties]) {
        setNodeProperties(this, { [propertyName]: value } as Partial<Properties>);
      },
    });
  }

  Object.freeze(propertyTable);
  tablesByShape.set(shape, propertyTable);
  return propertyTable;
}

/** Creates a frozen method table that inherits another capability table. */
export function extendMethodTable<Base extends object, Extension extends object>(
  base: Base,
  extension: Extension,
): Readonly<Base & Extension> {
  return Object.freeze(Object.assign(Object.create(base) as object, extension)) as Readonly<
    Base & Extension
  >;
}

/** Shared prototype for node handles, keeping methods out of each instance allocation. */
const methodTable = {
  setProperties<Properties extends NodeProperties>(
    this: Node<Properties>,
    patch: Partial<Properties>,
  ): void {
    setNodeProperties(this, patch);
  },
  onPropertyChanged<Properties extends NodeProperties, Property extends keyof Properties>(
    this: Node<Properties>,
    property: Property,
    listener: (value: Properties[Property], previousValue: Properties[Property]) => void,
  ): Unsubscribe {
    return subscribeToPropertyChange(this, property, listener);
  },
  addChild(this: Node, child: Node): void {
    append(this, child);
  },
  removeFromParent(this: Node): void {
    detach(this);
  },
  getChildren(this: Node): readonly Node[] {
    return children(this);
  },
  getDescendants(this: Node): readonly Node[] {
    return descendants(this);
  },
  findFirstChild(this: Node, name: string, recursive = false): Node | undefined {
    return findFirstChild(this, name, recursive);
  },
  getFullName(this: Node): string {
    return getFullName(this);
  },
  toTreeString(this: Node): string {
    return toTreeString(this);
  },
  printTree(this: Node): void {
    printTree(this);
  },
  destroy(this: Node): void {
    destroy(this);
  },
  isDestroyed(this: Node): boolean {
    return isDestroyed(this);
  },
  onDestroy(this: Node, callback: () => void): Unsubscribe {
    return onDestroy(this, callback);
  },
  watch<T>(this: Node, value: Value<T>, listener: (value: T) => void): Unsubscribe {
    return watchValue(this, value, listener);
  },
} satisfies NodeMethods;

Object.defineProperties(methodTable, {
  ClassName: {
    get(this: Node): string {
      return getClassName(this);
    },
  },
  Parent: {
    get(this: Node): Node | undefined {
      return getParent(this);
    },
    set(this: Node, newParent: Node | undefined) {
      setParent(this, newParent);
    },
  },
});

export const nodeMethods = Object.freeze(methodTable);
