import type { GuiElement, GuiObject, Unsubscribe } from '../core/index.js';
import {
  bindFloatingPanel,
  type FloatingPanelHook,
  type FloatingPanelPlacement,
} from './floating-panel.js';

/** Trigger, placement, and animation for a caller-owned interactive panel. */
export type PopoverOptions = Readonly<{
  /** Click opens by default. Hover also opens on focus; click remains available for touch. */
  openOn?: 'hover' | 'click';
  /** Preferred side of the trigger. Defaults to bottom, flipping when necessary. */
  placement?: FloatingPanelPlacement;
  /** Distance from the trigger in viewport pixels. Defaults to 12. */
  gap?: number;
  /** Hover delay in milliseconds. Focus and click open immediately. Defaults to 150. */
  delay?: number;
  /** Replaces the default spring fade-in. Content is visible before this hook runs. */
  onShow?: FloatingPanelHook;
  /** Replaces the default spring fade-out. Return a promise to delay hiding until it settles. */
  onHide?: FloatingPanelHook;
}>;

/**
 * Binds a detached panel containing buttons, links, or other controls.
 * Hover panels stay open while their trigger or content is hovered or focused.
 * Escape and outside clicks dismiss. ArrowDown or Tab from an open trigger enters the panel.
 * The disposer restores supplied content and trigger accessibility attributes without destroying it.
 *
 * @example
 * const dispose = withPopover(button, dropdownFrame, { openOn: 'hover' });
 */
export const withPopover = (
  target: GuiElement,
  content: GuiObject,
  options: PopoverOptions = {},
): Unsubscribe =>
  bindFloatingPanel(target, content, {
    ...options,
    kind: 'popover',
    openOn: options.openOn ?? 'click',
  });
