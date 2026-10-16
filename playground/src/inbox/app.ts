import {
  bindResponsiveLayout,
  bindVirtualList,
  createFrame,
  createObservableValue,
  createScreenGui,
  createScrollingFrame,
  createTextInput,
  createUIListLayout,
  udim,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
  type ScreenGui,
} from 'framekit';

import { bindThemeColors, fonts, themes } from '../theme';
import { createButton, createText } from '../ui';
import { createMessageView, type Message, type MessageView } from './message';

/** A persistent inbox exercises measured collection views with native input and late content. */
export const createInbox = (): ScreenGui => {
  const app = createScreenGui({ Name: 'InboxApplication' });
  const theme = createObservableValue(themes.dark);

  const data: Message[] = Array.from({ length: 2000 }, (_, id) => ({
    id,
    subject: `${id % 2 ? 'Design review' : 'Delivery update'} ${id}`,
    body: `A note from the project team. ${'Please review the layout, ownership, and delivery details before the next milestone. '.repeat((id % 3) + 1)}`,
    expanded: false,
    attachment: id % 2 === 0 || id === 1999,
  }));

  const main = createFrame({
    TagName: 'main',
    Size: udim2(1, -32, 1, -32),
    Position: udim2FromOffset(16, 16),
  });

  bindThemeColors(main, theme, (palette) => ({ BackgroundColor3: palette.canvas }));
  main.Parent = app;
  createText(theme, {
    text: 'Team inbox',
    size: udim2(1, 0, 0, 36),
    textSize: 28,
    weight: 800,
  }).Parent = main;

  const query = createTextInput({
    InputType: 'Search',
    AccessibleLabel: 'Filter inbox',
    PlaceholderText: 'Search messages…',
    FontFamily: fonts.sans,
    Size: udim2(1, 0, 0, 40),
    Position: udim2FromOffset(0, 48),
  });

  bindThemeColors(query, theme, (palette) => ({
    BackgroundColor3: palette.surfaceRaised,
    TextColor3: palette.text,
    PlaceholderColor3: palette.textMuted,
  }));
  query.Parent = main;

  const actions = createFrame({
    Size: udim2(1, 0, 0, 44),
    Position: udim2FromOffset(0, 100),
    BackgroundTransparency: 1,
  });

  actions.Parent = main;
  createUIListLayout({ FillDirection: 'Horizontal', Wraps: true, Padding: udim(0, 8) }).Parent =
    actions;

  const viewport = createScrollingFrame({
    Size: udim2(1, 0, 1, -206),
    Position: udim2FromOffset(0, 158),
  });

  viewport.unsafeElement.setAttribute('aria-label', 'Inbox messages');
  bindThemeColors(viewport, theme, (palette) => ({ BackgroundColor3: palette.surface }));
  viewport.Parent = main;

  const status = createText(theme, {
    text: '',
    size: udim2(1, 0, 0, 40),
    position: udim2(0, 0, 1, -40),
    textSize: 13,
    wrapped: true,
  });

  status.unsafeElement.setAttribute('role', 'status');
  status.Parent = main;

  const selection = createObservableValue<string | number | undefined>(0);
  const visible = createObservableValue<readonly Message[]>(data);
  let images = false;
  let fontState = 'fallback font';

  const updateStatus = (): void => {
    status.Text = `${visible.get().length} messages · selected ${selection.get() ?? 'none'} · ${fontState}`;
  };

  const publish = (): void => {
    const term = query.Text.toLowerCase();
    visible.set(
      data.filter((message) => `${message.subject} ${message.body}`.toLowerCase().includes(term)),
    );
    updateStatus();
  };

  const rowViews = new WeakMap<Frame, MessageView>();

  const list = bindVirtualList(viewport, visible, {
    itemHeight: { estimate: 160 },
    overscan: 3,
    selection,
    key: (message) => message.id,

    create: () => {
      const view = createMessageView(theme);
      rowViews.set(view.node, view);

      return view.node;
    },

    update: (node, message) => rowViews.get(node)!.update(message, images),
  });

  function action(label: string, run: () => void): void {
    const button = createButton(theme, {
      label,
      size: udim2FromOffset(168, 40),
      position: udim2FromOffset(0, 0),
      textSize: 13,
    });

    button.onClick(run);
    button.Parent = actions;
  }
  action('Expand selected', () => {
    const message = data.find((message) => message.id === selection.get());

    if (!message) {
      return;
    }

    data[data.indexOf(message)] = { ...message, expanded: !message.expanded };
    publish();
  });

  action('Load attachments', () => {
    images = true;
    publish();
  });

  const font = new FontFace(
    'FrameKitInboxReading',
    'local("Arial"), local("Liberation Sans"), local("DejaVu Sans"), local("Helvetica")',
  );

  let fontTimer: ReturnType<typeof setTimeout> | undefined;
  action('Load reading font', () => {
    if (fontState !== 'fallback font') {
      return;
    }

    fontState = 'loading font';
    publish();
    fontTimer = setTimeout(() => {
      void font.load().then(
        (loaded) => {
          if (app.isDestroyed()) {
            return;
          }

          document.fonts.add(loaded);
          fontState = 'reading font ready';
          publish();
        },
        () => {
          if (!app.isDestroyed()) {
            fontState = 'font unavailable';
            publish();
          }
        },
      );
    }, 250);
  });

  action('Last message', () => {
    const key = visible.get().at(-1)?.id;

    if (key !== undefined) {
      list.scrollToKey(key);
      selection.set(key);
      viewport.focus();
    }
  });
  action('Destroy inbox', () => app.destroy());
  query.onTextChanged(publish);
  watchOwnedValue(app, selection, updateStatus);
  bindResponsiveLayout(app, {
    observe: main,
    breakpoints: [
      {
        maxWidth: 599,

        apply: () => {
          actions.Size = udim2(1, 0, 0, 136);
          viewport.setProperties({ Position: udim2FromOffset(0, 248), Size: udim2(1, 0, 1, -296) });
        },
      },
      {
        apply: () => {
          actions.Size = udim2(1, 0, 0, 88);
          viewport.setProperties({ Position: udim2FromOffset(0, 200), Size: udim2(1, 0, 1, -248) });
        },
      },
    ],
  });

  app.onDestroy(() => {
    clearTimeout(fontTimer);
    document.fonts.delete(font);
  });

  return app;
};
