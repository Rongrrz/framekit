import { createFrame, type Frame, type FrameProperties } from '#elements/frame.js';
import { createScreenGui, type ScreenGui } from '#elements/screen-gui.js';
import { createScrollingFrame, type ScrollingFrame } from '#elements/scrolling-frame.js';
import { createTextInput, type TextInput } from '#elements/text-input.js';
import {
  createTextButton,
  createTextLabel,
  type TextLabel,
  type TextButton,
  type TextLabelProperties,
  type TextButtonProperties,
} from '#elements/text.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { createUICorner } from '#modifiers/corner.js';
import { color3FromHex } from '#values/color3.js';
import { udim2, udim2FromOffset } from '#values/udim.js';

export const colors = {
  paper: color3FromHex('#ffffff'),
  canvas: color3FromHex('#f7f8fa'),
  ink: color3FromHex('#202833'),
  muted: color3FromHex('#697480'),
  line: color3FromHex('#e7eaf0'),
  accent: color3FromHex('#167553'),
  selected: color3FromHex('#e9f4ee'),
};

/** Inspector-only styles affect native focus/hover and decoration, never application nodes. */
export const installInspectorStyles = (owner: GuiElement): void => {
  const document = owner.unsafeElement.ownerDocument;
  const style = document.createElement('style');
  style.nonce =
    document.querySelector<HTMLStyleElement>('style[data-framekit-styles]')?.nonce ?? '';
  style.textContent = `
    [data-fk-debug] { color-scheme: light; }
    [data-fk-debug] button { cursor: pointer; border: 0; }
    [data-fk-debug] button:hover:not(:disabled) { filter: brightness(.96); }
    [data-fk-debug] button:disabled { cursor: default; opacity: .35; }
    [data-fk-debug] :focus-visible { outline: 2px solid #248961; outline-offset: -2px; }
    [data-fk-debug] [role=treeitem]:hover { box-shadow: inset 0 0 0 999px #20283306; }
    [data-fk-debug] [role=treeitem] { cursor: default; }
    [data-fk-debug] input { padding: 0 12px !important; }
    [data-fk-debug] [data-debug-value] { user-select: text; }
    [data-fk-debug-panel] { border: 1px solid #dfe4eb; box-shadow: 0 20px 80px #17223330, 0 2px 8px #17223312; }
    [data-fk-debug-panel] [role=separator]:hover, [data-fk-debug-panel] [role=separator]:focus-visible { background: #24896133 !important; }
  `;
  document.head.append(style);
  owner.onDestroy(() => style.remove());
};

/** The route owns its entry point so applications only need to bind devtools. */
export const createInspectorLauncher = (document: Document, open: () => void): ScreenGui => {
  const gui = createScreenGui(
    { Name: 'FrameKitDevtoolsLauncher', DisplayOrder: 9999 },
    { ownerDocument: document },
  );
  gui.unsafeElement.dataset.fkDebug = '';
  gui.unsafeElement.style.pointerEvents = 'none';
  installInspectorStyles(gui);
  const button = createDebugUI(document).button(gui, 'Debug', {
    Name: 'OpenRuntimeInspector',
    AccessibleLabel: 'Debug',
    Size: udim2FromOffset(104, 36),
    Position: udim2(1, -120, 1, -52),
    BackgroundColor3: colors.ink,
    TextColor3: colors.paper,
  });
  button.unsafeElement.style.pointerEvents = 'auto';
  button.unsafeElement.style.boxShadow = '0 4px 20px #17223330';
  button.onClick(() => {
    // Safari does not focus buttons on pointer activation; keep the return target consistent.
    button.focus();
    open();
  });
  return gui;
};

/** Native creation options keep secondary documents isolated from the global document. */
export const createDebugUI = (ownerDocument: Document) => {
  const options = { ownerDocument };
  const frame = (
    parent: GuiElement | undefined,
    properties: Partial<FrameProperties> = {},
  ): Frame => {
    const node = createFrame({ BackgroundTransparency: 1, ...properties }, options);
    node.Parent = parent;
    return node;
  };
  const label = (
    parent: GuiElement | undefined,
    Text: string,
    properties: Partial<TextLabelProperties> = {},
  ): TextLabel => {
    const node = createTextLabel(
      {
        Text,
        TextSize: 12,
        TextXAlignment: 'Left',
        FontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        TextColor3: colors.ink,
        BackgroundTransparency: 1,
        Size: udim2(1, 0, 0, 28),
        ClipsDescendants: true,
        ...properties,
      },
      options,
    );
    node.Parent = parent;
    return node;
  };
  const button = (
    parent: GuiElement | undefined,
    Text: string,
    properties: Partial<TextButtonProperties> = {},
  ): TextButton => {
    const node = createTextButton(
      {
        Text,
        AutoButtonColor: false,
        FontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        TextSize: 12,
        FontWeight: 550,
        TextColor3: colors.ink,
        BackgroundColor3: colors.canvas,
        Size: udim2FromOffset(32, 32),
        ...properties,
      },
      options,
    );
    createUICorner({ CornerRadius: 7 }).Parent = node;
    node.Parent = parent;
    return node;
  };
  const input = (
    parent: GuiElement | undefined,
    AccessibleLabel: string,
    PlaceholderText: string,
  ): TextInput => {
    const node = createTextInput(
      {
        AccessibleLabel,
        PlaceholderText,
        InputType: 'Search',
        TextSize: 12,
        TextXAlignment: 'Left',
        TextColor3: colors.ink,
        PlaceholderColor3: colors.muted,
        BackgroundColor3: colors.canvas,
        Size: udim2(1, -24, 0, 36),
      },
      options,
    );
    createUICorner({ CornerRadius: 8 }).Parent = node;
    node.Parent = parent;
    return node;
  };
  const scroll = (parent: GuiElement | undefined, label: string): ScrollingFrame => {
    const node = createScrollingFrame(
      {
        BackgroundTransparency: 1,
        AutomaticCanvasSize: 'Y',
        ScrollingDirection: 'Y',
        ScrollBarImageColor3: colors.line,
        ScrollBarThickness: 6,
      },
      options,
    );
    node.unsafeElement.setAttribute('aria-label', label);
    node.Parent = parent;
    return node;
  };
  return { frame, label, button, input, scroll };
};
