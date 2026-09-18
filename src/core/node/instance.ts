import { DestroyService } from '../destroy-service';
import { NodeService } from '../node-service';
import type { Unsubscribe } from '../state/signal';
import type { InstanceClassName, InstanceOf } from './classes';
import { getNodeProperty, setNodeProperties, subscribeToPropertyChange } from './properties';

/** Properties shared by every FrameKit instance. */
export type InstanceProperties = {
  /** The editable hierarchy name used by lookup and debug paths. */
  Name: string;
};

declare const nodeProperties: unique symbol;

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
  /** Tests an exact built-in class and narrows this instance to its concrete API. */
  isA<ClassName extends InstanceClassName>(className: ClassName): this is InstanceOf<ClassName>;
  /** Validates and applies several properties in one render pass. */
  setProperties(patch: Partial<Properties>): void;
  /** Subscribes to one property and reports its new and previous values. */
  onPropertyChanged<Property extends keyof Properties>(
    property: Property,
    listener: (value: Properties[Property], previousValue: Properties[Property]) => void,
  ): Unsubscribe;
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
  /** Permanently destroys this node and its descendants. */
  destroy(): void;
  /** Reports whether this node has been destroyed. */
  isDestroyed(): boolean;
  /** Registers cleanup work and returns a function that unregisters it. */
  onDestroy(callback: () => void): Unsubscribe;
};

/** Creates a node handle with direct property access. */
export function createNodeHandle<Properties extends InstanceProperties>(
  initialProperties: Readonly<Properties>,
  methods: object = nodeMethods,
  fields: object = {},
): Instance<Properties> {
  const handle = Object.create(methods) as object;
  for (const [fieldName, value] of Object.entries(fields)) {
    Object.defineProperty(handle, fieldName, {
      configurable: false,
      enumerable: true,
      writable: false,
      value,
    });
  }
  for (const propertyName of Object.keys(initialProperties)) {
    Object.defineProperty(handle, propertyName, {
      configurable: false,
      enumerable: true,
      get(this: Instance<Properties>) {
        return getNodeProperty(this, propertyName as keyof Properties);
      },
      set(this: Instance<Properties>, value: Properties[keyof Properties]) {
        setNodeProperties(this, { [propertyName]: value } as Partial<Properties>);
      },
    });
  }
  return handle as Instance<Properties>;
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
  isA<ClassName extends InstanceClassName>(
    this: Instance,
    className: ClassName,
  ): this is InstanceOf<ClassName> {
    return NodeService.getClassName(this) === className;
  },
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
  getChildren(this: Instance): readonly Instance[] {
    return NodeService.children(this);
  },
  getDescendants(this: Instance): readonly Instance[] {
    return NodeService.descendants(this);
  },
  findFirstChild(this: Instance, name: string, recursive = false): Instance | undefined {
    return NodeService.findFirstChild(this, name, recursive);
  },
  getFullName(this: Instance): string {
    return NodeService.getFullName(this);
  },
  toTreeString(this: Instance): string {
    return NodeService.toTreeString(this);
  },
  destroy(this: Instance): void {
    DestroyService.destroy(this);
  },
  isDestroyed(this: Instance): boolean {
    return DestroyService.isDestroyed(this);
  },
  onDestroy(this: Instance, callback: () => void): Unsubscribe {
    return DestroyService.onDestroy(this, callback);
  },
} satisfies InstanceMethods;

Object.defineProperties(methodTable, {
  ClassName: {
    get(this: Instance): string {
      return NodeService.getClassName(this);
    },
  },
  Parent: {
    get(this: Instance): Instance | undefined {
      return NodeService.getParent(this);
    },
    set(this: Instance, newParent: Instance | undefined) {
      NodeService.setParent(this, newParent);
    },
  },
});

export const nodeMethods = Object.freeze(methodTable);
