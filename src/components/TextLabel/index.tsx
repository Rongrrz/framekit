import { mergeChildren } from '../../mergeChildren';
import type { Color4 } from '../../primitives/Color4';
import { Frame } from '../Frame';
import type { FrameProps } from '../Frame/types';

export type TextLabelProps = FrameProps & {
  Text?: string;
  TextColor?: Color4;
};

export function TextLabel(props: TextLabelProps) {
  const { children, Text: text, ...frameProps } = props;

  return <Frame {...frameProps}>{mergeChildren(children, <div>{text}</div>)}</Frame>;
}
