import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach } from 'vitest';
import { scanProject } from './scan.js';

describe('scanProject', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harness-scan-'));
  });

  it('detects pnpm monorepo', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@acme/monorepo', packageManager: 'pnpm@9.0.0' }));
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n  - packages/*\n');
    mkdirSync(join(dir, 'apps/api'), { recursive: true });
    writeFileSync(join(dir, 'apps/api/package.json'), JSON.stringify({ name: '@acme/api', dependencies: { hono: '1.0.0' } }));
    mkdirSync(join(dir, 'packages/logger'), { recursive: true });
    writeFileSync(join(dir, 'packages/logger/package.json'), JSON.stringify({ name: '@acme/logger' }));

    const result = scanProject(dir);
    expect(result.monorepo).toBe(true);
    expect(result.packageManager).toBe('pnpm');
    expect(result.scope).toBe('@acme');
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0].name).toBe('api');
    expect(result.apps[0].type).toBe('backend');
    expect(result.packages).toEqual(['logger']);
  });

  it('detects frontend app by react dependency', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
    mkdirSync(join(dir, 'apps/web'), { recursive: true });
    writeFileSync(join(dir, 'apps/web/package.json'), JSON.stringify({ dependencies: { react: '19.0.0' } }));

    const result = scanProject(dir);
    expect(result.apps[0].type).toBe('frontend');
  });

  it('detects single-app project', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'my-api' }));

    const result = scanProject(dir);
    expect(result.monorepo).toBe(false);
    expect(result.name).toBe('my-api');
    expect(result.apps).toEqual([]);
  });

  it('detects biome linter', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(dir, 'biome.json'), '{}');

    const result = scanProject(dir);
    expect(result.linter).toBe('biome');
  });

  it('detects eslint linter', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(dir, '.eslintrc.json'), '{}');

    const result = scanProject(dir);
    expect(result.linter).toBe('eslint');
  });

  it('detects package manager from lockfile', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(dir, 'yarn.lock'), '');

    const result = scanProject(dir);
    expect(result.packageManager).toBe('yarn');
  });
});
