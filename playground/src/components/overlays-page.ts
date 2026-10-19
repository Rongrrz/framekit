import {
  type Frame,
  type GuiElement,
  type ObservableValue,
  bindTooltip,
  createUIFlexItem,
  udim2,
  udim2FromOffset,
} from 'framekit';

import popoverExample from '../../examples/overlays/popover.ts?example';
import tooltipExample from '../../examples/overlays/tooltip.ts?example';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import type { SitePage } from '../router';
import { typeScale, type ThemeValue } from '../theme';
import { createButton, createSurface, createText } from '../ui';
import { createCodeBlock } from './code-block';
import {
  appendArticleTitle,
  appendArticleSection,
  appendCallout,
  appendOutline,
  createDocsShell,
  createExampleRow,
  appendPageNavigation,
} from './docs-shell';
import { appendPopoverExamples } from './popover-examples';

export const createOverlaysPage = (
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  scrollTo: (target: GuiElement) => void,
): Frame => {
  const shell = createDocsShell('OverlaysPage', 'overlays', theme, route);
  appendArticleTitle(
    shell.article,
    theme,
    'BUILD / OVERLAYS',
    'Tooltips & popovers',
    'Use a tooltip for a short explanation and a popover for interactive content. Both handle placement, focus, Escape, and owned cleanup.',
  );

  const tooltip = appendArticleSection(
    shell.article,
    theme,
    'Explain with a tooltip',
    'bindTooltip(target, textOrFrame, options?) opens on hover or keyboard focus (focus-visible). Clicking does not keep it open after the pointer leaves. Choose placement, gap, delay, followCursor, or style. Escape dismisses it; keyboard focus anchors cursor-following tooltips to the trigger.',
  );

  createCodeBlock(theme, 'TooltipCode', tooltipExample).Parent = shell.article;
  appendTooltipExamples(shell.article, layout, theme);

  const popover = appendArticleSection(
    shell.article,
    theme,
    'Make a popover interactive',
    'Pass a live, detached Frame as content. openOn defaults to click; hover mode also supports focus and activation. Tab reaches controls in the panel. Escape or an outside click dismisses it.',
  );

  createCodeBlock(theme, 'PopoverCode', popoverExample).Parent = shell.article;

  appendCallout(
    shell.article,
    theme,
    'Supplied tooltip and popover Frames remain caller-owned. Destroy them when your feature ends. Disposing the binding removes its behavior and restores the supplied content; it does not destroy that content.',
  );

  const examples = appendPopoverExamples(shell.article, layout, theme);
  appendCallout(
    shell.article,
    theme,
    'Custom onShow/onHide hooks receive content and an AbortSignal. Honor cancellation on re-entry or disposal; return a promise when hiding should wait for animation. Omit hooks for built-in spring motion and reduced-motion support.',
  );

  appendOutline(
    shell.outline,
    theme,
    [
      { label: 'Tooltips', target: tooltip },
      { label: 'Popovers', target: popover },
      { label: 'Live examples', target: examples },
    ],
    scrollTo,
  );
  appendPageNavigation(shell.article, theme, 'overlays');

  return shell.page;
};

const appendTooltipExamples = (
  article: Frame,
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
): void => {
  const row = createExampleRow(article, layout);

  const buttons = ['Anchored text', 'Follow cursor', 'Custom Frame'].map((label, index) => {
    const button = createButton(theme, {
      label,
      name: `TooltipExample${index + 1}`,
      position: udim2FromOffset(0, 0),
      size: udim2FromOffset(216, 44),
    });

    bindLayoutProperties(button, layout, button, {
      desktop: {
        Size: udim2FromOffset(216, 44),
      },
      mobile: {
        Size: udim2(1, 0, 0, 44),
      },
    });
    createUIFlexItem().Parent = button;
    button.Parent = row;

    return button;
  });

  bindTooltip(buttons[0]!, 'I stay above this button. You can hover over me.');
  bindTooltip(buttons[1]!, 'I follow the pointer and fade when you leave.', {
    followCursor: true,
  });

  const custom = createSurface(theme, {
    name: 'CustomTooltip',
    size: udim2FromOffset(260, 100),
    background: 'surfaceRaised',
    radius: 12,
  });

  createText(theme, {
    text: 'Your own Frame',
    size: udim2FromOffset(232, 26),
    position: udim2FromOffset(14, 10),
    color: 'accent',
    weight: 800,
  }).Parent = custom;

  createText(theme, {
    text: 'Custom layout and theme colors.\nFades as soon as you leave.',
    size: udim2FromOffset(232, 48),
    position: udim2FromOffset(14, 40),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
  }).Parent = custom;

  const customButton = buttons[2]!;
  bindTooltip(customButton, custom, { followCursor: true });
  // Supplied content remains caller-owned after the binding is released.
  customButton.onDestroy(() => custom.destroy());
};
