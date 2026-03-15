import { describe, expect, it } from 'vitest';
import { buildTemplateContext, defineConfig, resolveConfig } from './config.js';

describe('defineConfig', () => {
  it('returns the config as-is', () => {
    const config = { project: { name: 'test' } };
    expect(defineConfig(config)).toEqual(config);
  });
});

describe('resolveConfig', () => {
  it('fills defaults for empty config', () => {
    const resolved = resolveConfig({});
    expect(resolved.project.name).toBe('my-project');
    expect(resolved.project.packageManager).toBe('npm');
    expect(resolved.apps).toEqual([]);
    expect(resolved.context.agentsMd).toBe(true);
    expect(resolved.context.skills).toEqual(['pre-pr', 'new-package']);
    expect(resolved.context.requiredAppSections).toEqual([
      '## Role', '## Structure', '## Patterns', '## Forbidden',
    ]);
    expect(resolved.constraints.hooks.preCommit).toBe('lint-staged');
    expect(resolved.constraints.hooks.commitMsg).toBe('conventional');
    expect(resolved.entropy.eval).toBe(true);
    expect(resolved.entropy.ci.runner).toBe('ubuntu-latest');
  });

  it('preserves provided values', () => {
    const resolved = resolveConfig({
      project: { name: 'my-app', scope: '@acme', packageManager: 'pnpm' },
      apps: [{ name: 'api', path: 'apps/api', type: 'backend' }],
    });
    expect(resolved.project.name).toBe('my-app');
    expect(resolved.project.scope).toBe('@acme');
    expect(resolved.apps[0].srcDir).toBe('src');
  });

  it('defaults srcDir to src', () => {
    const resolved = resolveConfig({
      apps: [{ name: 'web', path: 'apps/web', type: 'frontend' }],
    });
    expect(resolved.apps[0].srcDir).toBe('src');
  });

  it('preserves custom srcDir', () => {
    const resolved = resolveConfig({
      apps: [{ name: 'web', path: 'apps/web', type: 'frontend', srcDir: 'app' }],
    });
    expect(resolved.apps[0].srcDir).toBe('app');
  });
});

describe('buildTemplateContext', () => {
  it('derives backendApps and frontendApps', () => {
    const resolved = resolveConfig({
      project: { scope: '@test' },
      apps: [
        { name: 'api', path: 'apps/api', type: 'backend' },
        { name: 'web', path: 'apps/web', type: 'frontend' },
      ],
    });
    const ctx = buildTemplateContext(resolved);
    expect(ctx.backendApps).toHaveLength(1);
    expect(ctx.backendApps[0].name).toBe('api');
    expect(ctx.frontendApps).toHaveLength(1);
    expect(ctx.frontendApps[0].name).toBe('web');
  });

  it('builds appPackageNames from scope', () => {
    const resolved = resolveConfig({
      project: { scope: '@acme' },
      apps: [{ name: 'api', path: 'apps/api', type: 'backend' }],
    });
    const ctx = buildTemplateContext(resolved);
    expect(ctx.appPackageNames).toEqual({ api: '@acme/api' });
  });

  it('handles empty scope', () => {
    const resolved = resolveConfig({
      apps: [{ name: 'api', path: 'apps/api', type: 'backend' }],
    });
    const ctx = buildTemplateContext(resolved);
    expect(ctx.appPackageNames).toEqual({ api: 'api' });
  });
});
