import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashContent, readManifest } from './manifest.js';
import { generate } from './generate.js';
import type { HarnessConfig } from './types.js';

const MINIMAL_CONFIG: HarnessConfig = {
  project: { name: 'test-project', scope: '@test', packageManager: 'pnpm' },
  context: { agentsMd: true, claudeMd: false, adr: false, skills: [] },
  constraints: undefined,
  entropy: undefined,
};

describe('generate', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harness-generate-'));
  });

  it('writes context files to disk', async () => {
    const result = await generate(dir, MINIMAL_CONFIG);
    expect(result.filesWritten).toContain('AGENTS.md');
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true);
  });

  it('creates manifest with content hashes', async () => {
    await generate(dir, MINIMAL_CONFIG);
    const manifest = readManifest(dir);
    expect(manifest.managed).toHaveProperty('AGENTS.md');
    const content = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    expect(manifest.managed['AGENTS.md'].contentHash).toBe(hashContent(content));
  });

  it('skips user-owned files', async () => {
    // First generation
    await generate(dir, MINIMAL_CONFIG);

    // Mark AGENTS.md as user-owned by writing a manifest with it in userOwned
    const manifest = readManifest(dir);
    const updatedManifest = {
      ...manifest,
      managed: Object.fromEntries(
        Object.entries(manifest.managed).filter(([k]) => k !== 'AGENTS.md'),
      ),
      userOwned: [...manifest.userOwned, 'AGENTS.md'],
    };
    const { writeManifest } = await import('./manifest.js');
    writeManifest(dir, updatedManifest);

    // Second generation — should skip AGENTS.md
    const result = await generate(dir, MINIMAL_CONFIG);
    expect(result.filesWritten).not.toContain('AGENTS.md');
  });

  it('produces a warning for managed files modified by the user', async () => {
    // First generation
    await generate(dir, MINIMAL_CONFIG);

    // Tamper with the generated file
    writeFileSync(join(dir, 'AGENTS.md'), 'user edited this content');

    // Second generation — should warn, not overwrite
    const result = await generate(dir, MINIMAL_CONFIG);
    expect(result.warnings.some((w) => w.includes('AGENTS.md'))).toBe(true);
    expect(result.filesWritten).not.toContain('AGENTS.md');
    // File should still contain user content
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf-8')).toBe('user edited this content');
  });

  it('pillar filter: only generates context files when pillar is context', async () => {
    const config: HarnessConfig = {
      project: { name: 'test', scope: '@test' },
      context: { agentsMd: true, claudeMd: false, adr: false, skills: [] },
      constraints: { hooks: { preCommit: 'lint-staged', commitMsg: 'conventional' } },
    };
    const result = await generate(dir, config, { pillar: 'context' });
    expect(result.filesWritten).toContain('AGENTS.md');
    expect(result.filesWritten).not.toContain('packages/harness/package.json');
  });

  it('pillar filter: only generates constraints files when pillar is constraints', async () => {
    const config: HarnessConfig = {
      project: { name: 'test', scope: '@test' },
      context: { agentsMd: true, claudeMd: false, adr: false, skills: [] },
      constraints: { hooks: { preCommit: 'lint-staged', commitMsg: 'conventional' } },
    };
    const result = await generate(dir, config, { pillar: 'constraints' });
    expect(result.filesWritten).toContain('packages/harness/package.json');
    expect(result.filesWritten).not.toContain('AGENTS.md');
  });

  it('pillar filter: only generates entropy files when pillar is entropy', async () => {
    const config: HarnessConfig = {
      project: { name: 'test', scope: '@test' },
      context: { agentsMd: false, claudeMd: false, adr: false, skills: [] },
      entropy: { eval: true, ci: {} },
    };
    const result = await generate(dir, config, { pillar: 'entropy' });
    expect(result.filesWritten).toContain('packages/eval/package.json');
    expect(result.filesWritten).not.toContain('AGENTS.md');
  });

  it('generates all pillars when no pillar filter is given', async () => {
    const config: HarnessConfig = {
      project: { name: 'test', scope: '@test' },
      context: { agentsMd: true, claudeMd: false, adr: false, skills: [] },
      constraints: { hooks: { preCommit: 'lint-staged', commitMsg: false } },
      entropy: { eval: true, ci: {} },
    };
    const result = await generate(dir, config);
    expect(result.filesWritten).toContain('AGENTS.md');
    expect(result.filesWritten).toContain('packages/harness/package.json');
    expect(result.filesWritten).toContain('packages/eval/package.json');
  });

  it('writes manifest file to disk', async () => {
    await generate(dir, MINIMAL_CONFIG);
    expect(existsSync(join(dir, '.harness-manifest.json'))).toBe(true);
  });

  it('second generation with same content writes nothing and produces no warnings', async () => {
    await generate(dir, MINIMAL_CONFIG);
    const result2 = await generate(dir, MINIMAL_CONFIG);
    // AGENTS.md hash matches so it gets skipped (already in manifest with matching hash)
    expect(result2.warnings).toHaveLength(0);
  });
});
