import { createFrame, createFrameWithFields, type FrameNode } from '../elements/frame';
import {
  createTextButton,
  createTextLabel,
  type TextButtonNode,
  type TextLabelNode,
} from '../elements/text';
import { createUICorner } from '../modifiers/corner';
import { addCleanup } from '../runtime/node-lifecycle';
import { assertBoolean } from '../runtime/validation';
import { udim2, udim2FromOffset, udim2FromScale } from '../values/udim';
import { vector2 } from '../values/vector2';
import { prefabColors } from './palette';

/** Initial content and behavior for a modal prefab. */
export type ModalOptions = Readonly<{
  /** Hierarchy name for the modal root. */
  Name?: string;
  /** Text shown in the modal header. */
  Title?: string;
  /** Whether the modal starts visible. */
  InitiallyOpen?: boolean;
  /** Whether clicking the backdrop closes the modal. */
  DismissOnBackdrop?: boolean;
}>;

/** A modal hierarchy whose root remains an ordinary FrameKit Frame. */
export type ModalNode = FrameNode &
  Readonly<{
    /** Full-size button behind the dialog panel. */
    backdrop: TextButtonNode;
    /** Centered visual container for the dialog. */
    panel: FrameNode;
    /** Header text within the panel. */
    titleLabel: TextLabelNode;
    /** Header button that closes the modal. */
    closeButton: TextButtonNode;
    /** Container intended for application-owned modal content. */
    content: FrameNode;
    /** Makes the modal visible and focuses its close button. */
    open(): void;
    /** Hides the modal without destroying it. */
    close(): void;
    /** Switches between the open and closed states. */
    toggle(): void;
    /** Reports whether the modal is currently visible. */
    isOpen(): boolean;
  }>;

/** Creates a modal with a backdrop, panel, header, close button, and content container. */
export function createModal(options: ModalOptions = {}): ModalNode {
  const initiallyOpen = options.InitiallyOpen ?? false;
  const dismissOnBackdrop = options.DismissOnBackdrop ?? true;
  assertBoolean(initiallyOpen, 'InitiallyOpen');
  assertBoolean(dismissOnBackdrop, 'DismissOnBackdrop');

  const backdrop = createTextButton({
    Name: 'Backdrop',
    Text: '',
    Size: udim2FromScale(1, 1),
    BackgroundColor3: prefabColors.backdrop,
    BackgroundTransparency: 0.35,
    ZIndex: 1,
  });
  backdrop.element.tabIndex = -1;
  backdrop.element.setAttribute('aria-hidden', 'true');

  const panel = createFrame({
    Name: 'Panel',
    Size: udim2(0, 480, 0, 320),
    Position: udim2FromScale(0.5, 0.5),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: prefabColors.panel,
    ClipsDescendants: true,
    ZIndex: 2,
  });
  panel.element.setAttribute('role', 'dialog');
  panel.element.setAttribute('aria-modal', 'true');
  panel.element.setAttribute('aria-label', options.Title ?? 'Dialog');
  panel.addChild(createUICorner({ CornerRadius: 12 }));

  const titleLabel = createTextLabel({
    Name: 'Title',
    Text: options.Title ?? 'Dialog',
    Size: udim2(1, -64, 0, 52),
    Position: udim2FromOffset(20, 0),
    BackgroundTransparency: 1,
    TextColor3: prefabColors.text,
    TextSize: 18,
    FontWeight: 700,
    TextXAlignment: 'Left',
    ZIndex: 3,
  });

  const closeButton = createTextButton({
    Name: 'CloseButton',
    Text: '×',
    Size: udim2FromOffset(36, 36),
    Position: udim2(1, -44, 0, 8),
    BackgroundColor3: prefabColors.surface,
    TextColor3: prefabColors.text,
    TextSize: 22,
    ZIndex: 3,
  });
  closeButton.element.setAttribute('aria-label', 'Close modal');
  closeButton.addChild(createUICorner({ CornerRadius: 8 }));

  const content = createFrame({
    Name: 'Content',
    Size: udim2(1, -40, 1, -72),
    Position: udim2FromOffset(20, 52),
    BackgroundTransparency: 1,
    ZIndex: 2,
  });

  const modal: ModalNode = createFrameWithFields(
    {
      Name: options.Name ?? 'Modal',
      Size: udim2FromScale(1, 1),
      BackgroundTransparency: 1,
      Visible: initiallyOpen,
      ZIndex: 100,
    },
    {
      backdrop,
      panel,
      titleLabel,
      closeButton,
      content,
      open: () => {
        modal.Visible = true;
        closeButton.element.focus();
      },
      close: () => {
        modal.Visible = false;
      },
      toggle: () => {
        modal.Visible = !modal.Visible;
      },
      isOpen: () => modal.Visible,
    },
  );

  modal.addChild(backdrop);
  modal.addChild(panel);
  panel.addChild(titleLabel);
  panel.addChild(closeButton);
  panel.addChild(content);

  closeButton.onClick(() => modal.close());
  backdrop.onClick(() => {
    if (dismissOnBackdrop) modal.close();
  });
  const keyboardListeners = new AbortController();
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && modal.Visible) modal.close();
    },
    { signal: keyboardListeners.signal },
  );
  addCleanup(modal, () => keyboardListeners.abort());
  return modal;
}
