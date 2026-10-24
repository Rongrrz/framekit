/** New scripts are modules. Their owner determines the lifetime and the default DOM scope. */
export const defaultScriptSource = `import type { ScriptContext } from '@framekit/script';

export default (ctx: ScriptContext): void => {
  // ctx.parent is the attached FrameKit object; ctx.root is the scene/prefab root.
  // ctx.node('id') looks up an object in this scene or prefab instance.
  // ctx.query() queries only the owner's project DOM.
  // Use ctx.listen, ctx.interval, ctx.timeout, ctx.fetch, and ctx.own for cleanup.
};
`;
