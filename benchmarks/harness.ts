import { runBenchmarks } from './workloads.js';

declare global {
  interface Window {
    runFrameKitBenchmarks: typeof runBenchmarks;
  }
}

window.runFrameKitBenchmarks = runBenchmarks;
