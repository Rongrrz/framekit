import type { GuiNode } from '../core/node/variants/gui';
import { attachButtonBehavior, type ButtonProps } from '../rendering/button-input';
import { textLabelDefaults, textNode, type TextLabelProps } from './text-label';

export type TextButtonProps = TextLabelProps & ButtonProps;
export type TextButtonNode = GuiNode<TextButtonProps> & {
  readonly element: HTMLButtonElement;
};

export function textButtonNode(initial: Partial<TextButtonProps> = {}): TextButtonNode {
  const element = document.createElement('button');
  const node = textNode(
    'TextButton',
    element,
    { ...textLabelDefaults(), Name: 'TextButton', Disabled: false },
    initial,
    (props) => {
      element.disabled = props.Disabled;
      element.style.cursor = props.Disabled ? 'not-allowed' : 'pointer';
    },
  );
  const button = node as TextButtonNode;
  attachButtonBehavior(button, element);
  return button;
}
