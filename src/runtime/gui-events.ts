import { subscribeToNodeEvent, type Unsubscribe } from './signal';
import type { Node } from './state';

export type GuiEventMethods = {
  onMouseEnter(listener: (event: MouseEvent) => void): Unsubscribe;
  onMouseLeave(listener: (event: MouseEvent) => void): Unsubscribe;
};

export type ButtonEventMethods = {
  onClick(listener: (event: MouseEvent) => void): Unsubscribe;
  onPrimaryButtonDown(listener: (event: MouseEvent) => void): Unsubscribe;
  onPrimaryButtonUp(listener: (event: MouseEvent) => void): Unsubscribe;
  onSecondaryClick(listener: (event: MouseEvent) => void): Unsubscribe;
  onSecondaryButtonDown(listener: (event: MouseEvent) => void): Unsubscribe;
  onSecondaryButtonUp(listener: (event: MouseEvent) => void): Unsubscribe;
};

export type TextBoxEventMethods = {
  onTextChanged(listener: (text: string, event: InputEvent) => void): Unsubscribe;
};

export type GuiEventMethodTable = GuiEventMethods &
  Partial<ButtonEventMethods & TextBoxEventMethods>;

export const guiEventKeys = Object.freeze({
  mouseEnter: Symbol('MouseEnter'),
  mouseLeave: Symbol('MouseLeave'),
  click: Symbol('Click'),
  primaryButtonDown: Symbol('PrimaryButtonDown'),
  primaryButtonUp: Symbol('PrimaryButtonUp'),
  secondaryClick: Symbol('SecondaryClick'),
  secondaryButtonDown: Symbol('SecondaryButtonDown'),
  secondaryButtonUp: Symbol('SecondaryButtonUp'),
  textChanged: Symbol('TextChanged'),
});

// Nodes share frozen method tables so event methods are allocated once rather than per node.
export const guiEventMethods = Object.freeze({
  onMouseEnter(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.mouseEnter, listener);
  },
  onMouseLeave(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.mouseLeave, listener);
  },
} satisfies GuiEventMethods);

export const buttonEventMethods = Object.freeze({
  ...guiEventMethods,
  onClick(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.click, listener);
  },
  onPrimaryButtonDown(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.primaryButtonDown, listener);
  },
  onPrimaryButtonUp(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.primaryButtonUp, listener);
  },
  onSecondaryClick(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.secondaryClick, listener);
  },
  onSecondaryButtonDown(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.secondaryButtonDown, listener);
  },
  onSecondaryButtonUp(this: Node, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.secondaryButtonUp, listener);
  },
} satisfies GuiEventMethods & ButtonEventMethods);

export const textBoxEventMethods = Object.freeze({
  ...guiEventMethods,
  onTextChanged(this: Node, listener: (text: string, event: InputEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.textChanged, listener);
  },
} satisfies GuiEventMethods & TextBoxEventMethods);
