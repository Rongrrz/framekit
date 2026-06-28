import React from 'react';

import type { Callable } from '../../types';

export type GuiButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onMouseDown' | 'onMouseUp' | 'onContextMenu' | 'type'
> & {
  MouseButton1Click?: Callable;
  MouseButton1Down?: Callable;
  MouseButton1Up?: Callable;
  MouseButton2Click?: Callable;
  MouseButton2Down?: Callable;
  MouseButton2Up?: Callable;
};

export function BaseButton(props: GuiButtonProps) {
  const isMouseButton1Down = React.useRef(false);
  const isMouseButton2Down = React.useRef(false);
  const {
    children,
    MouseButton1Click,
    MouseButton1Down,
    MouseButton1Up,
    MouseButton2Click,
    MouseButton2Down,
    MouseButton2Up,
    ...buttonProps
  } = props;

  function handleMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    switch (event.button) {
      case 0:
        isMouseButton1Down.current = true;
        MouseButton1Down?.();
        break;
      case 2:
        isMouseButton2Down.current = true;
        MouseButton2Down?.();
        break;
    }
  }

  function handleMouseUp(event: React.MouseEvent<HTMLButtonElement>) {
    switch (event.button) {
      case 0:
        MouseButton1Up?.();
        if (isMouseButton1Down.current) MouseButton1Click?.();
        isMouseButton1Down.current = false;
        break;
      case 2:
        MouseButton2Up?.();
        if (isMouseButton2Down.current) MouseButton2Click?.();
        isMouseButton2Down.current = false;
        break;
    }
  }

  // Prevents the default right-click menu ANY custom right-clicking event
  // is attached to the button.
  function handleContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    if (MouseButton2Click || MouseButton2Down || MouseButton2Up) {
      event.preventDefault();
    }
  }

  return (
    <button
      {...buttonProps}
      type="button"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {children}
    </button>
  );
}
