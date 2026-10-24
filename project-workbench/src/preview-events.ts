import type { Instance } from 'framekit';

import type { SceneAction } from './document';
import type { ExpandedScene, RuntimeScope } from './expand-scene';

/** Preview uses the same portable actions emitted as ordinary TypeScript in exported components. */
export const runPreviewEvent = (
  scene: ExpandedScene,
  handles: ReadonlyMap<string, Instance>,
  source: string,
  event: string,
  report: (message: string) => void,
): void => {
  let dispatched = 0;
  const trigger = (source: string, event: string): void => {
    dispatched += 1;

    if (dispatched > 64) {
      throw new TypeError('Event connection loop stopped after 64 actions.');
    }

    // Factories register a prefab's handlers before its parent's handlers on that root.
    for (const scope of scene.scopes.toReversed()) {
      for (const binding of scope.bindings) {
        if (scope.nodes.get(binding.source) === source && binding.event === event) {
          run(scope, binding.action);
        }
      }
    }
  };
  const run = (scope: RuntimeScope, action: SceneAction): void => {
    if (action.type === 'emit') {
      if (scope.parent === null || scope.instance === null) {
        report(`Event: ${action.event}`);
      } else {
        trigger(scope.instance, action.event);
      }

      return;
    }

    const target = handles.get(scope.nodes.get(action.target)!);

    if (!target) {
      return;
    }

    if (action.type === 'set') {
      target.setProperties({ [action.property]: action.value });
    } else if (action.type === 'toggle') {
      const value =
        action.property === 'Visible' && 'Visible' in target
          ? target.Visible
          : 'Disabled' in target
            ? target.Disabled
            : false;
      target.setProperties({ [action.property]: !value });
    } else if (target.isA('TextLabel') || target.isA('TextButton') || target.isA('TextInput')) {
      if (action.type === 'increment') {
        target.Text = String((Number(target.Text) || 0) + action.amount);
      } else {
        const from = handles.get(scope.nodes.get(action.source)!);

        if (from && (from.isA('TextInput') || from.isA('TextLabel') || from.isA('TextButton'))) {
          target.Text = from.Text;
        }
      }
    }
  };

  trigger(source, event);
};
