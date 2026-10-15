import {
  createFrame,
  createImageLabel,
  createTextLabel,
  createUIAspectRatioConstraint,
  createUIListLayout,
  createUIPadding,
  udim,
  udim2,
  type Frame,
  type TextLabel,
  type UIAspectRatioConstraint,
} from 'framekit';

import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import attachmentUrl from './attachment.svg?no-inline';

/** Message state survives view destruction; attachments and expansion belong to the application. */
export type Message = Readonly<{
  id: number;
  subject: string;
  body: string;
  expanded: boolean;
  attachment: boolean;
}>;
export type MessageView = Readonly<{
  node: Frame;
  update(message: Message, loadImages: boolean): void;
}>;

/** One noninteractive listbox option with in-flow text and an asynchronously sized attachment. */
export const createMessageView = (theme: ThemeValue): MessageView => {
  const node = createFrame({ AutomaticSize: 'Y', Size: udim2(1, 0, 0, 0) });
  bindThemeColors(node, theme, (palette) => ({ BackgroundColor3: palette.surfaceRaised }));
  createUIListLayout({ Padding: udim(0, 10) }).Parent = node;
  createUIPadding({
    PaddingLeft: udim(0, 16),
    PaddingRight: udim(0, 16),
    PaddingTop: udim(0, 16),
    PaddingBottom: udim(0, 16),
  }).Parent = node;
  const text = (size: number, heading: boolean): TextLabel => {
    const label = createTextLabel({
      AutomaticSize: 'Y',
      Size: udim2(1, 0, 0, 0),
      TextWrapped: true,
      TextSize: size,
      FontWeight: heading ? 700 : 450,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
      FontFamily: heading ? fonts.sans : 'FrameKitInboxReading, monospace',
    });
    bindThemeColors(label, theme, (palette) => ({
      TextColor3: heading ? palette.text : palette.textMuted,
    }));
    label.Parent = node;
    return label;
  };
  const subject = text(18, true);
  const body = text(16, false);
  const image = createImageLabel({
    Size: udim2(1, 0, 0, 24),
    ScaleType: 'Fit',
    AltText: 'Weekly delivery chart',
    Visible: false,
  });
  image.Parent = node;
  let ratio: UIAspectRatioConstraint | undefined;
  image.on(
    'load',
    (event) => {
      const native = event.target as HTMLImageElement;
      if (!native.naturalWidth || !native.naturalHeight) {
        return;
      }
      image.Size = udim2(1, 0, 0, 1000);
      if (ratio) {
        ratio.AspectRatio = native.naturalWidth / native.naturalHeight;
      } else {
        ratio = createUIAspectRatioConstraint({
          AspectRatio: native.naturalWidth / native.naturalHeight,
        });
        ratio.Parent = image;
      }
      image.unsafeElement.dataset.loaded = 'true';
    },
    { capture: true },
  );
  image.on(
    'error',
    () => {
      image.Visible = false;
    },
    { capture: true },
  );
  return {
    node,
    update: (message, loadImages): void => {
      node.unsafeElement.dataset.messageId = String(message.id);
      node.unsafeElement.setAttribute('aria-label', message.subject);
      subject.Text = message.subject;
      body.Text =
        message.body +
        (message.expanded
          ? '\n\nDecision history\nThe team reviewed the details, checked ownership, and agreed on the next delivery.\n\nFollow-up\nKeep the discussion and draft in application state while rows leave the viewport.'
          : '');
      image.Visible = message.attachment && loadImages;
      image.Image = image.Visible ? `${attachmentUrl}?message=${message.id}` : '';
    },
  };
};
