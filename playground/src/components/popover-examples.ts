import {
  type FloatingPanelContext,
  type Frame,
  type PopoverOptions,
  type TextLabel,
  udim2,
  udim2FromOffset,
  type ObservableValue,
  bindPopover,
} from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { typeScale, type ThemeValue } from '../theme';
import { createButton, createSurface, createText } from '../ui';
import { appendArticleSection, appendCodeBlock, createExampleRow } from './docs-shell';

/** Owns the interactive dropdown examples and their caller-owned content. */
export const appendPopoverExamples = (
  article: Frame,
  layout: ObservableValue<PlaygroundLayout>,
  theme: ThemeValue,
): TextLabel => {
  const heading = appendArticleSection(
    article,
    theme,
    'Interactive popovers',
    'Hover, focus, or click to open. Tab enters the buttons; Escape or clicking outside closes. Try the actions below.',
  );
  const status = createText(theme, {
    text: 'Choose an action in either dropdown.',
    name: 'PopoverExampleStatus',
    size: udim2(1, 0, 0, 40),
    textSize: typeScale.small,
    color: 'textMuted',
    wrapped: true,
  });
  status.unsafeElement.setAttribute('role', 'status');
  const row = createExampleRow(article, layout);
  let count = 0;
  for (const [index, label] of ['Default spring', 'Custom fade + blur'].entries()) {
    const trigger = createButton(theme, {
      label,
      name: `PopoverExample${index + 1}`,
      position: udim2FromOffset(0, 0),
      size: udim2FromOffset(332, 44),
    });
    bindLayoutProperties(trigger, layout, trigger, {
      desktop: {
        Size: udim2FromOffset(332, 44),
      },
      mobile: {
        Size: udim2FromOffset(358, 44),
      },
    });
    trigger.Parent = row;
    const panel = createSurface(theme, {
      name: `PopoverExamplePanel${index + 1}`,
      size: udim2FromOffset(250, 172),
      background: 'surfaceRaised',
      radius: 12,
    });
    panel.unsafeElement.setAttribute('aria-label', `${label} actions`);
    const actions = [
      [
        'Say hello',
        () => {
          status.Text = 'Hello from the dropdown!';
        },
      ],
      [
        'Count clicks',
        () => {
          status.Text = `Button clicked ${++count} time${count === 1 ? '' : 's'}.`;
        },
      ],
      [
        'Reset',
        () => {
          count = 0;
          status.Text = 'Choose an action in either dropdown.';
        },
      ],
    ] as const;
    for (const [actionIndex, [text, action]] of actions.entries()) {
      const button = createButton(theme, {
        label: text,
        size: udim2FromOffset(226, 40),
        position: udim2FromOffset(12, 12 + actionIndex * 52),
        background: 'surface',
      });
      button.onClick(action);
      button.Parent = panel;
    }
    bindPopover(trigger, panel, {
      openOn: 'hover',
      gap: 8,
      ...(index === 1 ? createPopoverAnimation() : {}),
    });
    trigger.onDestroy(() => panel.destroy());
  }
  status.Parent = article;
  appendCodeBlock(article, theme, 'PopoverHooksCode', [
    { text: 'const dispose = bindPopover(button, dropdown, {', color: 'accent' },
    { text: "  openOn: 'hover', placement: 'bottom'," },
    { text: '  onShow: ({ content, signal }) =>' },
    { text: '    animateIn(content, signal),' },
    { text: '  onHide: ({ content, signal }) =>' },
    { text: '    animateOut(content, signal),' },
    { text: '});' },
    { text: '// Return a promise to finish hiding after your animation.' },
    { text: '// Honor signal to cancel on re-entry or disposal.' },
    { text: '// The same hooks work with bindTooltip().' },
    { text: '// Omit hooks for the built-in spring and reduced-motion support.' },
  ]);
  return heading;
};

/** A caller-defined opacity/blur animation; its signal cancels native animation work. */
const createPopoverAnimation = (): Pick<PopoverOptions, 'onShow' | 'onHide'> => {
  let opacity = 0;
  const animate = async (
    { content, signal }: FloatingPanelContext,
    showing: boolean,
  ): Promise<void> => {
    const element = content.unsafeElement;
    const window = element.ownerDocument.defaultView!;
    const destination = showing ? 1 : 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      opacity = destination;
      return;
    }
    const animation = element.animate(
      [
        { opacity, filter: `blur(${(1 - opacity) * 4}px)` },
        { opacity: destination, filter: `blur(${(1 - destination) * 4}px)` },
      ],
      { duration: 180 * Math.abs(destination - opacity), easing: 'ease-out' },
    );
    const cancel = (): void => {
      opacity = Number(window.getComputedStyle(element).opacity);
      animation.cancel();
    };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      await animation.finished;
      opacity = destination;
    } catch (error) {
      if (!signal.aborted) throw error;
    } finally {
      signal.removeEventListener('abort', cancel);
      animation.cancel();
    }
  };
  return {
    onShow: (context) => animate(context, true),
    onHide: (context) => animate(context, false),
  };
};
