// @vitest-environment node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { expect, it } from 'vitest';

import { createEditor } from '../src/editor';
import { exportTypeScript } from '../src/export';
import { nodeDefinitions } from '../src/schema';

it('exports source that type-checks against the public API for every supported node', () => {
  const editor = createEditor();

  for (const type of Object.keys(nodeDefinitions) as (keyof typeof nodeDefinitions)[]) {
    editor.select(null);
    editor.add('Frame');
    editor.add(type);
  }

  const configPath = fileURLToPath(new URL('../../tsconfig.json', import.meta.url));
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  const path = resolve(dirname(configPath), 'project-workbench/export-contract.ts');
  const source = exportTypeScript(editor.state.get().document);
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
    file === path
      ? ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
      : getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([path], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  expect(
    diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
  ).toEqual([]);
});
