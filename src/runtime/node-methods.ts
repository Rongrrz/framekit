import { destroy, isDestroyed, onDestroy } from './node-lifecycle';
import { setNodeProperties } from './node-properties';
import type { Node, NodeProperties } from './node-state';
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

/** Operations shared by every FrameKit node. */
export type NodeMethods<Properties extends NodeProperties = NodeProperties> = {
  /** Validates and applies several properties in one render pass. */
  setProperties(patch: Partial<Properties>): void;
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

/** Shared prototype for node handles, keeping methods out of each instance allocation. */
const methodTable = {
  setProperties<Properties extends NodeProperties>(
    this: Node<Properties>,
    patch: Partial<Properties>,
  ): void {
    setNodeProperties(this, patch);
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
