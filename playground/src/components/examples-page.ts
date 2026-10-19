import {
  createFrame,
  createObservableValue,
  createUIListLayout,
  udim,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
  type ObservableValue,
} from 'framekit';

import { createCollection } from '../collections';
import { createInbox } from '../inbox/app';
import { navigationHeight } from '../page-shell';
import type { SitePage } from '../router';
import { bindThemeColors, type ThemeValue } from '../theme';
import { createButton, createText } from '../ui';

const examples = ['Fixed rows', 'Measured rows', 'Inbox'] as const;
type Example = (typeof examples)[number];

/** Shares the app shell while mounting only the selected example and its owned resources. */
export const createExamplesPage = (theme: ThemeValue, route: ObservableValue<SitePage>): Frame => {
  const page = createFrame({
    Name: 'ExamplesPage',
    TagName: 'main',
    Position: udim2FromOffset(0, navigationHeight),
    Size: udim2(1, 0, 1, -navigationHeight),
    Visible: false,
  });
  page.unsafeElement.setAttribute('aria-label', 'FrameKit examples');
  bindThemeColors(page, theme, (palette) => ({ BackgroundColor3: palette.canvas }));

  const heading = createText(theme, {
    text: 'Examples',
    size: udim2(1, -160, 0, 40),
    position: udim2FromOffset(16, 8),
    textSize: 28,
    weight: 800,
  });
  heading.unsafeElement.setAttribute('role', 'heading');
  heading.unsafeElement.setAttribute('aria-level', '1');
  heading.Parent = page;

  const tabs = createFrame({
    Name: 'ExampleTabs',
    Size: udim2(1, -32, 0, 36),
    Position: udim2FromOffset(16, 56),
    BackgroundTransparency: 1,
  });
  tabs.unsafeElement.setAttribute('role', 'tablist');
  tabs.unsafeElement.setAttribute('aria-label', 'Examples');
  createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 8) }).Parent = tabs;
  tabs.Parent = page;

  const content = createFrame({
    Name: 'ExampleContent',
    Position: udim2FromOffset(0, 104),
    Size: udim2(1, 0, 1, -104),
    BackgroundTransparency: 1,
  });
  content.unsafeElement.id = 'pg-example-content';
  content.unsafeElement.setAttribute('role', 'tabpanel');
  content.Parent = page;

  const selected = createObservableValue<Example>('Fixed rows');
  let active: Frame | undefined;

  const mountExample = (): void => {
    active?.destroy();
    active = undefined;

    if (route.get() !== 'examples') {
      return;
    }

    active =
      selected.get() === 'Inbox'
        ? createInbox(theme)
        : createCollection(theme, selected.get() === 'Measured rows');
    active.Parent = content;
  };

  const buttons = examples.map((example, index) => {
    const button = createButton(theme, {
      label: example,
      position: udim2FromOffset(0, 0),
      size: udim2(1 / 3, -16 / 3, 0, 36),
      textSize: 13,
    });
    button.unsafeElement.id = `pg-example-${index}`;
    button.unsafeElement.setAttribute('role', 'tab');
    button.unsafeElement.setAttribute('aria-controls', content.unsafeElement.id);
    button.onClick(() => selected.set(example));
    button.Parent = tabs;

    const update = (): void => {
      const current = selected.get() === example;
      button.unsafeElement.setAttribute('aria-selected', String(current));
      button.unsafeElement.tabIndex = current ? 0 : -1;
      button.BackgroundColor3 = current ? theme.get().accentMuted : theme.get().surfaceRaised;

      if (current) {
        content.unsafeElement.setAttribute('aria-labelledby', button.unsafeElement.id);
      }
    };
    watchOwnedValue(button, selected, update);
    watchOwnedValue(button, theme, update);

    return button;
  });

  tabs.on('keydown', (event) => {
    const current = examples.indexOf(selected.get());
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? examples.length - 1
          : event.key === 'ArrowRight'
            ? (current + 1) % examples.length
            : event.key === 'ArrowLeft'
              ? (current + examples.length - 1) % examples.length
              : undefined;

    if (next !== undefined) {
      event.preventDefault();
      selected.set(examples[next]!);
      buttons[next]!.focus();
    }
  });

  const reset = createButton(theme, {
    label: 'Reset example',
    size: udim2FromOffset(120, 36),
    position: udim2(1, -136, 0, 10),
    textSize: 13,
  });
  reset.onClick(mountExample);
  reset.Parent = page;

  page.onDestroy(selected.onChange(mountExample));
  watchOwnedValue(page, route, (current) => {
    page.Visible = current === 'examples';
    mountExample();

    if (page.Visible && page.unsafeElement.isConnected) {
      heading.unsafeElement.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  });

  return page;
};
