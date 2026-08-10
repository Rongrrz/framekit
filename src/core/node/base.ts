export type NodeProps = {
  Name: string;
};

declare const nodeProps: unique symbol;

/** An opaque handle to an item managed by FrameKit. */
export type Node<Props extends NodeProps = NodeProps> = {
  readonly [nodeProps]: Props;
};

export type BaseNodeState<Props extends NodeProps> = {
  props: Props;
  parent: Node | undefined;
  destroyed: boolean;
  cleanups: Set<() => void>;
};

export function baseState<Props extends NodeProps>(props: Props): BaseNodeState<Props> {
  return { props, parent: undefined, destroyed: false, cleanups: new Set() };
}
