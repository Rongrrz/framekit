// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedDependencies = {
  internal: ['internal'],
  values: ['internal', 'values'],
  state: ['internal', 'state'],
  dom: ['dom', 'internal'],
  runtime: ['dom', 'internal', 'runtime', 'state', 'values'],
  elements: ['dom', 'elements', 'internal', 'runtime', 'values'],
  modifiers: ['elements', 'internal', 'modifiers', 'runtime', 'values'],
  animation: ['animation', 'internal', 'runtime', 'state', 'values'],
  behaviors: [
    'animation',
    'behaviors',
    'dom',
    'elements',
    'internal',
    'modifiers',
    'runtime',
    'state',
    'values',
  ],
} as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function runtimeDependencies(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  return source.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
      return [];
    }
    if (
      (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) ||
      (ts.isExportDeclaration(statement) && statement.isTypeOnly)
    ) {
      return [];
    }
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier)) {
      return [];
    }
    const dependency = resolveSourceImport(file, specifier.text);
    return dependency ? [dependency] : [];
  });
}

function resolveSourceImport(file: string, specifier: string): string | undefined {
  if (specifier.startsWith('#')) {
    return resolve(sourceRoot, specifier.slice(1).replace(/\.js$/, '.ts'));
  }
  if (specifier.startsWith('.')) {
    return resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
  }
  return undefined;
}

describe('source dependency direction', () => {
  for (const [domain, allowedDomains] of Object.entries(allowedDependencies)) {
    it(`keeps ${domain} imports inside its allowed domains`, () => {
      for (const file of sourceFiles(resolve(sourceRoot, domain))) {
        const source = ts.createSourceFile(
          file,
          readFileSync(file, 'utf8'),
          ts.ScriptTarget.Latest,
        );
        for (const statement of source.statements) {
          if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
            continue;
          }
          const specifier = statement.moduleSpecifier;
          if (!specifier || !ts.isStringLiteral(specifier)) {
            continue;
          }
          const target = resolveSourceImport(file, specifier.text);
          if (!target) {
            continue;
          }
          const targetDomain = relative(sourceRoot, target).split(sep)[0];
          const expectedPrefix = targetDomain === domain ? '.' : `#${targetDomain}/`;
          expect(
            specifier.text.startsWith(expectedPrefix),
            `${file} should import ${specifier.text} through ${expectedPrefix}`,
          ).toBe(true);
          const allowedByDomain = allowedDomains.some((allowedDomain) => {
            const root = resolve(sourceRoot, allowedDomain);
            return target === root || target.startsWith(`${root}${sep}`);
          });
          // Class narrowing is the one intentional reverse type dependency: the runtime maps
          // built-in class names to their public element and modifier types without importing them
          // at runtime.
          const allowedClassMapType =
            file.endsWith(`${sep}runtime${sep}node${sep}class-map.ts`) &&
            ts.isImportDeclaration(statement) &&
            statement.importClause?.isTypeOnly === true &&
            ['elements', 'modifiers'].some((domain) => {
              const root = resolve(sourceRoot, domain);
              return target === root || target.startsWith(`${root}${sep}`);
            });
          expect(allowedByDomain || allowedClassMapType, `${file} imports ${specifier.text}`).toBe(
            true,
          );
        }
      }
    });
  }

  it('keeps runtime imports acyclic', () => {
    const files = sourceFiles(sourceRoot).filter((file) => !file.includes(`${sep}tests${sep}`));
    const productionFiles = new Set(files);
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (file: string, path: readonly string[]): void => {
      if (visiting.has(file)) {
        const cycleStart = path.indexOf(file);
        const cycle = [...path.slice(cycleStart), file]
          .map((entry) => relative(sourceRoot, entry))
          .join(' -> ');
        throw new Error(`Runtime import cycle: ${cycle}`);
      }
      if (visited.has(file)) {
        return;
      }
      visiting.add(file);
      for (const dependency of runtimeDependencies(file)) {
        if (productionFiles.has(dependency)) {
          visit(dependency, [...path, file]);
        }
      }
      visiting.delete(file);
      visited.add(file);
    };

    for (const file of files) {
      visit(file, []);
    }
  });
});
