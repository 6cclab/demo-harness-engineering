import { describe, expect, it } from 'vitest';
import { buildTemplateContext, resolveConfig } from '../config.js';
import { generateEntropy } from './entropy.js';

function makeContext(overrides: Parameters<typeof resolveConfig>[0] = {}) {
  const resolved = resolveConfig(overrides);
  const context = buildTemplateContext(resolved);
  return { resolved, context };
}

describe('generateEntropy', () => {
  it('returns eval package files when entropy.eval is true', () => {
    const { resolved, context } = makeContext({ entropy: { eval: true } });
    const files = generateEntropy(resolved, context);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('packages/eval/package.json');
  });

  it('returns no eval files when entropy.eval is false', () => {
    const { resolved, context } = makeContext({ entropy: { eval: false, ci: {} } });
    const files = generateEntropy(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('packages/eval/package.json');
  });

  it('returns verbatim src and agents files', () => {
    const { resolved, context } = makeContext({ entropy: { eval: true } });
    const files = generateEntropy(resolved, context);
    const paths = files.map((f) => f.path);

    // Should include files from eval/src/ and eval/agents/
    const srcFiles = paths.filter((p) => p.startsWith('packages/eval/src/'));
    const agentFiles = paths.filter((p) => p.startsWith('packages/eval/agents/'));
    expect(srcFiles.length).toBeGreaterThan(0);
    expect(agentFiles.length).toBeGreaterThan(0);
  });

  it('returns static config files', () => {
    const { resolved, context } = makeContext({ entropy: { eval: true } });
    const files = generateEntropy(resolved, context);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('packages/eval/tsconfig.json');
    expect(paths).toContain('packages/eval/vitest.config.ts');
  });

  it('returns CI workflow files when entropy.ci is set', () => {
    const { resolved, context } = makeContext({
      entropy: { eval: false, ci: { runner: 'ubuntu-latest', secrets: 'github-secrets' } },
    });
    const files = generateEntropy(resolved, context);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('.github/workflows/harness-entropy.yaml');
    expect(paths).toContain('.github/workflows/eval-post-pr.yaml');
    expect(paths).toContain('.github/workflows/eval-suite.yaml');
  });

  it('renders runner into workflow template', () => {
    const { resolved, context } = makeContext({
      entropy: { eval: false, ci: { runner: 'self-hosted', secrets: 'github-secrets' } },
    });
    const files = generateEntropy(resolved, context);
    const workflow = files.find((f) => f.path === '.github/workflows/harness-entropy.yaml');
    expect(workflow).toBeDefined();
    expect(workflow!.content).toContain('self-hosted');
  });

  it('renders s3 dependency into eval package.json when storage type is s3', () => {
    const { resolved, context } = makeContext({
      entropy: { eval: true, storage: { type: 's3', bucket: 'my-bucket' } },
    });
    const files = generateEntropy(resolved, context);
    const pkgJson = files.find((f) => f.path === 'packages/eval/package.json');
    expect(pkgJson).toBeDefined();
    expect(pkgJson!.content).toContain('@aws-sdk/client-s3');
  });

  it('does not include s3 dependency when storage type is none', () => {
    const { resolved, context } = makeContext({
      entropy: { eval: true, storage: { type: 'none' } },
    });
    const files = generateEntropy(resolved, context);
    const pkgJson = files.find((f) => f.path === 'packages/eval/package.json');
    expect(pkgJson).toBeDefined();
    expect(pkgJson!.content).not.toContain('@aws-sdk/client-s3');
  });

  it('renders scope into eval package.json', () => {
    const { resolved, context } = makeContext({
      project: { scope: '@acme' },
      entropy: { eval: true },
    });
    const files = generateEntropy(resolved, context);
    const pkgJson = files.find((f) => f.path === 'packages/eval/package.json');
    expect(pkgJson).toBeDefined();
    expect(pkgJson!.content).toContain('@acme/eval');
  });

  it('all generated files are marked as managed', () => {
    const { resolved, context } = makeContext({});
    const files = generateEntropy(resolved, context);
    for (const file of files) {
      expect(file.managed).toBe(true);
    }
  });
});
