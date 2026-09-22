import { setStyle } from '../core/dom/styles.js';
import {
  color3FromRGB,
  createTextLabel,
  createUICorner,
  type GuiElement,
  type GuiObject,
  type TextLabelProperties,
  type Unsubscribe,
} from '../core/index.js';
import {
  bindFloatingPanel,
  validatePanelOptions,
  type FloatingPanelHook,
  type FloatingPanelPlacement,
} from './floating-panel.js';

/** Preferred side of the trigger or pointer; placement can flip to fit the viewport. */
export type ToolTipPlacement = FloatingPanelPlacement;

/** Appearance of generated text. Supply a GUI instance for custom layout and modifiers. */
export type ToolTipStyle = Partial<
  Pick<
    TextLabelProperties,
    | 'BackgroundColor3'
    | 'BackgroundTransparency'
    | 'TextColor3'
    | 'TextTransparency'
    | 'TextSize'
    | 'FontFamily'
    | 'FontWeight'
  >
>;

/** Placement, timing, appearance, and animation for descriptive content. */
export type ToolTipOptions = Readonly<{
  /** Tracks the pointer and starts hiding immediately on exit. Focus anchors to the trigger. */
  followCursor?: boolean;
  /** Defaults to top for static tooltips and bottom for cursor-following tooltips. */
  placement?: ToolTipPlacement;
  /** Distance from the trigger or pointer in viewport pixels. Defaults to 12. */
  gap?: number;
  /** Hover delay in milliseconds. Focus opens immediately. Defaults to 300. */
  delay?: number;
  /** Initial appearance of generated text; supplied instances retain their own styling. */
  style?: ToolTipStyle;
  /** Replaces the default spring fade-in. Content is visible before this hook runs. */
  onShow?: FloatingPanelHook;
  /** Replaces the default spring fade-out. Return a promise to delay hiding until it settles. */
  onHide?: FloatingPanelHook;
}>;

/**
 * Binds descriptive hover/focus content and returns an idempotent disposer.
 * Custom content must be detached, non-interactive, and in the trigger's document.
 * Supplied instances remain caller-owned and have their geometry and visibility restored on disposal.
 * Escape dismisses until hover/focus ends. Use withPopover for interactive content.
 *
 * @example
 * const dispose = withToolTip(button, 'Save', { followCursor: true });
 */
export const withToolTip = (
  target: GuiElement,
  content: string | GuiObject,
  options: ToolTipOptions = {},
): Unsubscribe => {
  validatePanelOptions(target, {
    ...options,
    kind: 'tooltip',
    followCursor: options.followCursor ?? false,
  });
  const tooltip =
    typeof content === 'string'
      ? createTextToolTip(target.unsafeElement.ownerDocument, content, options.style)
      : content;
  try {
    return bindFloatingPanel(target, tooltip, {
      ...options,
      kind: 'tooltip',
      followCursor: options.followCursor ?? false,
      destroyContent: typeof content === 'string',
    });
  } catch (error) {
    if (typeof content === 'string') tooltip.destroy();
    throw error;
  }
};

const createTextToolTip = (
  ownerDocument: Document,
  text: string,
  style?: ToolTipStyle,
): GuiObject => {
  const tooltip = createTextLabel(
    {
      Name: 'ToolTip',
      Text: text,
      AutomaticSize: 'XY',
      TextWrapped: true,
      TextXAlignment: 'Left',
      TextYAlignment: 'Top',
      BackgroundColor3: color3FromRGB(32, 36, 44),
      TextColor3: color3FromRGB(255, 255, 255),
      ...style,
    },
    { ownerDocument },
  );
  const textElement = tooltip.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
  // Natural text flow gives the generated bubble intrinsic size, wrapping, and padding.
  for (const [property, value] of Object.entries({
    position: 'static',
    inset: 'auto',
    display: 'block',
    padding: '8px 10px',
    'overflow-wrap': 'anywhere',
  }))
    setStyle(textElement, property, value);
  setStyle(tooltip.unsafeElement, 'max-width', 'min(320px, calc(100vw - 16px))');
  setStyle(tooltip.unsafeElement, 'max-height', 'calc(100vh - 16px)');
  setStyle(tooltip.unsafeElement, 'overflow', 'auto');
  createUICorner({ CornerRadius: 6 }).Parent = tooltip;
  return tooltip;
};
