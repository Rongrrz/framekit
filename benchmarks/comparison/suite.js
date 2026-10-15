import { version as reactVersion } from 'react';

import { assert, host } from './case-support.js';
import { constructionCases } from './cases/construction.js';
import { hierarchyCases } from './cases/hierarchy.js';
import { lifetimeCases } from './cases/lifetime.js';
import { updatesCases } from './cases/updates.js';
import { compatibilityAudit } from './fixtures.js';

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (value) => Math.round(value * 1000) / 1000;
const cases = [...constructionCases, ...updatesCases, ...hierarchyCases, ...lifetimeCases];

window.comparisonCases = cases.map(({ id, label, count, group }) => ({ id, label, count, group }));
window.runComparisonCase = async (id, runtime, repetitions = 7) => {
  const definition = cases.find((entry) => entry.id === id);
  const samples = [];
  let scenario;
  try {
    for (let index = 0; index < repetitions + 2; index += 1) {
      if (!scenario || definition.fresh) {
        scenario = definition.prepare(runtime);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      scenario.before?.();
      const start = performance.now();
      scenario.run();
      const elapsed = performance.now() - start;
      scenario.verify();
      if (index >= 2) {
        samples.push(elapsed);
      }
      if (definition.fresh) {
        scenario.dispose();
        scenario = undefined;
      }
    }
  } finally {
    scenario?.dispose();
  }
  assert(host().childElementCount === 0, 'Case left root children');
  return {
    id,
    runtime,
    repetitions,
    medianMs: round(median(samples)),
    p95Ms: round([...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)]),
    samples,
  };
};
window.compatibilityAudit = compatibilityAudit;
window.comparisonEnvironment = { reactVersion, mode: import.meta.env.MODE };
