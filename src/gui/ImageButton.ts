import { withButtonBehavior } from '../rendering/ButtonBehavior';
import { ImageLabel } from './ImageLabel';

const InteractiveImageLabel = withButtonBehavior(ImageLabel);

export class ImageButton extends InteractiveImageLabel {
  public constructor() {
    super(document.createElement('button'));
  }
}
