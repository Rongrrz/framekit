import type { ReferenceChapter } from './chapter';

export const animationChapter = {
  title: 'Animation',
  summary:
    'Use a spring for retargetable motion and a tween for a timed sequence. Both animate the same properties you read and write normally.',
  sections: [
    {
      title: 'Retarget a spring',
      body: 'spring(node, goal, options?) retains one controller per instance. Subsequent calls retarget from current visual values while preserving velocity. Properties settle independently; completed emits when every active property settles.',
      code: [
        "import { createFrame, spring } from 'framekit';",
        '',
        'const card = createFrame();',
        'const motion = spring(card, { Rotation: 12 }, {',
        '  tension: 170, friction: 26,',
        '});',
        'spring(card, { Rotation: 0 }); // Retarget the retained spring.',
        "motion.stop('Rotation'); // Keep the current visual value.",
        'console.log(motion.isAnimating());',
      ],
      note: 'spring(node) retrieves the controller without starting new motion. Stop with no property argument to stop all spring properties on that instance.',
    },
    {
      title: 'Control a timed tween',
      body: 'createTween validates its goal at creation. play captures current values and claims the goal properties. Duration and Delay use seconds. pause keeps ownership; cancel stops playback and releases it.',
      code: [
        "import { createFrame, createTween } from 'framekit';",
        '',
        'const card = createFrame();',
        'const tween = createTween(card, {',
        "  Duration: 0.3, EasingStyle: 'Quad', EasingDirection: 'Out',",
        '  RepeatCount: 0, Reverses: false, Delay: 0,',
        '}, { Rotation: 12 });',
        'card.onDestroy(tween.completed.subscribe((state) => console.log(state)));',
        'tween.play();',
        '// tween.pause(); tween.play(); tween.cancel();',
      ],
      note: 'RepeatCount counts additional playthroughs; -1 repeats forever. completed emits Completed or Cancelled. playbackState returns Idle, Delayed, Playing, Paused, Completed, or Cancelled.',
    },
    {
      title: 'One writer per property',
      body: 'Animation ownership is per instance and property. A new animation claim replaces the previous writer for that property. Springs and tweens can animate different properties at the same time. A direct property write interrupts its current animation, even when the value is equal.',
      code: [
        "import { createFrame, spring } from 'framekit';",
        '',
        'const card = createFrame();',
        'spring(card, { Rotation: 24 });',
        'card.Rotation = card.Rotation; // Stop Rotation at its current value.',
        'card.destroy(); // Cancel animation and release its registrations.',
      ],
      note: 'Application motion should respect prefers-reduced-motion. Check matchMedia and assign the goal directly when reduced motion is requested. Overlay helpers provide their own reduced-motion behavior.',
    },
  ],
} as const satisfies ReferenceChapter;
