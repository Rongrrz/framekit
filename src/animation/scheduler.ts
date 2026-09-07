import { throwCollectedErrors } from '../runtime/errors';

export type AnimationFrameTask = (timestamp: number) => void;

const activeTasks = new Set<AnimationFrameTask>();
const pendingTasks = new Set<AnimationFrameTask>();
let scheduledFrame: ReturnType<typeof requestAnimationFrame> | undefined;
let runningFrame = false;
let requestFrameSource: typeof requestAnimationFrame | undefined;

/** Schedules persistent animation work behind the runtime's single browser-frame callback. */
export function scheduleAnimationTask(task: AnimationFrameTask): void {
  resetForReplacedFrameSource();
  if (activeTasks.has(task) || pendingTasks.has(task)) return;
  // Work started during a callback begins on the next frame.
  if (runningFrame) pendingTasks.add(task);
  else activeTasks.add(task);
  scheduleBrowserFrame();
}

/** Stops a task without disturbing other animations sharing the browser frame. */
export function cancelAnimationTask(task: AnimationFrameTask): void {
  activeTasks.delete(task);
  pendingTasks.delete(task);
  if (activeTasks.size === 0 && pendingTasks.size === 0 && scheduledFrame !== undefined) {
    cancelAnimationFrame(scheduledFrame);
    scheduledFrame = undefined;
  }
}

function scheduleBrowserFrame(): void {
  if (scheduledFrame !== undefined || activeTasks.size + pendingTasks.size === 0) return;
  scheduledFrame = requestAnimationFrame(runAnimationFrame);
}

function runAnimationFrame(timestamp: number): void {
  scheduledFrame = undefined;
  runningFrame = true;
  const errors: unknown[] = [];
  for (const task of activeTasks) {
    try {
      task(timestamp);
    } catch (error) {
      activeTasks.delete(task);
      errors.push(error);
    }
  }
  runningFrame = false;

  for (const task of pendingTasks) activeTasks.add(task);
  pendingTasks.clear();
  scheduleBrowserFrame();

  throwCollectedErrors(errors, 'Multiple animations failed during one browser frame.');
}

function resetForReplacedFrameSource(): void {
  if (requestFrameSource === requestAnimationFrame) return;
  activeTasks.clear();
  pendingTasks.clear();
  scheduledFrame = undefined;
  runningFrame = false;
  requestFrameSource = requestAnimationFrame;
}
