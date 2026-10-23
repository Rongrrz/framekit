import { createFrame, createTween } from 'framekit';

const card = createFrame();

const tween = createTween(
  card,
  {
    Duration: 0.3,
    EasingStyle: 'Quad',
    EasingDirection: 'Out',
    RepeatCount: 0,
    Reverses: false,
    Delay: 0,
  },
  { Rotation: 12 },
);

card.onDestroy(tween.completed.subscribe((state) => console.log(state)));

tween.play();
// tween.pause(); tween.play(); tween.cancel();
