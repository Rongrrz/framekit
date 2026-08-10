import { baseState, type Node, type NodeProps } from '../../core/node/base';
import { registerNode } from '../../core/node/state';

/** Creates an element-less node for testing tree behavior without involving the DOM. */
export function groupNode(initial: Partial<NodeProps> = {}): Node<NodeProps> {
  const handle = Object.freeze({}) as Node<NodeProps>;
  registerNode(handle, {
    ...baseState({ Name: 'TestGroup', ...initial }),
    kind: 'group',
    children: [],
  });
  return handle;
}
