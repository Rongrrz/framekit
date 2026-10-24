import ts from 'typescript';

import type { ProjectFile } from './project-export';
import { scriptBudget } from './script-budget';

self.onmessage = (event: MessageEvent<readonly ProjectFile[]>): void => {
  try {
    const modules: Record<string, string> = {};
    for (const file of event.data) {
      const result = ts.transpileModule(file.source, {
        fileName: file.path,
        compilerOptions: {
          target: ts.ScriptTarget.ES2023,
          module: ts.ModuleKind.CommonJS,
          isolatedModules: true,
        },
        reportDiagnostics: true,
        ...(file.path.startsWith('src/scripts/')
          ? { transformers: { before: [scriptBudget(file.source)] } }
          : {}),
      });
      const errors =
        result.diagnostics?.filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
        ) ?? [];
      if (errors.length) {
        throw new Error(
          `${file.path}: ${errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')).join('\n')}`,
        );
      }
      modules[file.path] = result.outputText;
    }
    self.postMessage({ modules });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
