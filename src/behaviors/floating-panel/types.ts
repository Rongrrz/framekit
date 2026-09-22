import type { GuiObject } from '../../elements/gui-object.js';

/** Preferred side of a floating panel; flips to the opposite side when it offers more room. */
export type FloatingPanelPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Animation input. Abort stops a superseded transition or one whose binding was disposed. */
export type FloatingPanelContext = Readonly<{
  content: GuiObject;
  signal: AbortSignal;
}>;

/** Return a promise to keep content visible until the transition settles. Honor signal to cancel animation work. */
export type FloatingPanelHook = (context: FloatingPanelContext) => void | Promise<void>;

export type PanelOptions = Readonly<{
  placement?: FloatingPanelPlacement;
  gap?: number;
  delay?: number;
  onShow?: FloatingPanelHook;
  onHide?: FloatingPanelHook;
}> &
  (
    | Readonly<{ kind: 'tooltip'; followCursor: boolean; destroyContent?: boolean }>
    | Readonly<{ kind: 'popover'; openOn: 'hover' | 'click' }>
  );
