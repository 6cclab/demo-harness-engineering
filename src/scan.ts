import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AppConfig, ScanResult } from './types.js';

const FRONTEND_DEPS = ['react', 'react-dom', 'vue', 'svelte', '@angular/core', 'next', 'nuxt', 'solid-js'];

function readJson(path: string): any {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function detectPackageManager(dir: string): 'pnpm' | 'npm' | 'yarn' | 'bun' {
  const pkg = readJson(join(dir, 'package.json'));
  if (pkg?.packageManager) {
    const pm = pkg.packageManager.split('@')[0];
    if (['pnpm', 'npm', 'yarn', 'bun'].includes(pm)) return pm as any;
  }
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun';
  return 'npm';
}

function detectMonorepo(dir: string): boolean {
  if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return true;
  if (existsSync(join(dir, 'lerna.json'))) return true;
  const pkg = readJson(join(dir, 'package.json'));
  if (pkg?.workspaces) return true;
  return false;
}

function detectLinter(dir: string): 'biome' | 'eslint' | 'none' {
  if (existsSync(join(dir, 'biome.json')) || existsSync(join(dir, 'biome.jsonc'))) return 'biome';
  const eslintFiles = ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml', 'eslint.config.js', 'eslint.config.mjs'];
  for (const f of eslintFiles) {
    if (existsSync(join(dir, f))) return 'eslint';
  }
  return 'none';
}

function classifyApp(appDir: string): 'backend' | 'frontend' {
  const pkg = readJson(join(appDir, 'package.json'));
  if (!pkg) return 'backend';
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const dep of FRONTEND_DEPS) {
    if (dep in allDeps) return 'frontend';
  }
  return 'backend';
}

function scanDirectory(dir: string, subDir: string): AppConfig[] {
  const fullPath = join(dir, subDir);
  if (!existsSync(fullPath)) return [];
  return readdirSync(fullPath)
    .filter((d) => {
      const p = join(fullPath, d);
      return statSync(p).isDirectory() && existsSync(join(p, 'package.json'));
    })
    .map((d) => ({
      name: d,
      path: `${subDir}/${d}`,
      type: classifyApp(join(fullPath, d)),
    }));
}

function scanPackages(dir: string): string[] {
  const fullPath = join(dir, 'packages');
  if (!existsSync(fullPath)) return [];
  return readdirSync(fullPath).filter((d) => {
    const p = join(fullPath, d);
    return statSync(p).isDirectory() && existsSync(join(p, 'package.json'));
  });
}

export function scanProject(dir: string): ScanResult {
  const pkg = readJson(join(dir, 'package.json')) ?? {};
  const nameField = pkg.name ?? '';

  let name = nameField;
  let scope = '';
  if (nameField.startsWith('@')) {
    const parts = nameField.split('/');
    scope = parts[0];
    name = parts[1] ?? nameField;
  }

  const monorepo = detectMonorepo(dir);
  const packageManager = detectPackageManager(dir);
  const linter = detectLinter(dir);

  const apps = monorepo ? scanDirectory(dir, 'apps') : [];
  const packages = monorepo ? scanPackages(dir) : [];

  return { name, scope, monorepo, packageManager, apps, packages, linter };
}
