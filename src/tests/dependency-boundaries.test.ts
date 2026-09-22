// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedDependencies = {
  core: ['core'],
  animation: ['animation', 'core'],
  helpers: ['helpers', 'core', 'animation'],
} as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
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
          const target = resolve(dirname(file), specifier.text);
          const allowed = allowedDomains.some((allowedDomain) => {
            const root = resolve(sourceRoot, allowedDomain);
            return target === root || target.startsWith(`${root}${sep}`);
          });
          expect(allowed, `${file} imports ${specifier.text}`).toBe(true);
        }
      }
    });
  }
});
