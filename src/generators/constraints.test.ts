import { describe, expect, it } from 'vitest';
import { buildTemplateContext, resolveConfig } from '../config.js';
import { generateConstraints } from './constraints.js';

function makeContext(overrides: Parameters<typeof resolveConfig>[0] = {}) {
  const resolved = resolveConfig(overrides);
  const context = buildTemplateContext(resolved);
  return { resolved, context };
}

describe('generateConstraints', () => {
  it('returns harness package files', () => {
    const { resolved, context } = makeContext({});
    const files = generateConstraints(resolved, context);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('packages/harness/package.json');
    expect(paths).toContain('packages/harness/tsconfig.json');
    expect(paths).toContain('packages/harness/vitest.config.ts');
    expect(paths).toContain('packages/harness/src/import-rules.ts');
    expect(paths).toContain('packages/harness/src/structural.test.ts');
    expect(paths).toContain('packages/harness/src/golden-principles.test.ts');
  });

  it('returns script files', () => {
    const { resolved, context } = makeContext({});
    const files = generateConstraints(resolved, context);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('scripts/check-imports.ts');
    expect(paths).toContain('scripts/check-agents.ts');
    expect(paths).toContain('scripts/scan-entropy.ts');
  });

  it('returns pre-commit hook when preCommit is set', () => {
    const { resolved, context } = makeContext({
      constraints: { hooks: { preCommit: 'lint-staged' } },
    });
    const files = generateConstraints(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.husky/pre-commit');
  });

  it('omits pre-commit hook when preCommit is false', () => {
    const { resolved, context } = makeContext({
      constraints: { hooks: { preCommit: false } },
    });
    const files = generateConstraints(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('.husky/pre-commit');
  });

  it('returns commit-msg hook when commitMsg is set', () => {
    const { resolved, context } = makeContext({
      constraints: { hooks: { commitMsg: 'conventional' } },
    });
    const files = generateConstraints(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.husky/commit-msg');
  });

  it('omits commit-msg hook when commitMsg is false', () => {
    const { resolved, context } = makeContext({
      constraints: { hooks: { commitMsg: false } },
    });
    const files = generateConstraints(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('.husky/commit-msg');
  });

  it('renders scope into harness package.json', () => {
    const { resolved, context } = makeContext({
      project: { scope: '@myorg' },
    });
    const files = generateConstraints(resolved, context);
    const pkgJson = files.find((f) => f.path === 'packages/harness/package.json');
    expect(pkgJson).toBeDefined();
    expect(pkgJson!.content).toContain('@myorg/harness');
  });

  it('all generated files are marked as managed', () => {
    const { resolved, context } = makeContext({});
    const files = generateConstraints(resolved, context);
    for (const file of files) {
      expect(file.managed).toBe(true);
    }
  });
});
