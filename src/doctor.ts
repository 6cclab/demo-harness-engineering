import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasFileChanged, readManifest } from './manifest.js';
import { resolveConfig } from './config.js';
import type { DoctorResult, HarnessConfig } from './types.js';

export async function doctor(targetDir: string, config: HarnessConfig): Promise<DoctorResult> {
  const resolved = resolveConfig(config);
  const manifest = readManifest(targetDir);
  const issues: string[] = [];

  // Check managed files for modifications
  for (const path of Object.keys(manifest.managed)) {
    const fullPath = join(targetDir, path);
    if (!existsSync(fullPath)) {
      issues.push(`${path}: managed file is missing from disk`);
    } else if (hasFileChanged(manifest, targetDir, path)) {
      issues.push(`${path}: modified since last generation — consider marking userOwned`);
    }
  }

  // Check config references exist on disk
  for (const app of resolved.apps) {
    if (!existsSync(join(targetDir, app.path))) {
      issues.push(`Config references app "${app.name}" at "${app.path}" but directory does not exist`);
    }
  }

  for (const pkg of resolved.packages) {
    if (!existsSync(join(targetDir, 'packages', pkg))) {
      issues.push(`Config references package "${pkg}" but packages/${pkg} does not exist`);
    }
  }

  // Check required devDependencies
  const pkgJsonPath = join(targetDir, 'package.json');
  if (existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const required = ['vitest', 'tsx'];
    if (config.constraints?.hooks?.preCommit) {
      required.push('husky', 'lint-staged');
    }
    for (const dep of required) {
      if (!(dep in allDeps)) {
        issues.push(`Missing devDependency: ${dep}`);
      }
    }
  }

  return { healthy: issues.length === 0, issues };
}
