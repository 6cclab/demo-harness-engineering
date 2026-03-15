import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeneratedFile, ResolvedConfig, TemplateContext } from '../types.js';
import { readStaticFile, renderTemplate } from './helpers.js';

const TEMPLATES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../templates');

export function generateConstraints(config: ResolvedConfig, context: TemplateContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const harnessDir = join(TEMPLATES_DIR, 'constraints/harness');
  const scriptsDir = join(TEMPLATES_DIR, 'constraints/scripts');
  const hooksDir = join(TEMPLATES_DIR, 'constraints/hooks');

  // Harness package
  files.push(
    { path: 'packages/harness/package.json', content: renderTemplate(join(harnessDir, 'package.json.hbs'), context), managed: true },
    { path: 'packages/harness/tsconfig.json', content: readStaticFile(join(harnessDir, 'tsconfig.json')), managed: true },
    { path: 'packages/harness/vitest.config.ts', content: readStaticFile(join(harnessDir, 'vitest.config.ts')), managed: true },
    { path: 'packages/harness/src/import-rules.ts', content: renderTemplate(join(harnessDir, 'import-rules.ts.hbs'), context), managed: true },
    { path: 'packages/harness/src/structural.test.ts', content: renderTemplate(join(harnessDir, 'structural.test.ts.hbs'), context), managed: true },
    { path: 'packages/harness/src/golden-principles.test.ts', content: renderTemplate(join(harnessDir, 'golden-principles.test.ts.hbs'), context), managed: true },
  );

  // Scripts
  files.push(
    { path: 'scripts/check-imports.ts', content: renderTemplate(join(scriptsDir, 'check-imports.ts.hbs'), context), managed: true },
    { path: 'scripts/check-agents.ts', content: renderTemplate(join(scriptsDir, 'check-agents.ts.hbs'), context), managed: true },
    { path: 'scripts/scan-entropy.ts', content: renderTemplate(join(scriptsDir, 'scan-entropy.ts.hbs'), context), managed: true },
  );

  // Hooks
  if (config.constraints.hooks.preCommit) {
    files.push({
      path: '.husky/pre-commit',
      content: readStaticFile(join(hooksDir, 'pre-commit')),
      managed: true,
    });
  }
  if (config.constraints.hooks.commitMsg) {
    files.push({
      path: '.husky/commit-msg',
      content: readStaticFile(join(hooksDir, 'commit-msg')),
      managed: true,
    });
  }

  return files;
}
