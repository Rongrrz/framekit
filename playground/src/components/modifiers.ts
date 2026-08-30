import { fk, fka } from 'framekit';

import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { appendSectionHeading, createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { addRoundedBorder, createButton, createText } from '../ui';

export function createModifiers(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('modifiers', layout, colors.ink);
  section.element.classList.add('fk-noise');
  const content = createSectionContent(section, layout);
  appendSectionHeading(
    content,
    layout,
    'THREE SCENES. ZERO CHOREOGRAPHY DEBT.',
    'Motion is not decoration here. It explains hierarchy, preserves intent, and turns every interaction into one continuous thought.',
    'light',
  );

  const magnetic = createSceneShell(
    'MagneticMenu',
    '01',
    'MAGNETIC MENU',
    'Hover the nodes.',
    colors.mint,
  );
  const stack = createSceneShell(
    'KineticStack',
    '02',
    'KINETIC STACK',
    'Shuffle the hierarchy.',
    colors.coral,
  );
  const signal = createSceneShell(
    'SignalField',
    '03',
    'SIGNAL FIELD',
    'Ambient tween loop.',
    colors.cyan,
  );
  bindSceneLayout(section, layout, magnetic, 0);
  bindSceneLayout(section, layout, stack, 1);
  bindSceneLayout(section, layout, signal, 2);

  buildMagneticScene(magnetic);
  buildStackScene(stack);
  buildSignalScene(signal);
  for (const scene of [magnetic, stack, signal]) content.addChild(scene);
  section.addChild(content);
  return section;
}

function createSceneShell(
  name: string,
  number: string,
  title: string,
  caption: string,
  accent: fk.Color3,
): fk.Frame {
  const scene = fk.createFrame({
    Name: name,
    BackgroundColor3: colors.inkRaised,
  });
  addRoundedBorder(scene, 26, colors.inkSoft, 2);
  scene.addChild(
    createText({
      text: number,
      size: fk.udim2FromOffset(56, 30),
      position: fk.udim2FromOffset(22, 20),
      color: accent,
      textSize: 9,
      font: fonts.mono,
      weight: 800,
    }),
  );
  scene.addChild(
    createText({
      text: title,
      size: fk.udim2(1, -44, 0, 36),
      position: fk.udim2FromOffset(22, 52),
      color: colors.text,
      textSize: 19,
      font: fonts.display,
      weight: 950,
    }),
  );
  scene.addChild(
    createText({
      text: caption,
      size: fk.udim2(1, -44, 0, 28),
      position: fk.udim2FromOffset(22, 88),
      color: colors.textMuted,
      textSize: 10,
      font: fonts.mono,
    }),
  );
  return scene;
}

function buildMagneticScene(scene: fk.Frame): void {
  const field = fk.createFrame({
    Name: 'SceneField',
    Size: fk.udim2(1, -36, 0, 472),
    Position: fk.udim2FromOffset(18, 132),
    BackgroundColor3: colors.ink,
    ClipsDescendants: true,
  });
  addRoundedBorder(field, 18, colors.inkSoft);
  field.element.classList.add('fk-grid');
  const labels = ['CREATE', 'PARENT', 'SPRING'] as const;
  const accents = [colors.mint, colors.violet, colors.coral] as const;
  const nodes = labels.map((label, index) => {
    const node = createButton(
      label,
      fk.udim2FromOffset(210, 82),
      fk.udim2FromOffset(46 + index * 16, 58 + index * 112),
      accents[index]!,
      colors.ink,
    );
    node.setProperties({
      TextSize: 13,
      FontFamily: fonts.mono,
      FontWeight: 900,
      Rotation: index * 2 - 2,
    });
    node.addChild(
      createText({
        text: `0${index + 1}`,
        size: fk.udim2FromOffset(32, 24),
        position: fk.udim2(1, -46, 0, 8),
        color: colors.darkMuted,
        textSize: 8,
        font: fonts.mono,
      }),
    );
    node.onMouseEnter(() => {
      fka.spring(node, {
        Position: fk.udim2FromOffset(76, 58 + index * 112),
        Rotation: index % 2 === 0 ? 5 : -5,
      });
      for (const [otherIndex, other] of nodes.entries()) {
        if (other === node) continue;
        fka.spring(other, { Position: fk.udim2FromOffset(32, 58 + otherIndex * 112) });
      }
    });
    node.onMouseLeave(() => {
      for (const [otherIndex, other] of nodes.entries()) {
        fka.spring(other, {
          Position: fk.udim2FromOffset(46 + otherIndex * 16, 58 + otherIndex * 112),
          Rotation: otherIndex * 2 - 2,
        });
      }
    });
    field.addChild(node);
    return node;
  });
  scene.addChild(field);
  scene.addChild(
    createText({
      text: 'Each item owns its motion.\nThe group still feels connected.',
      size: fk.udim2(1, -44, 0, 56),
      position: fk.udim2FromOffset(22, 628),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
}

function buildStackScene(scene: fk.Frame): void {
  const field = fk.createFrame({
    Name: 'SceneField',
    Size: fk.udim2(1, -36, 0, 472),
    Position: fk.udim2FromOffset(18, 132),
    BackgroundColor3: colors.paper,
    ClipsDescendants: true,
  });
  addRoundedBorder(field, 18, colors.paperMuted);
  const cards = [colors.violet, colors.coral, colors.mint].map((accent, index) => {
    const card = fk.createFrame({
      Name: `StackCard${index + 1}`,
      Size: fk.udim2FromOffset(230, 276),
      Position: fk.udim2FromOffset(52 + index * 14, 62 + index * 14),
      BackgroundColor3: accent,
      Rotation: -6 + index * 6,
      ZIndex: index + 1,
    });
    addRoundedBorder(card, 22, colors.ink, 2);
    card.addChild(
      createText({
        text: `0${index + 1}\nFRAME`,
        size: fk.udim2(1, -38, 0, 100),
        position: fk.udim2FromOffset(19, 20),
        color: colors.ink,
        textSize: 25,
        font: fonts.display,
        weight: 950,
        wrapped: true,
        yAlignment: 'Top',
      }),
    );
    field.addChild(card);
    return card;
  });
  const shuffle = createButton(
    'SHUFFLE  ↻',
    fk.udim2FromOffset(156, 44),
    fk.udim2FromOffset(92, 398),
    colors.ink,
    colors.text,
  );
  shuffle.Name = 'SHUFFLEButton';
  shuffle.setProperties({ TextSize: 9, FontFamily: fonts.mono });
  bindButtonMotion(shuffle, colors.ink, colors.violet);
  let turn = 0;
  shuffle.onClick(() => {
    turn += 1;
    for (const [index, card] of cards.entries()) {
      const slot = (index + turn) % cards.length;
      card.ZIndex = slot + 1;
      fka.spring(
        card,
        {
          Position: fk.udim2FromOffset(42 + slot * 22, 48 + slot * 18),
          Rotation: -12 + slot * 12,
          BackgroundColor3: [colors.violet, colors.coral, colors.mint][slot]!,
        },
        { tension: 220, friction: 16 },
      );
    }
  });
  field.addChild(shuffle);
  scene.addChild(field);
  scene.addChild(
    createText({
      text: 'ZIndex, Position, Rotation.\nOne spring call. No transition matrix.',
      size: fk.udim2(1, -44, 0, 56),
      position: fk.udim2FromOffset(22, 628),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
}

function buildSignalScene(scene: fk.Frame): void {
  const field = fk.createFrame({
    Name: 'SceneField',
    Size: fk.udim2(1, -36, 0, 472),
    Position: fk.udim2FromOffset(18, 132),
    BackgroundColor3: colors.ink,
    ClipsDescendants: true,
  });
  addRoundedBorder(field, 18, colors.inkSoft);
  field.element.classList.add('fk-grid');
  const center = fk.createFrame({
    Size: fk.udim2FromOffset(110, 110),
    AnchorPoint: fk.vector2(0.5, 0.5),
    Position: fk.udim2(0.5, 0, 0.5, 0),
    BackgroundColor3: colors.cyan,
  });
  center.addChild(fk.createUICorner({ CornerRadius: 999 }));
  center.element.classList.add('fk-glow');
  center.addChild(
    createText({
      text: 'LIVE',
      size: fk.udim2FromScale(1, 1),
      color: colors.ink,
      textSize: 13,
      font: fonts.mono,
      weight: 900,
      xAlignment: 'Center',
    }),
  );
  field.addChild(center);
  for (const [index, size] of [170, 246, 326].entries()) {
    const ring = fk.createFrame({
      Size: fk.udim2FromOffset(size, size),
      AnchorPoint: fk.vector2(0.5, 0.5),
      Position: fk.udim2(0.5, 0, 0.5, 0),
      BackgroundTransparency: 1,
    });
    ring.addChild(fk.createUICorner({ CornerRadius: 999 }));
    ring.addChild(
      fk.createUIStroke({
        Color: index === 1 ? colors.violet : colors.cyan,
        Transparency: 0.46 + index * 0.16,
        Thickness: 2,
      }),
    );
    ring.element.classList.add(index % 2 === 0 ? 'fk-float-a' : 'fk-float-b');
    field.addChild(ring);
  }
  const scan = fk.createFrame({
    Size: fk.udim2(1, 0, 0, 3),
    Position: fk.udim2(0, 0, 0.5, -2),
    BackgroundTransparency: 1,
  });
  scan.element.classList.add('fk-scan');
  field.addChild(scan);
  scene.addChild(field);
  scene.addChild(
    createText({
      text: 'Ambient motion can be quiet.\nThe interface never has to feel dead.',
      size: fk.udim2(1, -44, 0, 56),
      position: fk.udim2FromOffset(22, 628),
      color: colors.textMuted,
      textSize: 9,
      font: fonts.mono,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
}

function bindSceneLayout(
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  scene: fk.Frame,
  index: number,
): void {
  bindLayoutProperties(owner, layout, scene, {
    desktop: {
      Size: fk.udim2FromOffset(368, 744),
      Position: fk.udim2FromOffset(index * 396, 248),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 500),
      Position: fk.udim2FromOffset(0, 286 + index * 524),
    },
  });
  scene.watch(layout, (currentLayout) => {
    const mobile = currentLayout === 'mobile';
    for (const child of scene.getChildren()) {
      if ('Visible' in child && child.Name === 'Text') {
        // The compact scene keeps its artwork and hides only the long footnote.
        const element = child as fk.TextLabel;
        if (element.Position.Y.Offset === 628) element.Visible = !mobile;
      }
    }
    const field = scene.findFirstChild('SceneField') as fk.Frame | undefined;
    if (field) {
      field.setProperties({
        Size: fk.udim2(1, -36, 0, mobile ? 350 : 472),
        Position: fk.udim2FromOffset(18, mobile ? 128 : 132),
      });
    }
  });
}
