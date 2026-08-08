import { withButtonBehavior } from '../rendering/ButtonBehavior';
import { TextLabel } from './TextLabel';

const InteractiveTextLabel = withButtonBehavior(TextLabel);

export class TextButton extends InteractiveTextLabel {
  public constructor() {
    super(document.createElement('button'));
    this.Element.style.font = 'inherit';
  }
}
