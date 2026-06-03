import { Frame, type FrameProps } from './Frame';

export type TextLabelProps = FrameProps & {
  Text?: string;
};

export function TextLabel(props: TextLabelProps) {
  const { Text: text, ...frameProps } = props;

  return (
    <Frame {...frameProps}>
      <div>{text}</div>
    </Frame>
  );
}
