import { fk, fka, fkh } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { appendSectionHeading, createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createText } from '../ui';

const reactorModes = {
  liquid: {
    label: 'LIQUID',
    accent: colors.cyan,
    settings: { tension: 105, friction: 18, mass: 1.2 },
    target: fk.vector2(470, 220),
  },
  snap: {
    label: 'SNAP',
    accent: colors.mint,
    settings: { tension: 420, friction: 34, mass: 0.8 },
    target: fk.vector2(180, 112),
  },
  elastic: {
    label: 'ELASTIC',
    accent: colors.coral,
    settings: { tension: 190, friction: 9, mass: 1 },
    target: fk.vector2(380, 318),
  },
  zeroG: {
    label: 'ZERO G',
    accent: colors.violet,
    settings: { tension: 58, friction: 10, mass: 1.8 },
    target: fk.vector2(92, 294),
  },
} as const;

type ReactorMode = keyof typeof reactorModes;

export function createMotion(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('motion', layout, colors.lilac);
  const content = createSectionContent(section, layout);
  appendSectionHeading(
    content,
    layout,
    'ENTER THE SPRING REACTOR.',
    'Same object. Same properties. Entirely different physical personalities. Click anywhere inside the field and feel each mode keep its velocity.',
    'dark',
  );
  content.addChild(createReactor(layout));
  section.addChild(content);
  return section;
}

