import { UIStroke } from './UIStroke';

const Decorators: Set<UIDecorator<any>> = new Set([UIStroke]);

export function isDecorator(type: unknown): type is UIDecorator<any> {
  return Decorators.has(type as UIDecorator<any>);
}

export type HostType =
  | 'Frame'
  | 'TextLabel'
  | 'TextButton'
  | 'ImageLabel'
  | 'ImageButton'
  | 'ScrollingFrame';

export function isTextHost(hostType: HostType): boolean {
  return hostType === 'TextLabel' || hostType === 'TextButton';
}

export type UIDecorator<Props> = React.FunctionComponent<Props> & {
  toCss: (props: Props, hostType: HostType) => React.CSSProperties;
};

export function createUIDecorator<Props>(
  toCss: (props: Props, hostType: HostType) => React.CSSProperties,
): UIDecorator<Props> {
  const component = () => null;
  component.toCss = toCss;
  return component;
}
