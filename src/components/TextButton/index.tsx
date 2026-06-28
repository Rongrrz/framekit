import { BaseButton, type GuiButtonProps } from '../BaseButton';
import { TextLabel, type TextLabelProps } from '../TextLabel';

export type TextButtonProps = TextLabelProps & GuiButtonProps;

export function TextButton(props: TextButtonProps) {
  const Button = (elementProps: GuiButtonProps) => (
    <BaseButton
      {...elementProps}
      MouseButton1Click={props.MouseButton1Click}
      MouseButton1Down={props.MouseButton1Down}
      MouseButton1Up={props.MouseButton1Up}
      MouseButton2Click={props.MouseButton2Click}
      MouseButton2Down={props.MouseButton2Down}
      MouseButton2Up={props.MouseButton2Up}
    />
  );

  return <TextLabel {...props} as={Button} />;
}
