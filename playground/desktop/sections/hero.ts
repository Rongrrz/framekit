import { fk } from 'framekit';

import { bindButtonMotion, copyCommand } from '../../shared/interaction';
import { button, codeLine, decorate, pill, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { contentWidth, pageSection, scaledPosition, scaledSize, sectionContent } from '../geometry';
import { sectionLayout } from '../layout';

type CanvasMode = 'frame' | 'text' | 'layout' | 'motion';

const { top, height } = sectionLayout.hero;
const modeOrder: readonly CanvasMode[] = ['frame', 'text', 'layout', 'motion'];
const modeContent = {
  frame: {
    title: 'READY PLAYER',
    body: 'Your interface is a typed tree of explicit nodes.',
    accent: colors.coral,
    rotation: -1,
    lines: [
      'const card = fk.createFrame({',
      '  Size: fk.udim2FromOffset(320, 180),',
      '  BackgroundColor3: coral,',
      '});',
      'fk.append(screen, card);',
    ],
  },
  text: {
    title: 'TYPE, THEN SHIP',
    body: 'Labels and buttons share a predictable text contract.',
    accent: colors.violet,
    rotation: 1.5,
    lines: [
      'const title = fk.createTextLabel({',
      "  Text: 'Inventory ready',",
      '  TextSize: 24,',
      "  TextXAlignment: 'Left',",
      '});',
    ],
  },
  layout: {
    title: 'LAYOUT AS VALUES',
    body: 'Scale and offset stay readable from editor to runtime.',
    accent: colors.amber,
    rotation: -2,
    lines: [
      'fk.createUIListLayout({',
      "  FillDirection: 'Horizontal',",
      '  Padding: fk.udim(0, 12),',
      '  Wraps: true,',
      '});',
    ],
  },
  motion: {
    title: 'RETARGET. DONE.',
    body: 'Springs keep continuity while the goal keeps changing.',
    accent: colors.mint,
    rotation: 2,
    lines: [
      'const motion = fk.createMotion(card);',
      'motion.spring({',
      '  Position: nextPosition,',
      '  Rotation: nextRotation,',
      '});',
    ],
  },
} as const;

export function createHero(onExplore: () => void): fk.FrameNode {
  const section = pageSection('Hero', top, height, colors.ink);
  const content = sectionContent();

  fk.append(
    content,
    pill(
      'ROBLOX-INSPIRED  ·  BROWSER-NATIVE',
      scaledSize(306, 38, contentWidth, height),
      scaledPosition(0, 74, contentWidth, height),
      colors.mint,
    ),
  );
  fk.append(
    content,
    text({
      name: 'HeroHeadline',
      text: 'Build browser interfaces like a game UI.',
      size: scaledSize(590, 260, contentWidth, height),
      position: scaledPosition(0, 128, contentWidth, height),
      textSize: 62,
      weight: 900,
      yAlignment: 'Top',
      wrapped: true,
    }),
  );
  fk.append(
    content,
    text({
      text: 'Typed nodes, familiar UDim2 layout, explicit state, and motion that stays out of your way. FrameKit brings the Roblox UI mental model to the DOM.',
      size: scaledSize(536, 112, contentWidth, height),
      position: scaledPosition(0, 396, contentWidth, height),
      color: colors.textMuted,
      textSize: 18,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  const explore = button(
    'EXPLORE THE SYSTEM  ↓',
    scaledSize(214, 52, contentWidth, height),
    scaledPosition(0, 532, contentWidth, height),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(explore, colors.coral, colors.amber);
  fk.on(explore, 'MouseButton1Click', onExplore);
  fk.append(content, explore);

  const install = button(
    'COPY  npm i framekit',
    scaledSize(204, 52, contentWidth, height),
    scaledPosition(228, 532, contentWidth, height),
    colors.inkRaised,
    colors.text,
  );
  fk.update(install, { FontFamily: fonts.mono, TextSize: 12 });
  bindButtonMotion(install, colors.inkRaised, colors.inkSoft);
  fk.on(install, 'MouseButton1Click', () => {
    void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit');
  });
  fk.append(content, install);

  const metrics = [
    ['0', 'CSS CLASSES'],
    ['55', 'TESTS PASSING'],
    ['6', 'VALUE TYPES'],
  ] as const;
  for (const [index, [value, label]] of metrics.entries()) {
    const x = index * 174;
    fk.append(
      content,
      text({
        text: value,
        size: scaledSize(54, 28, contentWidth, height),
        position: scaledPosition(x, 628, contentWidth, height),
        color: [colors.coral, colors.mint, colors.violet][index]!,
        textSize: 20,
        weight: 850,
      }),
    );
    fk.append(
      content,
      text({
        text: label,
        size: scaledSize(120, 28, contentWidth, height),
        position: scaledPosition(x + 44, 628, contentWidth, height),
        color: colors.textMuted,
        textSize: 10,
        font: fonts.mono,
      }),
    );
  }

  const canvas = createHeroCanvas();
  fk.append(content, canvas);
  fk.append(section, content);

  const scale = fk.createUIScale({ Scale: 0.94 });
  fk.append(canvas, scale);
  const scaleMotion = fk.createMotion(scale, { tension: 180, friction: 20 });
  const canvasMotion = fk.createMotion(canvas, { tension: 190, friction: 21 });
  scaleMotion.spring({ Scale: 1 });
  canvasMotion.spring({ Rotation: 0 });
  fk.on(canvas, 'MouseEnter', () => {
    scaleMotion.spring({ Scale: 1.015 });
    canvasMotion.spring({ Rotation: 0.7 });
  });
  fk.on(canvas, 'MouseLeave', () => {
    scaleMotion.spring({ Scale: 1 });
    canvasMotion.spring({ Rotation: 0 });
  });
  return section;
}

function createHeroCanvas(): fk.FrameNode {
  const mode = fk.state.observable<CanvasMode>('frame');
  const canvas = fk.createFrame({
    Name: 'InteractiveInterfacePreview',
    Size: scaledSize(500, 580, contentWidth, height),
    Position: scaledPosition(620, 72, contentWidth, height),
    BackgroundColor3: colors.paper,
    Rotation: 2.5,
    ClipsDescendants: true,
  });
  decorate(canvas, 28, colors.violet, 2);

  const topbar = fk.createFrame({
    Name: 'PreviewTopbar',
    Size: fk.udim2(1, 0, 0, 58),
    BackgroundColor3: colors.paperRaised,
  });
  fk.append(topbar, fk.createUIStroke({ Color: colors.paperMuted, Thickness: 1 }));
  for (const [index, color] of [colors.coral, colors.amber, colors.mint].entries()) {
    const dot = fk.createFrame({
      Size: fk.udim2FromOffset(10, 10),
      Position: fk.udim2FromOffset(20 + index * 18, 24),
      BackgroundColor3: color,
    });
    fk.append(dot, fk.createUICorner({ CornerRadius: 5 }));
    fk.append(topbar, dot);
  }
  fk.append(
    topbar,
    text({
      text: 'Interface.framekit',
      size: fk.udim2FromOffset(230, 30),
      position: fk.udim2FromOffset(142, 14),
      color: colors.darkMuted,
      textSize: 12,
      font: fonts.mono,
      xAlignment: 'Center',
    }),
  );
  fk.append(canvas, topbar);

  const sidebar = fk.createFrame({
    Name: 'PreviewModePicker',
    Size: fk.udim2FromOffset(126, 522),
    Position: fk.udim2FromOffset(0, 58),
    BackgroundColor3: colors.inkRaised,
  });
  const modeButtons = new Map<CanvasMode, fk.TextButtonNode>();
  for (const [index, value] of modeOrder.entries()) {
    const control = button(
      value.toUpperCase(),
      fk.udim2FromOffset(102, 38),
      fk.udim2FromOffset(12, 22 + index * 52),
      colors.inkRaised,
      colors.textMuted,
    );
    fk.update(control, { TextSize: 10, FontFamily: fonts.mono, TextXAlignment: 'Left' });
    bindButtonMotion(control, colors.inkRaised, colors.inkSoft);
    fk.on(control, 'MouseButton1Click', () => mode(value));
    modeButtons.set(value, control);
    fk.append(sidebar, control);
  }
  fk.append(
    sidebar,
    text({
      text: 'CLICK A LAYER',
      size: fk.udim2FromOffset(102, 36),
      position: fk.udim2FromOffset(12, 458),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
      wrapped: true,
    }),
  );
  fk.append(canvas, sidebar);

  const preview = fk.createFrame({
    Name: 'LivePreviewCard',
    Size: fk.udim2FromOffset(332, 214),
    Position: fk.udim2FromOffset(146, 82),
    BackgroundColor3: colors.coral,
    BackgroundTransparency: 0.06,
  });
  decorate(preview, 22, colors.darkText, 2);
  const previewTitle = text({
    text: '',
    size: fk.udim2FromOffset(280, 54),
    position: fk.udim2FromOffset(26, 24),
    color: colors.ink,
    textSize: 26,
    weight: 900,
  });
  const previewBody = text({
    text: '',
    size: fk.udim2FromOffset(270, 54),
    position: fk.udim2FromOffset(26, 76),
    color: colors.inkSoft,
    textSize: 13,
    wrapped: true,
  });
  fk.append(preview, previewTitle);
  fk.append(preview, previewBody);
  const launch = button(
    'NEXT LAYER  →',
    fk.udim2FromOffset(142, 42),
    fk.udim2FromOffset(26, 148),
    colors.ink,
    colors.text,
  );
  bindButtonMotion(launch, colors.ink, colors.violet);
  fk.on(launch, 'MouseButton1Click', () => {
    const index = modeOrder.indexOf(mode());
    mode(modeOrder[(index + 1) % modeOrder.length]!);
  });
  fk.append(preview, launch);
  fk.append(canvas, preview);

  const code = fk.createFrame({
    Name: 'LiveCode',
    Size: fk.udim2FromOffset(332, 226),
    Position: fk.udim2FromOffset(146, 320),
    BackgroundColor3: colors.ink,
  });
  decorate(code, 18, colors.inkSoft);
  const codeNodes = [
    codeLine(code, '', 22, colors.violet),
    codeLine(code, '', 54),
    codeLine(code, '', 86, colors.coral),
    codeLine(code, '', 118, colors.violet),
    codeLine(code, '', 168, colors.mint),
  ];
  fk.append(canvas, code);

  const previewMotion = fk.createMotion(preview, { tension: 230, friction: 20 });
  fk.state.observe(canvas, mode, (value) => {
    const selected = modeContent[value];
    fk.update(previewTitle, { Text: selected.title });
    fk.update(previewBody, { Text: selected.body });
    previewMotion.spring({ BackgroundColor3: selected.accent, Rotation: selected.rotation });
    for (const [index, line] of selected.lines.entries()) {
      fk.update(codeNodes[index]!, { Text: line });
    }
    for (const [buttonMode, control] of modeButtons) {
      const active = buttonMode === value;
      fk.update(control, {
        Text: `${active ? '●' : '○'}  ${buttonMode.toUpperCase()}`,
        TextColor3: active ? selected.accent : colors.textMuted,
      });
    }
  });
  return canvas;
}
