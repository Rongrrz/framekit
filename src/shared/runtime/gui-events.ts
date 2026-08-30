import type { Instance } from './node';
import { subscribeToNodeEvent, type Unsubscribe } from './signal';

/** Mouse events available on every DOM-backed GUI node. */
export type GuiEventMethods = {
  /** Subscribes to pointer entry and returns an unsubscribe function. */
  onMouseEnter(listener: (event: MouseEvent) => void): Unsubscribe;
  /** Subscribes to pointer exit and returns an unsubscribe function. */
  onMouseLeave(listener: (event: MouseEvent) => void): Unsubscribe;
};

/** Mouse-button events available on button nodes. */
export type ButtonEventMethods = {
  /** Subscribes to browser click activation. */
  onClick(listener: (event: MouseEvent) => void): Unsubscribe;
  /** Subscribes when the primary mouse button is pressed. */
  onPrimaryButtonDown(listener: (event: MouseEvent) => void): Unsubscribe;
  /** Subscribes when the primary mouse button is released. */
  onPrimaryButtonUp(listener: (event: MouseEvent) => void): Unsubscribe;
  /** Subscribes to a completed secondary-button click. */
  onSecondaryClick(listener: (event: MouseEvent) => void): Unsubscribe;
  /** Subscribes when the secondary mouse button is pressed. */
  onSecondaryButtonDown(listener: (event: MouseEvent) => void): Unsubscribe;
  /** Subscribes when the secondary mouse button is released. */
  onSecondaryButtonUp(listener: (event: MouseEvent) => void): Unsubscribe;
};

/** Text editing events available on TextBox nodes. */
export type TextBoxEventMethods = {
  /** Subscribes to user edits after Text has been synchronized. */
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
  onMouseEnter(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.mouseEnter, listener);
  },
  onMouseLeave(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.mouseLeave, listener);
  },
} satisfies GuiEventMethods);

export const buttonEventMethods = Object.freeze({
  ...guiEventMethods,
  onClick(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.click, listener);
  },
  onPrimaryButtonDown(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.primaryButtonDown, listener);
  },
  onPrimaryButtonUp(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.primaryButtonUp, listener);
  },
  onSecondaryClick(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.secondaryClick, listener);
  },
  onSecondaryButtonDown(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.secondaryButtonDown, listener);
  },
  onSecondaryButtonUp(this: Instance, listener: (event: MouseEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.secondaryButtonUp, listener);
  },
} satisfies ButtonEventMethods);

export const textBoxEventMethods = Object.freeze({
  ...guiEventMethods,
  onTextChanged(this: Instance, listener: (text: string, event: InputEvent) => void): Unsubscribe {
    return subscribeToNodeEvent(this, guiEventKeys.textChanged, listener);
  },
} satisfies TextBoxEventMethods);
