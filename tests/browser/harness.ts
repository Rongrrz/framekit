import * as framekit from '../../src/index.js';

declare global {
  interface Window {
    framekit: typeof framekit;
  }
}

window.framekit = framekit;
