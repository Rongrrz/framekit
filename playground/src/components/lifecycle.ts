import { fk, fka } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createText } from '../ui';

export function createLifecycle(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('lifecycle', layout, colors.coral);
  const content = createSectionContent(section, layout);
  const eyebrow = createText({
    text: 'OWNERSHIP / CLEANUP / SILENCE',
    size: fk.udim2FromOffset(330, 28),
    position: fk.udim2FromOffset(0, 70),
    color: colors.darkText,
    textSize: 9,
    font: fonts.mono,
    weight: 800,
  });
  const title = createText({
    text: 'MOTION SHOULD\nKNOW WHEN\nTO LEAVE.',
    size: fk.udim2FromOffset(540, 270),
    position: fk.udim2FromOffset(0, 118),
    color: colors.ink,
    textSize: 58,
    font: fonts.display,
    weight: 950,
    wrapped: true,
    yAlignment: 'Top',
  });
  const body = createText({
    text: 'Destroy one owner. Its watchers, listeners, descendants, and active animations disappear with it. The exit is as intentional as the entrance.',
    size: fk.udim2FromOffset(500, 98),
    position: fk.udim2FromOffset(0, 438),
    color: colors.darkMuted,
    textSize: 15,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(section, layout, eyebrow, {
    desktop: { Position: fk.udim2FromOffset(0, 70) },
    mobile: { Position: fk.udim2FromOffset(0, 52) },
  });
  bindLayoutProperties(section, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(540, 270),
      Position: fk.udim2FromOffset(0, 118),
      TextSize: 58,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 210),
      Position: fk.udim2FromOffset(0, 96),
      TextSize: 42,
    },
  });
  bindLayoutProperties(section, layout, body, {
    desktop: {
      Size: fk.udim2FromOffset(500, 98),
      Position: fk.udim2FromOffset(0, 438),
      TextSize: 15,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 116),
      Position: fk.udim2FromOffset(0, 322),
      TextSize: 13,
    },
  });

  const scene = createLifecycleScene(layout);
  for (const child of [eyebrow, title, body, scene]) content.addChild(child);
  section.addChild(content);
  return section;
}

function createLifecycleScene(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const scene = fk.createFrame({ Name: 'LifecycleScene', BackgroundColor3: colors.ink });
  addRoundedBorder(scene, 30, colors.darkText, 3);
  scene.element.classList.add('fk-grid');
  bindLayoutProperties(scene, layout, scene, {
    desktop: { Size: fk.udim2FromOffset(570, 620), Position: fk.udim2FromOffset(590, 66) },
    mobile: { Size: fk.udim2FromOffset(358, 480), Position: fk.udim2FromOffset(0, 466) },
  });

  const state = createText({
    text: '● OWNER ACTIVE / 06 RESOURCES',
    size: fk.udim2(1, -44, 0, 30),
    position: fk.udim2FromOffset(22, 20),
    color: colors.mint,
    textSize: 8,
    font: fonts.mono,
    weight: 800,
  });
  scene.addChild(state);

  const field = fk.createFrame({
    Name: 'OwnershipField',
    Size: fk.udim2(1, -44, 0, 420),
    Position: fk.udim2FromOffset(22, 70),
    BackgroundColor3: colors.inkRaised,
    ClipsDescendants: true,
  });
  addRoundedBorder(field, 20, colors.inkSoft);
  bindLayoutProperties(scene, layout, field, {
    desktop: { Size: fk.udim2(1, -44, 0, 420), Position: fk.udim2FromOffset(22, 70) },
    mobile: { Size: fk.udim2(1, -40, 0, 292), Position: fk.udim2FromOffset(20, 64) },
  });
  scene.addChild(field);

  const palette = [colors.mint, colors.violet, colors.cyan, colors.amber, colors.coral] as const;
  const particles: fk.Frame[] = [];
  function rebuild(): void {
    for (const particle of particles.splice(0)) {
      if (!particle.isDestroyed()) particle.destroy();
    }
    for (let index = 0; index < 5; index += 1) {
      const particle = fk.createFrame({
        Name: `OwnedResource${index + 1}`,
        Size: fk.udim2FromOffset(86 - index * 6, 86 - index * 6),
        Position: fk.udim2FromOffset(66 + index * 56, 146 + ((index % 2) * 52 - 26)),
        BackgroundColor3: palette[index]!,
        Rotation: index * 7 - 14,
      });
      particle.addChild(fk.createUICorner({ CornerRadius: index % 2 === 0 ? 999 : 18 }));
      field.addChild(particle);
      particles.push(particle);
    }
    state.setProperties({ Text: '● OWNER ACTIVE / 06 RESOURCES', TextColor3: colors.mint });
  }
  rebuild();

  const action = createButton(
    'DESTROY OWNER',
    fk.udim2FromOffset(250, 52),
    fk.udim2FromOffset(22, 530),
    colors.coral,
    colors.ink,
  );
  action.Name = 'DESTROYOWNERButton';
  action.setProperties({ TextSize: 9, FontFamily: fonts.mono });
  bindButtonMotion(action, colors.coral, colors.mint);
  bindLayoutProperties(scene, layout, action, {
    desktop: { Size: fk.udim2FromOffset(250, 52), Position: fk.udim2FromOffset(22, 530) },
    mobile: { Size: fk.udim2FromOffset(318, 48), Position: fk.udim2FromOffset(20, 394) },
  });
  let active = true;
  action.onClick(() => {
    if (!active) {
      rebuild();
      action.Text = 'DESTROY OWNER';
      active = true;
      return;
    }
    for (const [index, particle] of particles.entries()) {
      const controller = fka.spring(
        particle,
        {
          Position: fk.udim2FromOffset(30 + index * 94, index % 2 === 0 ? -120 : 430),
          Rotation: 80 - index * 34,
          BackgroundTransparency: 1,
        },
        { tension: 180, friction: 14 },
      );
      controller.completed.subscribe(() => {
        if (!particle.isDestroyed()) particle.destroy();
      });
    }
    state.setProperties({ Text: '○ OWNER DESTROYED / 00 RESOURCES', TextColor3: colors.textMuted });
    action.Text = 'REBUILD OWNER';
    active = false;
  });
  scene.addChild(action);
  return scene;
}