function createReactor(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const reactor = fk.createFrame({ Name: 'SpringReactor', BackgroundColor3: colors.ink });
  addRoundedBorder(reactor, 30, colors.darkText, 3);
  reactor.element.classList.add('fk-noise');
  bindLayoutProperties(reactor, layout, reactor, {
    desktop: { Size: fk.udim2FromOffset(1160, 650), Position: fk.udim2FromOffset(0, 248) },
    mobile: { Size: fk.udim2FromOffset(358, 914), Position: fk.udim2FromOffset(0, 286) },
  });

  const selected = fk.createValue<ReactorMode>('liquid');
  const modeButtons = new Map<ReactorMode, fk.TextButton>();
  for (const [index, mode] of (Object.keys(reactorModes) as ReactorMode[]).entries()) {
    const data = reactorModes[mode];
    const button = createButton(
      data.label,
      fk.udim2FromOffset(128, 42),
      fk.udim2FromOffset(24 + index * 140, 22),
      colors.inkRaised,
      colors.textMuted,
    );
    button.Name = `${data.label.replace(' ', '')}Button`;
    button.setProperties({ TextSize: 9, FontFamily: fonts.mono });
    fkh.bindHoverScale(button, 1.035);
    button.onClick(() => selected.set(mode));
    bindLayoutProperties(reactor, layout, button, {
      desktop: {
        Size: fk.udim2FromOffset(128, 42),
        Position: fk.udim2FromOffset(24 + index * 140, 22),
      },
      mobile: {
        Size: fk.udim2FromOffset(145, 40),
        Position: fk.udim2FromOffset(20 + (index % 2) * 157, 18 + Math.floor(index / 2) * 50),
      },
    });
    modeButtons.set(mode, button);
    reactor.addChild(button);
  }

  const status = createText({
    text: '● LIVE / POINTER ARMED',
    size: fk.udim2FromOffset(250, 30),
    position: fk.udim2(1, -274, 0, 28),
    color: colors.cyan,
    textSize: 8,
    font: fonts.mono,
    xAlignment: 'Right',
  });
  status.element.classList.add('fk-breathe');
  bindLayoutProperties(reactor, layout, status, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });
  reactor.addChild(status);

  const field = fk.createFrame({
    Name: 'ReactorField',
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(field, 22, colors.inkSoft, 2);
  field.element.classList.add('fk-grid');
  field.element.style.cursor = 'crosshair';
  bindLayoutProperties(reactor, layout, field, {
    desktop: { Size: fk.udim2FromOffset(730, 542), Position: fk.udim2FromOffset(24, 84) },
    mobile: { Size: fk.udim2FromOffset(318, 510), Position: fk.udim2FromOffset(20, 126) },
  });

  const target = fk.createFrame({
    Name: 'TargetReticle',
    Size: fk.udim2FromOffset(34, 34),
    Position: fk.udim2FromOffset(470, 220),
    AnchorPoint: fk.vector2(0.5, 0.5),
    BackgroundTransparency: 1,
  });
  target.addChild(fk.createUICorner({ CornerRadius: 99 }));
  target.addChild(fk.createUIStroke({ Color: colors.cyan, Thickness: 2 }));
  target.element.classList.add('fk-breathe');
  field.addChild(target);

  const followers = Array.from({ length: 5 }, (_, index) => {
    const size = 44 - index * 5;
    const follower = fk.createFrame({
      Name: `VelocityTrail${index + 1}`,
      Size: fk.udim2FromOffset(size, size),
      AnchorPoint: fk.vector2(0.5, 0.5),
      Position: fk.udim2FromOffset(350 - index * 22, 260 + index * 16),
      BackgroundColor3: index % 2 === 0 ? colors.cyan : colors.violet,
      BackgroundTransparency: 0.32 + index * 0.1,
    });
    follower.addChild(fk.createUICorner({ CornerRadius: 99 }));
    field.addChild(follower);
    return follower;
  });

  const orb = fk.createFrame({
    Name: 'ReactorOrb',
    Size: fk.udim2FromOffset(164, 164),
    AnchorPoint: fk.vector2(0.5, 0.5),
    Position: fk.udim2FromOffset(350, 260),
    BackgroundColor3: colors.cyan,
  });
  orb.addChild(fk.createUICorner({ CornerRadius: 999 }));
  orb.addChild(fk.createUIStroke({ Color: colors.text, Transparency: 0.2, Thickness: 3 }));
  orb.addChild(
    fk.createUIShadow({
      Color: colors.cyan,
      Transparency: 0.12,
      BlurRadius: 42,
      SpreadRadius: 8,
    }),
  );
  const orbMode = createText({
    text: 'LIQUID',
    size: fk.udim2(1, 0, 0, 36),
    position: fk.udim2(0, 0, 0.5, -20),
    color: colors.ink,
    textSize: 15,
    font: fonts.display,
    weight: 950,
    xAlignment: 'Center',
  });
  orb.addChild(orbMode);
  field.addChild(orb);

  const consolePanel = fk.createFrame({ BackgroundColor3: colors.inkRaised });
  addRoundedBorder(consolePanel, 22, colors.inkSoft, 2);
  bindLayoutProperties(reactor, layout, consolePanel, {
    desktop: { Size: fk.udim2FromOffset(358, 542), Position: fk.udim2FromOffset(778, 84) },
    mobile: { Size: fk.udim2FromOffset(318, 238), Position: fk.udim2FromOffset(20, 658) },
  });
  const consoleTitle = createText({
    text: 'PHYSICS PROFILE',
    size: fk.udim2(1, -40, 0, 34),
    position: fk.udim2FromOffset(20, 20),
    color: colors.text,
    textSize: 12,
    font: fonts.mono,
    weight: 800,
  });
  const reading = createText({
    text: '',
    size: fk.udim2(1, -40, 0, 150),
    position: fk.udim2FromOffset(20, 76),
    color: colors.cyan,
    textSize: 12,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  const code = createText({
    text: '',
    size: fk.udim2(1, -40, 0, 170),
    position: fk.udim2FromOffset(20, 290),
    color: colors.textMuted,
    textSize: 11,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  const hint = createText({
    text: 'CLICK / DRAG / RETARGET\nVELOCITY SURVIVES EVERY GOAL',
    size: fk.udim2(1, -40, 0, 52),
    position: fk.udim2FromOffset(20, 470),
    color: colors.textMuted,
    textSize: 8,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  for (const child of [consoleTitle, reading, code, hint]) consolePanel.addChild(child);
  bindLayoutProperties(reactor, layout, consoleTitle, {
    desktop: { Position: fk.udim2FromOffset(20, 20) },
    mobile: { Position: fk.udim2FromOffset(20, 14) },
  });
  bindLayoutProperties(reactor, layout, reading, {
    desktop: { Position: fk.udim2FromOffset(20, 76), Size: fk.udim2(1, -40, 0, 150) },
    mobile: { Position: fk.udim2FromOffset(20, 56), Size: fk.udim2(1, -40, 0, 100) },
  });
  bindLayoutProperties(reactor, layout, code, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });
  bindLayoutProperties(reactor, layout, hint, {
    desktop: { Position: fk.udim2FromOffset(20, 470) },
    mobile: { Position: fk.udim2FromOffset(20, 176) },
  });
  reactor.addChild(field);
  reactor.addChild(consolePanel);

  function moveTo(x: number, y: number): void {
    const data = reactorModes[selected.get()];
    const mobile = layout.get() === 'mobile';
    const safeX = Math.min(mobile ? 272 : 650, Math.max(48, x));
    const safeY = Math.min(mobile ? 452 : 484, Math.max(48, y));
    target.setProperties({
      Position: fk.udim2FromOffset(safeX, safeY),
      BackgroundColor3: data.accent,
    });
    fka.spring(
      orb,
      { Position: fk.udim2FromOffset(safeX, safeY), BackgroundColor3: data.accent },
      data.settings,
    );
    for (const [index, follower] of followers.entries()) {
      fka.spring(
        follower,
        {
          Position: fk.udim2FromOffset(safeX - 28 - index * 13, safeY + 18 + index * 8),
          BackgroundColor3: index % 2 === 0 ? data.accent : colors.violet,
        },
        {
          tension: Math.max(40, data.settings.tension - 22 - index * 10),
          friction: data.settings.friction + 3 + index * 2,
          mass: data.settings.mass,
        },
      );
    }
  }

  reactor.watch(selected, (mode) => {
    const data = reactorModes[mode];
    orbMode.Text = data.label;
    status.setProperties({ TextColor3: data.accent, Text: `● ${data.label} / ARMED` });
    reading.setProperties({
      TextColor3: data.accent,
      Text: `TENSION   ${data.settings.tension}\nFRICTION  ${data.settings.friction}\nMASS      ${data.settings.mass}\n\nSTATUS    RETAINING VELOCITY`,
    });
    code.Text = `fka.spring(orb, {\n  Position: pointer,\n  BackgroundColor3: accent,\n}, {\n  tension: ${data.settings.tension},\n  friction: ${data.settings.friction},\n  mass: ${data.settings.mass},\n});`;
    for (const [buttonMode, button] of modeButtons) {
      const active = buttonMode === mode;
      button.setProperties({
        BackgroundColor3: active ? data.accent : colors.inkRaised,
        TextColor3: active ? colors.ink : colors.textMuted,
      });
    }
    const scale = layout.get() === 'mobile' ? 0.62 : 1;
    moveTo(data.target.X * scale, data.target.Y * scale);
  });

  const listenerController = new AbortController();
  field.element.addEventListener(
    'pointermove',
    (event) => {
      if (event.buttons === 0 && event.pointerType !== 'mouse') return;
      const bounds = field.element.getBoundingClientRect();
      const scaleX = field.Size.X.Offset / Math.max(1, bounds.width);
      const scaleY = field.Size.Y.Offset / Math.max(1, bounds.height);
      moveTo((event.clientX - bounds.left) * scaleX, (event.clientY - bounds.top) * scaleY);
    },
    { signal: listenerController.signal },
  );
  field.element.addEventListener(
    'pointerdown',
    (event) => {
      const bounds = field.element.getBoundingClientRect();
      moveTo(
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * field.Size.X.Offset,
        ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * field.Size.Y.Offset,
      );
    },
    { signal: listenerController.signal },
  );
  reactor.onDestroy(() => listenerController.abort());

  return reactor;
}
