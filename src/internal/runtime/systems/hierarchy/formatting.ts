import type { Instance } from '../../node/instance.js';
import { getActiveNodeState, getChildren, getNodeState } from '../../node/registry.js';

type TreeLine = Readonly<{ current: Instance; prefix: string; isLast: boolean }>;

/** Formats a stable, human-readable snapshot of a node hierarchy. */
export const toTreeString = (node: Instance): string => {
  const lines = [formatNode(node)];
  const pending: TreeLine[] = [];
  pushTreeLines(pending, getChildren(getActiveNodeState(node)), '');

  while (pending.length > 0) {
    const { current, prefix, isLast } = pending.pop()!;
    lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${formatNode(current)}`);
    const childPrefix = `${prefix}${isLast ? '   ' : '│  '}`;
    pushTreeLines(pending, getChildren(getNodeState(current)), childPrefix);
  }
  return lines.join('\n');
};

const pushTreeLines = (pending: TreeLine[], nodes: readonly Instance[], prefix: string): void => {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    pending.push({ current: nodes[index]!, prefix, isLast: index === nodes.length - 1 });
  }
};

const formatNode = (node: Instance): string => {
  const state = getNodeState(node);
  return `${state.properties.Name} [${state.className}]`;
};
