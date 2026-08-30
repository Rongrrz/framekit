import { fk } from 'framekit';
import { describe, expect, it } from 'vitest';

import { setupAnimationClock } from '../../src/tests/support/animation-clock';
import { createHero } from '../src/components/hero';
import { createLifecycle } from '../src/components/lifecycle';
import { createModifiers } from '../src/components/modifiers';
import { createMotion } from '../src/components/motion';
import type { PlaygroundLayout } from '../src/layout';

const { settle } = setupAnimationClock();

describe('interactive playground components', () => {
  it('bursts the hero machine without recreating its motion core', () => {
    const layout = fk.createValue<PlaygroundLayout>('desktop');
    const hero = createHero(layout, () => undefined);
    const core = hero.findFirstChild('MotionCore', true) as fk.Frame;
    const burst = hero.findFirstChild('BURSTButton', true) as fk.TextButton;

    burst.element.click();
    settle();

    expect(hero.findFirstChild('MotionCore', true)).toBe(core);
    expect(core.BackgroundColor3).toEqual(fk.color3FromRGB(255, 77, 112));
    expect(core.Rotation).toBe(13);
    hero.destroy();
  });

  it('switches spring personality in place', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const section = createMotion(layout);
    const reactor = section.findFirstChild('SpringReactor', true) as fk.Frame;
    const orb = reactor.findFirstChild('ReactorOrb', true) as fk.Frame;
    const zeroG = reactor.findFirstChild('ZEROGButton', true) as fk.TextButton;

    zeroG.element.click();
    settle();

    expect(reactor.element.textContent).toContain('ZERO G');
    expect(orb.BackgroundColor3).toEqual(fk.color3FromRGB(139, 117, 255));
    section.destroy();
  });

  it('shuffles the same kinetic stack cards', () => {
    const section = createModifiers(fk.createValue<PlaygroundLayout>('desktop'));
    const first = section.findFirstChild('StackCard1', true) as fk.Frame;
    const shuffle = section.findFirstChild('SHUFFLEButton', true) as fk.TextButton;
    const initialPosition = first.Position;

    shuffle.element.click();
    settle();

    expect(section.findFirstChild('StackCard1', true)).toBe(first);
    expect(first.Position).not.toEqual(initialPosition);
    section.destroy();
  });

  it('destroys and rebuilds lifecycle-owned resources', () => {
    const section = createLifecycle(fk.createValue<PlaygroundLayout>('mobile'));
    const scene = section.findFirstChild('LifecycleScene', true) as fk.Frame;
    const action = scene.findFirstChild('DESTROYOWNERButton', true) as fk.TextButton;
    const first = scene.findFirstChild('OwnedResource1', true)!;

    action.element.click();
    settle();

    expect(first.isDestroyed()).toBe(true);
    expect(scene.element.textContent).toContain('00 RESOURCES');

    action.element.click();

    expect(scene.findFirstChild('OwnedResource1', true)).toBeDefined();
    section.destroy();
  });

  it('reflows the same hero machine between viewport layouts', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const hero = createHero(layout, () => undefined);
    const machine = hero.findFirstChild('HeroMachine', true) as fk.Frame;

    expect(machine.Size).toEqual(fk.udim2FromOffset(358, 470));

    layout.set('desktop');

    expect(machine.Size).toEqual(fk.udim2FromOffset(540, 666));
    hero.destroy();
  });
});
