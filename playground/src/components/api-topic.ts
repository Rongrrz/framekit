import { fk } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { colors, fonts } from '../theme';
import { addRoundedBorder, appendCodeLine, createText, updateTextLines } from '../ui';

export type ApiTopic = Readonly<{
  tab: string;
  eyebrow: string;
  title: string;
  body: string;
  tokens: string;
  lines: readonly string[];
}>;

/** Owns the selected API explanation and code example. */
export function createApiTopicPanel(
  layout: fk.Value<PlaygroundLayout>,
  selectedTopic: fk.Value<ApiTopic>,
): fk.Frame {
  const panel = fk.createFrame({ Name: 'ApiTopic', BackgroundColor3: colors.paperRaised });
  addRoundedBorder(panel, 22, colors.inkSoft, 2);
  bindLayoutProperties(panel, layout, panel, {
    desktop: {
      Size: fk.udim2FromOffset(824, 520),
      Position: fk.udim2FromOffset(256, 0),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 698),
      Position: fk.udim2FromOffset(0, 132),
    },
  });

  const eyebrow = createText({
    text: '',
    size: fk.udim2FromOffset(310, 28),
    position: fk.udim2FromOffset(24, 24),
    color: colors.coral,
    textSize: 10,
    font: fonts.mono,
  });
  const title = createText({
    text: '',
    size: fk.udim2FromOffset(310, 48),
    position: fk.udim2FromOffset(24, 62),
    color: colors.darkText,
    textSize: 25,
    weight: 900,
  });
  const body = createText({
    text: '',
    size: fk.udim2FromOffset(310, 104),
    position: fk.udim2FromOffset(24, 116),
    color: colors.darkMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });
  const tokens = createText({
    text: '',
    size: fk.udim2FromOffset(310, 76),
    position: fk.udim2FromOffset(24, 226),
    color: colors.darkText,
    textSize: 10,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });

  for (const label of [eyebrow, title, body, tokens]) panel.addChild(label);
  for (const label of [eyebrow, title, body, tokens]) {
    bindLayoutProperties(panel, layout, label, {
      desktop: { Size: fk.udim2FromOffset(334, label.Size.Y.Offset) },
      mobile: { Size: fk.udim2FromOffset(310, label.Size.Y.Offset) },
    });
  }

  const code = fk.createFrame({ BackgroundColor3: colors.ink });
  addRoundedBorder(code, 16, colors.inkSoft);
  bindLayoutProperties(panel, layout, code, {
    desktop: {
      Size: fk.udim2FromOffset(420, 472),
      Position: fk.udim2FromOffset(380, 24),
    },
    mobile: {
      Size: fk.udim2FromOffset(310, 352),
      Position: fk.udim2FromOffset(24, 322),
    },
  });
  const lines = Array.from({ length: 7 }, (_, index) =>
    appendCodeLine(code, '', 24 + index * 44, index % 3 === 0 ? colors.violet : colors.textMuted),
  );
  panel.addChild(code);
  panel.watch(selectedTopic, (topic) => {
    eyebrow.Text = topic.eyebrow;
    title.Text = topic.title;
    body.Text = topic.body;
    tokens.Text = topic.tokens;
    updateTextLines(lines, topic.lines);
  });

  return panel;
}
