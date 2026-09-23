// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

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
} as const;

type SourceDomain = keyof typeof allowedDependencies;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function domainFiles(domain: SourceDomain): string[] {
  const directory = resolve(sourceRoot, domain);
  if (domain !== 'internal') {
    return sourceFiles(directory);
  }
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => resolve(directory, entry.name));
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

function sourceDomain(file: string): SourceDomain {
  const [root, nested] = relative(sourceRoot, file).split(sep);
  if (root === 'internal' && (nested === 'dom' || nested === 'runtime')) {
    return `internal/${nested}`;
  }
  return root as SourceDomain;
}

function crossDomainPrefix(domain: SourceDomain): string {
  return `#${domain}/`;
}

describe('source dependency direction', () => {
  for (const [domain, allowedDomains] of Object.entries(allowedDependencies)) {
    it(`keeps ${domain} imports inside its allowed domains`, () => {
      for (const file of domainFiles(domain as SourceDomain)) {
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
          const targetDomain = sourceDomain(target);
          const expectedPrefix = targetDomain === domain ? '.' : crossDomainPrefix(targetDomain);
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
            file.endsWith(`${sep}internal${sep}runtime${sep}node${sep}class-map.ts`) &&
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
    const files = sourceFiles(sourceRoot).filter((file) => !file.includes(`${sep}__tests__${sep}`));
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

  it('keeps index.ts reserved for the package entry point', () => {
    const nestedIndexes = sourceFiles(sourceRoot)
      .filter((file) => !file.includes(`${sep}__tests__${sep}`))
      .filter((file) => file.endsWith(`${sep}index.ts`))
      .map((file) => relative(sourceRoot, file));

    expect(nestedIndexes).toEqual(['index.ts']);
  });
});
