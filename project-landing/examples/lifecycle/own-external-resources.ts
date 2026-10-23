import { createFrame } from 'framekit';

const owner = createFrame();

const controller = new AbortController();

window.addEventListener('online', () => console.log('Online'), {
  signal: controller.signal,
});

owner.onDestroy(() => controller.abort());

const timer = window.setInterval(() => console.log('Tick'), 1000);

owner.onDestroy(() => window.clearInterval(timer));
