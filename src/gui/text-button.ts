import type { GuiNode } from '../core/node';
import { attachButtonBehavior, type ButtonProps } from '../rendering/button-events';
import { textLabelDefaults, textNode, type TextLabelProps } from './text-label';

export type TextButtonProps = TextLabelProps & ButtonProps;
export type TextButtonNode = GuiNode<TextButtonProps>;

export function textButtonNode(initial: Partial<TextButtonProps> = {}): TextButtonNode {
  const element = document.createElement('button');
  element.style.font = 'inherit';
  const node = textNode(
    'TextButton',
    element,
    { ...textLabelDefaults(), Name: 'TextButton', Disabled: false },
    initial,
    (props) => {
      element.disabled = props.Disabled;
    },
  );
  attachButtonBehavior(node, element);
  return node;
}
