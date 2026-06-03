import { Color4 } from '../primitives/Color4';
import { colorToCss } from '../rendering/toCss';
import { createUIDecorator, type UIDecorator } from './decorator';

type UITextStrokeProps = {
  Enabled?: boolean;
  Color?: Color4;
  Thickness?: number;
};

export const UITextStroke: UIDecorator<UITextStrokeProps> = createUIDecorator((props) => {
  if (props.Enabled === false) {
    return {};
  }

  const color4 = props.Color ?? Color4.rgbt(0, 0, 0, 0);
  const color = colorToCss(color4);
  const thickness = props.Thickness ?? 1;

  return {
    WebkitTextStrokeColor: color,
    WebkitTextStrokeWidth: thickness,
  };
});
