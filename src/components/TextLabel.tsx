import { mergeChildren } from '../mergeChildren';
import { Frame, type FrameProps } from './Frame';

export type TextLabelProps = FrameProps & {
  Text?: string;
};

export function TextLabel(props: TextLabelProps) {
  const { children, Text: text, ...frameProps } = props;

  return <Frame {...frameProps}>{mergeChildren(children, <div>{text}</div>)}</Frame>;
}
