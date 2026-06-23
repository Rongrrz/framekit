import React from 'react';

import type { GuiButtonProps } from '../types';
import { TextLabel, type TextLabelProps } from './TextLabel';

export type TextButtonProps = TextLabelProps & GuiButtonProps;

export function TextButton(props: TextButtonProps) {
  const isMouseButton1Down = React.useRef(false);
  const isMouseButton2Down = React.useRef(false);
  const {
    MouseButton1Click,
    MouseButton1Down,
    MouseButton1Up,
    MouseButton2Click,
    MouseButton2Down,
    MouseButton2Up,
    ...textLabelProps
  } = props;

  function handleMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    if (event.button === 0) {
      isMouseButton1Down.current = true;
      MouseButton1Down?.();
    }

    if (event.button === 2) {
      isMouseButton2Down.current = true;
      MouseButton2Down?.();
    }
  }

  function handleMouseUp(event: React.MouseEvent<HTMLButtonElement>) {
    if (event.button === 0) {
      MouseButton1Up?.();

      if (isMouseButton1Down.current) {
        MouseButton1Click?.();
      }
      isMouseButton1Down.current = false;
    }

    if (event.button === 2) {
      MouseButton2Up?.();

      if (isMouseButton2Down.current) {
        MouseButton2Click?.();
      }
      isMouseButton2Down.current = false;
    }
  }

  function handleContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    if (MouseButton2Click || MouseButton2Down || MouseButton2Up) {
      event.preventDefault();
    }
  }

  function BaseButton(buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button
        {...buttonProps}
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
    );
  }

  return <TextLabel {...textLabelProps} as={BaseButton} />;
}
