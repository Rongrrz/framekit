import { fk } from 'framekit';

import { bindButtonMotion, bindScaleMotion, copyCommand } from '../../shared/interaction';
import { button, decorate, pill, text } from '../../shared/ui';
import { colors, fonts } from '../../theme';
import { sectionLayout } from '../layout';
import { contentWidth, createSection, createSectionContent } from '../primitives';

export function createHero(onExplore: () => void): fk.FrameNode {
  const section = createSection('MobileHero', sectionLayout.hero, colors.ink);
  const content = createSectionContent();
  fk.append(
    content,
    pill(
      'GAME UI THINKING  ·  WEB NATIVE',
      fk.udim2FromOffset(282, 36),
      fk.udim2FromOffset(0, 54),
      colors.mint,
    ),
  );
  fk.append(
    content,
    text({
      text: 'Build the web\nlike a game UI.',
      size: fk.udim2FromOffset(contentWidth, 190),
      position: fk.udim2FromOffset(0, 116),
      textSize: 43,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  fk.append(
    content,
    text({
      text: 'Typed nodes, UDim2 layout, observable state, modifiers, tweens, and springs—without translating every idea into a CSS hierarchy.',
      size: fk.udim2FromOffset(contentWidth, 116),
      position: fk.udim2FromOffset(0, 318),
      color: colors.textMuted,
      textSize: 15,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  const explore = button(
    'TRY THE LIVE LAB  ↓',
    fk.udim2FromOffset(172, 50),
    fk.udim2FromOffset(0, 452),
    colors.coral,
    colors.ink,
  );
  bindButtonMotion(explore, colors.coral, colors.amber);
  fk.on(explore, 'MouseButton1Click', onExplore);
  fk.append(content, explore);
  const install = button(
    'COPY INSTALL',
    fk.udim2FromOffset(172, 50),
    fk.udim2FromOffset(186, 452),
    colors.inkRaised,
    colors.text,
  );
  fk.update(install, { TextSize: 10, FontFamily: fonts.mono });
  bindButtonMotion(install, colors.inkRaised, colors.inkSoft);
  fk.on(install, 'MouseButton1Click', () => {
    void copyCommand(install, 'npm i framekit', 'COPY INSTALL');
  });
  fk.append(content, install);

  const selected = fk.state.observable<'NODE' | 'STATE' | 'MOTION'>('NODE');
  const preview = fk.createFrame({
    Name: 'MobileHeroPreview',
    Size: fk.udim2FromOffset(contentWidth, 360),
    Position: fk.udim2FromOffset(0, 548),
    BackgroundColor3: colors.paper,
  });
  decorate(preview, 24, colors.violet, 2);
  const controls = new Map<string, fk.TextButtonNode>();
  for (const [index, label] of ['NODE', 'STATE', 'MOTION'].entries()) {
    const control = button(
      label,
      fk.udim2FromOffset(98, 38),
      fk.udim2FromOffset(18 + index * 112, 18),
      colors.paperMuted,
      colors.darkText,
    );
    fk.update(control, { TextSize: 9, FontFamily: fonts.mono });
    bindScaleMotion(control, 1.04);
    fk.on(control, 'MouseButton1Click', () => selected(label as 'NODE' | 'STATE' | 'MOTION'));
    controls.set(label, control);
    fk.append(preview, control);
  }
  const card = fk.createFrame({
    Size: fk.udim2FromOffset(322, 160),
    Position: fk.udim2FromOffset(18, 78),
    BackgroundColor3: colors.coral,
  });
  decorate(card, 18, colors.ink, 2);
  const title = text({
    text: '',
    size: fk.udim2FromOffset(274, 46),
    position: fk.udim2FromOffset(24, 20),
    color: colors.ink,
    textSize: 22,
    weight: 900,
  });
  const description = text({
    text: '',
    size: fk.udim2FromOffset(274, 62),
    position: fk.udim2FromOffset(24, 72),
    color: colors.inkSoft,
    textSize: 12,
    wrapped: true,
    yAlignment: 'Top',
  });
  fk.append(card, title);
  fk.append(card, description);
  fk.append(preview, card);
  const code = text({
    text: '',
    size: fk.udim2FromOffset(322, 74),
    position: fk.udim2FromOffset(18, 262),
    color: colors.violet,
    textSize: 11,
    font: fonts.mono,
    wrapped: true,
    yAlignment: 'Top',
  });
  fk.append(preview, code);
  const cardMotion = fk.createMotion(card, { tension: 220, friction: 21 });
  fk.state.observe(preview, selected, (value) => {
    const state = {
      NODE: [
        'TYPED NODE',
        'Factories create inspectable handles with a strict property contract.',
        colors.coral,
        'const card = fk.createFrame({ ... });',
      ],
      STATE: [
        'DIRECT STATE',
        'Callable observables update the same node without a component framework.',
        colors.mint,
        'const open = fk.state.observable(false);',
      ],
      MOTION: [
        'RETAINED MOTION',
        'A spring keeps current position and velocity when you give it a new goal.',
        colors.violet,
        'motion.spring({ Rotation: 4 });',
      ],
    } as const;
    const current = state[value];
    fk.update(title, { Text: current[0] });
    fk.update(description, { Text: current[1] });
    fk.update(code, { Text: current[3] });
    cardMotion.spring({ BackgroundColor3: current[2], Rotation: value === 'MOTION' ? 2 : 0 });
    for (const [label, control] of controls) {
      fk.update(control, { BackgroundColor3: label === value ? current[2] : colors.paperMuted });
    }
  });
  fk.append(content, preview);
  fk.append(section, content);
  return section;
}
