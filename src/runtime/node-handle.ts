import { nodeMethods } from './node-methods';
import { getNodeProperty, setNodeProperties } from './node-properties';
import type { Node, NodeProperties } from './node-state';

const propertyTablesByMethodTable = new WeakMap<object, Map<string, object>>();

/** Creates a node with direct property access and a shared method table. */
export function createNodeHandle<Properties extends NodeProperties>(
  initialProperties: Readonly<Properties>,
  methodTable: object = nodeMethods,
  fields: object = {},
): Node<Properties> {
  const propertyTable = getPropertyTable(initialProperties, methodTable);
  const handle = Object.assign(Object.create(propertyTable) as object, fields);
  return Object.freeze(handle) as Node<Properties>;
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

function getPropertyTable<Properties extends NodeProperties>(
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
