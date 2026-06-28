import { createUIDecorator, type UIDecorator } from './createUIDecorator';

type UICornerProps = {
  Enabled?: boolean;
  CornerRadius?: number;
};

export const UICorner: UIDecorator<UICornerProps> = createUIDecorator((props) => {
  if (props.Enabled === false) {
    return {};
  }

  return {
    borderRadius: `${props.CornerRadius ?? 0}px`,
  };
});
