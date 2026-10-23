import { createFrame, spring } from 'framekit';

const card = createFrame();

const motion = spring(
  card,
  { Rotation: 12 },
  {
    tension: 170,
    friction: 26,
  },
);

spring(card, { Rotation: 0 }); // Retarget the retained spring.

motion.stop('Rotation'); // Keep the current visual value.

console.log(motion.isAnimating());
