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

/** Properties shared by every FrameKit instance. */
export type InstanceProperties = {
  /** The editable hierarchy name used by lookup and debug paths. */
  Name: string;
};

declare const nodeProperties: unique symbol;
const propertyTablesByMethodTable = new WeakMap<object, Map<string, object>>();

/** A persistent typed object in the FrameKit hierarchy. */
export type Instance<Properties extends InstanceProperties = InstanceProperties> = {
  readonly [nodeProperties]: Properties;
  /** The concrete FrameKit class, such as `Frame` or `TextButton`. */
  readonly ClassName: string;
  /** This instance's hierarchy parent. Assigning it reparents or detaches the instance. */
  Parent: Instance | undefined;
} & Properties &
  InstanceMethods<Properties>;

/** Operations shared by every FrameKit instance. */
export type InstanceMethods<Properties extends InstanceProperties = InstanceProperties> = {
  /** Validates and applies several properties in one render pass. */
  setProperties(patch: Partial<Properties>): void;
  /** Subscribes to one property and reports its new and previous values. */
  onPropertyChanged<Property extends keyof Properties>(
    property: Property,
    listener: (value: Properties[Property], previousValue: Properties[Property]) => void,
  ): Unsubscribe;
  /** Reparents a child beneath this node. */
  addChild(child: Instance): void;
  /** Detaches this node without destroying it. */
  removeFromParent(): void;
  /** Returns a snapshot of the direct children. */
  getChildren(): readonly Instance[];
  /** Returns a depth-first snapshot of every nested child. */
  getDescendants(): readonly Instance[];
  /** Finds a direct child by Name, or any descendant when recursive is true. */
  findFirstChild(name: string, recursive?: boolean): Instance | undefined;
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
export function createNodeHandle<Properties extends InstanceProperties>(
  initialProperties: Readonly<Properties>,
  methods: object = nodeMethods,
  fields: object = {},
): Instance<Properties> {
  const propertyTable = createNodeHandlePropertyTable(initialProperties, methods);
  const handle = Object.assign(Object.create(propertyTable) as object, fields);
  return Object.freeze(handle) as Instance<Properties>;
}

function createNodeHandlePropertyTable<Properties extends InstanceProperties>(
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
      get(this: Instance<Properties>) {
        return getNodeProperty(this, propertyName as keyof Properties);
      },
      set(this: Instance<Properties>, value: Properties[keyof Properties]) {
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
  const methodTable = Object.create(base) as object;
  Object.defineProperties(methodTable, Object.getOwnPropertyDescriptors(extension));
  return Object.freeze(methodTable) as Readonly<Base & Extension>;
}

/** Shared prototype for node handles, keeping methods out of each instance allocation. */
const methodTable = {
  setProperties<Properties extends InstanceProperties>(
    this: Instance<Properties>,
    patch: Partial<Properties>,
  ): void {
    setNodeProperties(this, patch);
  },
  onPropertyChanged<Properties extends InstanceProperties, Property extends keyof Properties>(
    this: Instance<Properties>,
    property: Property,
    listener: (value: Properties[Property], previousValue: Properties[Property]) => void,
  ): Unsubscribe {
    return subscribeToPropertyChange(this, property, listener);
  },
  addChild(this: Instance, child: Instance): void {
    append(this, child);
  },
  removeFromParent(this: Instance): void {
    detach(this);
  },
  getChildren(this: Instance): readonly Instance[] {
    return children(this);
  },
  getDescendants(this: Instance): readonly Instance[] {
    return descendants(this);
  },
  findFirstChild(this: Instance, name: string, recursive = false): Instance | undefined {
    return findFirstChild(this, name, recursive);
  },
  getFullName(this: Instance): string {
    return getFullName(this);
  },
  toTreeString(this: Instance): string {
    return toTreeString(this);
  },
  printTree(this: Instance): void {
    printTree(this);
  },
  destroy(this: Instance): void {
    destroy(this);
  },
  isDestroyed(this: Instance): boolean {
    return isDestroyed(this);
  },
  onDestroy(this: Instance, callback: () => void): Unsubscribe {
    return onDestroy(this, callback);
  },
  watch<T>(this: Instance, value: Value<T>, listener: (value: T) => void): Unsubscribe {
    return watchValue(this, value, listener);
  },
} satisfies InstanceMethods;

Object.defineProperties(methodTable, {
  ClassName: {
    get(this: Instance): string {
      return getClassName(this);
    },
  },
  Parent: {
    get(this: Instance): Instance | undefined {
      return getParent(this);
    },
    set(this: Instance, newParent: Instance | undefined) {
      setParent(this, newParent);
    },
  },
});

export const nodeMethods = Object.freeze(methodTable);
