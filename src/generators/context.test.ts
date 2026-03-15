import { describe, expect, it } from 'vitest';
import { buildTemplateContext, resolveConfig } from '../config.js';
import { generateContext } from './context.js';

function makeContext(overrides: Parameters<typeof resolveConfig>[0] = {}) {
  const resolved = resolveConfig(overrides);
  const context = buildTemplateContext(resolved);
  return { resolved, context };
}

describe('generateContext', () => {
  it('returns AGENTS.md when agentsMd is true', () => {
    const { resolved, context } = makeContext({ context: { agentsMd: true } });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('AGENTS.md');
  });

  it('does not return AGENTS.md when agentsMd is false', () => {
    const { resolved, context } = makeContext({
      context: { agentsMd: false, claudeMd: false, adr: false, skills: [] },
    });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('AGENTS.md');
  });

  it('returns per-app AGENTS.md for each configured app', () => {
    const { resolved, context } = makeContext({
      context: { agentsMd: true },
      apps: [
        { name: 'api', path: 'apps/api', type: 'backend' },
        { name: 'web', path: 'apps/web', type: 'frontend' },
      ],
    });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('apps/api/AGENTS.md');
    expect(paths).toContain('apps/web/AGENTS.md');
  });

  it('returns no per-app AGENTS.md when agentsMd is false', () => {
    const { resolved, context } = makeContext({
      context: { agentsMd: false, claudeMd: false, adr: false, skills: [] },
      apps: [{ name: 'api', path: 'apps/api', type: 'backend' }],
    });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('apps/api/AGENTS.md');
  });

  it('returns CLAUDE.md when claudeMd is true', () => {
    const { resolved, context } = makeContext({ context: { claudeMd: true } });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('CLAUDE.md');
  });

  it('does not return CLAUDE.md when claudeMd is false', () => {
    const { resolved, context } = makeContext({
      context: { agentsMd: false, claudeMd: false, adr: false, skills: [] },
    });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('CLAUDE.md');
  });

  it('returns ADR template when adr is true', () => {
    const { resolved, context } = makeContext({ context: { adr: true } });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('docs/adr/template.md');
  });

  it('does not return ADR template when adr is false', () => {
    const { resolved, context } = makeContext({
      context: { agentsMd: false, claudeMd: false, adr: false, skills: [] },
    });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('docs/adr/template.md');
  });

  it('returns skill files for configured skills that have templates', () => {
    const { resolved, context } = makeContext({
      context: { skills: ['pre-pr', 'new-package'] },
    });
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.claude/skills/pre-pr/SKILL.md');
    expect(paths).toContain('.claude/skills/new-package/SKILL.md');
  });

  it('skips skills that have no template', () => {
    const { resolved, context } = makeContext({
      context: { skills: ['nonexistent-skill-xyz'] },
    });
    // Should not throw
    const files = generateContext(resolved, context);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('.claude/skills/nonexistent-skill-xyz/SKILL.md');
  });

  it('rendered AGENTS.md contains the project name', () => {
    const { resolved, context } = makeContext({
      project: { name: 'acme-platform' },
      context: { agentsMd: true },
    });
    const files = generateContext(resolved, context);
    const agentsMd = files.find((f) => f.path === 'AGENTS.md');
    expect(agentsMd).toBeDefined();
    expect(agentsMd!.content).toContain('acme-platform');
  });

  it('rendered CLAUDE.md contains the project name', () => {
    const { resolved, context } = makeContext({
      project: { name: 'my-cool-project' },
      context: { claudeMd: true },
    });
    const files = generateContext(resolved, context);
    const claudeMd = files.find((f) => f.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd!.content).toContain('my-cool-project');
  });

  it('all generated files are marked as managed', () => {
    const { resolved, context } = makeContext({});
    const files = generateContext(resolved, context);
    for (const file of files) {
      expect(file.managed).toBe(true);
    }
  });
});
