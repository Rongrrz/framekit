import type { GuiNode } from '../core/node/variants/gui';
import { attachButtonBehavior, type ButtonProps } from '../rendering/button-input';
import { imageLabelDefaults, imageNode, type ImageLabelProps } from './image-label';

export type ImageButtonProps = ImageLabelProps & ButtonProps;
export type ImageButtonNode = GuiNode<ImageButtonProps> & {
  readonly element: HTMLButtonElement;
};

export function imageButtonNode(initial: Partial<ImageButtonProps> = {}): ImageButtonNode {
  const element = document.createElement('button');
  const node = imageNode(
    'ImageButton',
    element,
    { ...imageLabelDefaults(), Name: 'ImageButton', Disabled: false },
    initial,
    (props) => {
      element.disabled = props.Disabled;
      element.style.cursor = props.Disabled ? 'not-allowed' : 'pointer';
    },
  );
  const button = node as ImageButtonNode;
  attachButtonBehavior(button, element);
  return button;
}
