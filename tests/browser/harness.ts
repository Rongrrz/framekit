import * as framekitDevtools from '../../src/devtools.js';
import * as framekit from '../../src/index.js';

declare global {
  interface Window {
    framekit: typeof framekit;
    framekitDevtools: typeof framekitDevtools;
  }
}

window.framekit = framekit;

window.framekitDevtools = framekitDevtools;
