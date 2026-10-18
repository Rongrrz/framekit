// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));

const allowedDependencies = {
  internal: ['internal'],
  'internal/dom': ['internal', 'internal/dom'],
  'internal/runtime': ['internal', 'internal/dom', 'internal/runtime', 'state', 'values'],
  values: ['internal', 'values'],
  state: ['internal', 'state'],
  elements: ['elements', 'internal', 'internal/dom', 'internal/runtime', 'values'],
  modifiers: ['elements', 'internal', 'internal/runtime', 'modifiers', 'values'],
  animation: ['animation', 'internal', 'internal/runtime', 'state', 'values'],
  helpers: [
    'animation',
    'elements',
    'helpers',
    'internal',
    'internal/dom',
    'internal/runtime',
    'modifiers',
    'state',
    'values',
  ],
  devtools: [
    'devtools',
    'animation',
    'elements',
    'internal',
    'internal/dom',
    'internal/runtime',
    'helpers',
    'modifiers',
    'state',
    'values',
  ],
} as const;

type Domain = keyof typeof allowedDependencies;
type Dependency = Readonly<{ target: string; specifier: string; typeOnly: boolean }>;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);

    return entry.name === '__tests__'
      ? []
      : entry.isDirectory()
        ? sourceFiles(path)
        : path.endsWith('.ts')
          ? [path]
          : [];
  });

const domainOf = (file: string): Domain | undefined => {
  const [root, nested] = relative(sourceRoot, file).split(sep);
  const domain =
    root === 'internal' && (nested === 'dom' || nested === 'runtime') ? `internal/${nested}` : root;

  return domain && Object.hasOwn(allowedDependencies, domain) ? (domain as Domain) : undefined;
};

const dependenciesOf = (file: string): Dependency[] => {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);

  return source.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
      return [];
    }

    const specifier = statement.moduleSpecifier;

    if (!specifier || !ts.isStringLiteral(specifier) || !/^[#.]/.test(specifier.text)) {
      return [];
    }

    const target = specifier.text.startsWith('#')
      ? resolve(sourceRoot, specifier.text.slice(1).replace(/\.js$/, '.ts'))
      : resolve(dirname(file), specifier.text.replace(/\.js$/, '.ts'));

    const clause = ts.isImportDeclaration(statement) ? statement.importClause : undefined;
    const bindings = clause?.namedBindings;
    const exports = ts.isExportDeclaration(statement) ? statement.exportClause : undefined;

    const typeOnly = ts.isImportDeclaration(statement)
      ? clause?.isTypeOnly === true ||
        (!clause?.name &&
          bindings &&
          ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((entry) => entry.isTypeOnly))
      : statement.isTypeOnly ||
        (exports &&
          ts.isNamedExports(exports) &&
          exports.elements.length > 0 &&
          exports.elements.every((entry) => entry.isTypeOnly));

    return [{ target, specifier: specifier.text, typeOnly: Boolean(typeOnly) }];
  });
};

const graph = new Map(sourceFiles(sourceRoot).map((file) => [file, dependenciesOf(file)]));

it('keeps source dependencies within their declared domains', () => {
  const violations: string[] = [];

  for (const [file, dependencies] of graph) {
    const domain = domainOf(file);

    if (!domain) {
      continue;
    }

    const allowed: readonly string[] = allowedDependencies[domain];

    for (const dependency of dependencies) {
      const targetDomain = domainOf(dependency.target);
      // Exact class narrowing maps runtime handles to public types without importing factories.
      const classMapType =
        file === resolve(sourceRoot, 'internal/runtime/node/class-map.ts') &&
        dependency.typeOnly &&
        (targetDomain === 'elements' || targetDomain === 'modifiers');

      if (!targetDomain || (!allowed.includes(targetDomain) && !classMapType)) {
        violations.push(`${relative(sourceRoot, file)} imports ${dependency.specifier}`);
      }
    }
  }

  expect(violations).toEqual([]);
});

it('keeps runtime imports acyclic while allowing type-only relationships', () => {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (file: string, path: readonly string[]): void => {
    if (visiting.has(file)) {
      const cycle = [...path.slice(path.indexOf(file)), file]
        .map((entry) => relative(sourceRoot, entry))
        .join(' -> ');
      throw new Error(`Runtime import cycle: ${cycle}`);
    }

    if (visited.has(file)) {
      return;
    }

    visiting.add(file);

    for (const dependency of graph.get(file) ?? []) {
      if (!dependency.typeOnly && graph.has(dependency.target)) {
        visit(dependency.target, [...path, file]);
      }
    }

    visiting.delete(file);
    visited.add(file);
  };

  for (const file of graph.keys()) {
    visit(file, []);
  }
});
