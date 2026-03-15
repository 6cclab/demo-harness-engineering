import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildTemplateContext, resolveConfig } from './config.js';
import { generateConstraints } from './generators/constraints.js';
import { generateContext } from './generators/context.js';
import { generateEntropy } from './generators/entropy.js';
import {
  addManagedFile,
  hasFileChanged,
  isUserOwned,
  readManifest,
  writeManifest,
} from './manifest.js';
import type { GeneratedFile, GenerateResult, HarnessConfig } from './types.js';

export async function generate(
  targetDir: string,
  config: HarnessConfig,
  opts?: { pillar?: 'context' | 'constraints' | 'entropy' },
): Promise<GenerateResult> {
  const resolved = resolveConfig(config);
  const context = buildTemplateContext(resolved);
  let manifest = readManifest(targetDir);

  const allFiles: GeneratedFile[] = [];

  if (!opts?.pillar || opts.pillar === 'context') {
    if (config.context) allFiles.push(...generateContext(resolved, context));
  }
  if (!opts?.pillar || opts.pillar === 'constraints') {
    if (config.constraints) allFiles.push(...generateConstraints(resolved, context));
  }
  if (!opts?.pillar || opts.pillar === 'entropy') {
    if (config.entropy) allFiles.push(...generateEntropy(resolved, context));
  }

  const filesWritten: string[] = [];
  const warnings: string[] = [];

  for (const file of allFiles) {
    // Skip user-owned files
    if (isUserOwned(manifest, file.path)) {
      continue;
    }

    // Check if managed file was modified by user
    if (hasFileChanged(manifest, targetDir, file.path)) {
      warnings.push(`${file.path}: modified since last generation. Use "doctor" to review.`);
      continue;
    }

    // Write file
    const fullPath = join(targetDir, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content);
    filesWritten.push(file.path);

    // Update manifest
    if (file.managed) {
      manifest = addManagedFile(manifest, file.path, file.content);
    }
  }

  writeManifest(targetDir, manifest);

  return { filesWritten, warnings };
}
