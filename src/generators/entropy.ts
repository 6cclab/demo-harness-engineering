import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeneratedFile, ResolvedConfig, TemplateContext } from '../types.js';
import { renderTemplate } from './helpers.js';

const TEMPLATES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../templates');

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) files.push(...collectFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

export function generateEntropy(config: ResolvedConfig, context: TemplateContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  if (config.entropy.eval) {
    const evalDir = join(TEMPLATES_DIR, 'entropy/eval');

    // Templated files
    files.push({
      path: 'packages/eval/package.json',
      content: renderTemplate(join(evalDir, 'package.json.hbs'), context),
      managed: true,
    });

    // Example task card
    const taskCardPath = join(evalDir, 'tasks/example-backend-endpoint.yaml.hbs');
    try {
      files.push({
        path: 'packages/eval/tasks/example-backend-endpoint.yaml',
        content: renderTemplate(taskCardPath, context),
        managed: true,
      });
    } catch { /* template may not exist */ }

    // Verbatim copy: src/, agents/
    const verbatimDirs = ['src', 'agents'];
    for (const subDir of verbatimDirs) {
      const fullDir = join(evalDir, subDir);
      for (const file of collectFiles(fullDir)) {
        const relPath = relative(evalDir, file);
        files.push({
          path: `packages/eval/${relPath}`,
          content: readFileSync(file, 'utf-8'),
          managed: true,
        });
      }
    }

    // Static config files
    for (const staticFile of ['tsconfig.json', 'vitest.config.ts']) {
      const fullPath = join(evalDir, staticFile);
      try {
        files.push({
          path: `packages/eval/${staticFile}`,
          content: readFileSync(fullPath, 'utf-8'),
          managed: true,
        });
      } catch { /* file may not exist */ }
    }
  }

  // CI workflows
  if (config.entropy.ci) {
    const workflowsDir = join(TEMPLATES_DIR, 'entropy/workflows');
    const workflows = [
      { template: 'harness-entropy.yaml.hbs', output: '.github/workflows/harness-entropy.yaml' },
      { template: 'eval-post-pr.yaml.hbs', output: '.github/workflows/eval-post-pr.yaml' },
      { template: 'eval-suite.yaml.hbs', output: '.github/workflows/eval-suite.yaml' },
    ];
    for (const wf of workflows) {
      try {
        files.push({
          path: wf.output,
          content: renderTemplate(join(workflowsDir, wf.template), context),
          managed: true,
        });
      } catch { /* template may not exist */ }
    }
  }

  return files;
}
