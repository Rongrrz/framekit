import { createNodeHandle } from '../../runtime/node-handle';
import {
  createBaseState,
  registerNode,
  type Node,
  type NodeProperties,
} from '../../runtime/node-state';

/** Creates an element-less node for testing tree behavior without involving the DOM. */
export function groupNode(initial: Partial<NodeProperties> = {}): Node<NodeProperties> {
  const properties = { Name: 'TestGroup', ...initial };
  const handle = createNodeHandle(properties);
  registerNode(handle, {
    ...createBaseState('Group', properties),
    kind: 'group',
    children: [],
  });
  return handle;
}
