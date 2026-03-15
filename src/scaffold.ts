import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import prompts from 'prompts';
import { resolveConfig } from './config.js';
import { generate } from './generate.js';
import type { HarnessConfig, ResolvedConfig } from './types.js';

export async function scaffold(
  type: string,
  name: string,
  targetDir: string,
  config: HarnessConfig,
): Promise<void> {
  const resolved = resolveConfig(config);

  switch (type) {
    case 'skill':
      return scaffoldSkill(name, targetDir, resolved);
    case 'principle':
      return scaffoldPrinciple(name, resolved);
    case 'task':
      return scaffoldTask(name, targetDir, resolved);
    case 'rule':
      return scaffoldRule(targetDir);
    case 'agents-md':
      return scaffoldAgentsMd(name, targetDir, resolved);
    case 'agents-md-root':
      return scaffoldAgentsMdRoot(targetDir, config);
    case 'adr':
      return scaffoldAdr(name, targetDir);
    default:
      console.error(pc.red(`Unknown scaffold type: ${type}`));
      console.log('Available: skill, principle, task, rule, agents-md, agents-md-root, adr');
      process.exit(1);
  }
}

async function scaffoldSkill(name: string, targetDir: string, config: ResolvedConfig): Promise<void> {
  const { description } = await prompts({
    type: 'text',
    name: 'description',
    message: 'What does this skill do?',
  });

  const { apps } = await prompts({
    type: config.apps.length > 0 ? 'multiselect' : null,
    name: 'apps',
    message: 'Which apps does it apply to?',
    choices: config.apps.map((a) => ({ title: a.name, value: a.name, selected: true })),
  });

  const { patterns } = await prompts({
    type: 'text',
    name: 'patterns',
    message: 'Key patterns to follow? (comma-separated)',
  });

  const { forbidden } = await prompts({
    type: 'text',
    name: 'forbidden',
    message: 'Things to avoid? (comma-separated)',
  });

  const appList = (apps ?? config.apps.map((a) => a.name)).join(', ');
  const content = `---
name: ${name}
description: ${description ?? name}
user_invocable: true
---

# ${name}

## Applies to

${appList}

## Checklist

<!-- Add steps here -->

## Patterns

${(patterns ?? '').split(',').map((p: string) => `- ${p.trim()}`).filter((p: string) => p !== '- ').join('\n') || '<!-- Add patterns here -->'}

## Forbidden

${(forbidden ?? '').split(',').map((f: string) => `- ${f.trim()}`).filter((f: string) => f !== '- ').join('\n') || '<!-- Add forbidden actions here -->'}
`;

  const skillDir = join(targetDir, '.claude/skills', name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), content);
  console.log(pc.green(`✓ Created .claude/skills/${name}/SKILL.md`));
}

async function scaffoldPrinciple(id: string, _config: ResolvedConfig): Promise<void> {
  const { rule } = await prompts({ type: 'text', name: 'rule', message: 'What is the rule?' });
  const { check } = await prompts({
    type: 'select',
    name: 'check',
    message: 'Check type?',
    choices: [
      { title: 'import-boundary', value: 'import-boundary' },
      { title: 'no-console-log', value: 'no-console-log' },
      { title: 'type-check-script', value: 'type-check-script' },
      { title: 'agents-md-exists', value: 'agents-md-exists' },
      { title: 'no-package-app-import', value: 'no-package-app-import' },
      { title: 'no-client-in-backend', value: 'no-client-in-backend' },
    ],
  });

  console.log(pc.bold('\nAdd this to your harness.config.ts constraints.goldenPrinciples array:\n'));
  console.log(pc.cyan(`  { id: '${id}', rule: '${rule}', check: '${check}' },`));
  console.log(pc.dim('\nThen run: npx demo-harness-engineering generate'));
}

async function scaffoldTask(name: string, targetDir: string, _config: ResolvedConfig): Promise<void> {
  const { category } = await prompts({
    type: 'select',
    name: 'category',
    message: 'Category?',
    choices: [
      { title: 'backend-only', value: 'backend-only' },
      { title: 'client-only', value: 'client-only' },
      { title: 'full-stack', value: 'full-stack' },
      { title: 'schema-change', value: 'schema-change' },
      { title: 'bug-fix', value: 'bug-fix' },
      { title: 'refactor', value: 'refactor' },
    ],
  });
  const { difficulty } = await prompts({
    type: 'select',
    name: 'difficulty',
    message: 'Difficulty?',
    choices: [
      { title: 'easy', value: 'easy' },
      { title: 'medium', value: 'medium' },
      { title: 'hard', value: 'hard' },
    ],
  });
  const { prompt } = await prompts({
    type: 'text',
    name: 'prompt',
    message: 'Task prompt (what should the agent build)?',
  });

  const yaml = `id: ${name}
title: "${prompt?.slice(0, 60) ?? name}"
difficulty: ${difficulty ?? 'medium'}
category: ${category ?? 'backend-only'}
prompt: |
  ${prompt ?? 'Describe what the agent should build...'}

rubric:
  correctness:
    - check: harness_passes
      points: 10
      description: "Structural tests pass"
    - check: type_check_passes
      points: 10
      description: "Type check passes"
    - check: lint_passes
      points: 5
      description: "Lint passes"

  completeness:
    # Add file_exists / file_modified / grep_match checks here

  pattern_adherence:
    # Add grep_match / grep_no_match checks here

  autonomy:
    scoring: manual
    max_points: 15
    description: "How far did the agent get without intervention?"

  efficiency:
    scoring: manual
    max_points: 10
    description: "Clean execution or excessive retries?"

max_score: 50
`;

  const tasksDir = join(targetDir, 'packages/eval/tasks');
  mkdirSync(tasksDir, { recursive: true });
  writeFileSync(join(tasksDir, `${name}.yaml`), yaml);
  console.log(pc.green(`✓ Created packages/eval/tasks/${name}.yaml`));
  console.log(pc.dim('Edit the rubric to add completeness and pattern_adherence checks.'));
}

async function scaffoldRule(targetDir: string): Promise<void> {
  const { rule } = await prompts({ type: 'text', name: 'rule', message: 'What is the rule?' });
  const { section } = await prompts({
    type: 'select',
    name: 'section',
    message: 'Which section?',
    choices: [
      { title: 'Golden Principles', value: '## Golden Principles' },
      { title: 'Key Patterns', value: '## Key Patterns' },
      { title: 'Testing', value: '## Testing' },
      { title: 'Conventions', value: '## Conventions' },
    ],
  });

  const claudePath = join(targetDir, 'CLAUDE.md');
  if (!existsSync(claudePath)) {
    console.error(pc.red('CLAUDE.md not found. Run init first.'));
    return;
  }

  const content = readFileSync(claudePath, 'utf-8');
  const sectionIdx = content.indexOf(section);
  if (sectionIdx === -1) {
    // Append to end
    appendFileSync(claudePath, `\n${section}\n\n- ${rule}\n`);
  } else {
    // Find next section or end of file, insert before it
    const afterSection = content.indexOf('\n## ', sectionIdx + section.length);
    const insertAt = afterSection === -1 ? content.length : afterSection;
    const updated = content.slice(0, insertAt) + `\n- ${rule}\n` + content.slice(insertAt);
    writeFileSync(claudePath, updated);
  }
  console.log(pc.green(`✓ Added rule to CLAUDE.md under "${section}"`));
}

async function scaffoldAgentsMd(appPath: string, targetDir: string, config: ResolvedConfig): Promise<void> {
  const fullAppDir = join(targetDir, appPath);
  if (!existsSync(fullAppDir)) {
    console.error(pc.red(`Directory ${appPath} does not exist.`));
    return;
  }

  // Scan structure
  const srcDir = join(fullAppDir, 'src');
  let structure = '';
  if (existsSync(srcDir)) {
    try {
      const entries = readdirSync(srcDir, { withFileTypes: true });
      structure = entries
        .map((e) => `${e.isDirectory() ? '├── ' : '├── '}${e.name}${e.isDirectory() ? '/' : ''}`)
        .join('\n');
    } catch { /* empty */ }
  }

  // Detect framework from deps
  const pkgPath = join(fullAppDir, 'package.json');
  let patterns = '';
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if ('hono' in allDeps) patterns += '- Uses Hono HTTP framework\n';
    if ('@hono/zod-openapi' in allDeps) patterns += '- Routes defined with createRoute() from @hono/zod-openapi\n';
    if ('express' in allDeps) patterns += '- Uses Express HTTP framework\n';
    if ('fastify' in allDeps) patterns += '- Uses Fastify HTTP framework\n';
    if ('react' in allDeps) patterns += '- React application\n';
    if ('next' in allDeps) patterns += '- Next.js framework\n';
    if ('bullmq' in allDeps) patterns += '- Uses BullMQ for job queues\n';
    if ('prisma' in allDeps || '@prisma/client' in allDeps) patterns += '- Uses Prisma ORM\n';
  }

  const { role } = await prompts({ type: 'text', name: 'role', message: `What is ${appPath}'s role?` });
  const { forbidden } = await prompts({ type: 'text', name: 'forbidden', message: 'Forbidden patterns? (comma-separated)' });

  const content = `# ${appPath.split('/').pop()} Agent Guide

## Role

${role ?? '<!-- Describe what this app does -->'}

## Structure

\`\`\`
src/
${structure || '├── ...'}
\`\`\`

## Patterns

${patterns || '<!-- Describe key patterns -->'}

## Forbidden

${(forbidden ?? '').split(',').map((f: string) => `- ${f.trim()}`).filter((f: string) => f !== '- ').join('\n') || '<!-- List forbidden actions -->'}
`;

  writeFileSync(join(fullAppDir, 'AGENTS.md'), content);
  console.log(pc.green(`✓ Created ${appPath}/AGENTS.md`));
}

async function scaffoldAgentsMdRoot(targetDir: string, config: HarnessConfig): Promise<void> {
  // Re-use the context generator for root AGENTS.md
  const result = await generate(targetDir, config, { pillar: 'context' });
  const agentsMdWritten = result.filesWritten.includes('AGENTS.md');
  if (agentsMdWritten) {
    console.log(pc.green('✓ Generated root AGENTS.md from config'));
  } else {
    console.log(pc.yellow('AGENTS.md was not generated — it may be marked userOwned'));
  }
}

async function scaffoldAdr(name: string, targetDir: string): Promise<void> {
  const adrDir = join(targetDir, 'docs/adr');
  mkdirSync(adrDir, { recursive: true });

  // Find next sequence number
  let seq = 1;
  if (existsSync(adrDir)) {
    const existing = readdirSync(adrDir).filter((f) => /^\d{4}-/.test(f));
    if (existing.length > 0) {
      const lastNum = Math.max(...existing.map((f) => parseInt(f.split('-')[0], 10)));
      seq = lastNum + 1;
    }
  }
  const seqStr = String(seq).padStart(4, '0');

  const { status } = await prompts({
    type: 'select',
    name: 'status',
    message: 'Status?',
    choices: [
      { title: 'Proposed', value: 'Proposed' },
      { title: 'Accepted', value: 'Accepted' },
    ],
  });
  const { context } = await prompts({ type: 'text', name: 'context', message: 'Context (why is this needed)?' });
  const { decision } = await prompts({ type: 'text', name: 'decision', message: 'Decision (what are we doing)?' });
  const { consequences } = await prompts({ type: 'text', name: 'consequences', message: 'Consequences?' });

  const content = `# ADR-${seqStr}: ${name}

## Status

${status ?? 'Proposed'}

## Context

${context ?? '<!-- Why is this needed? -->'}

## Decision

${decision ?? '<!-- What are we doing? -->'}

## Consequences

${consequences ?? '<!-- What becomes easier or harder? -->'}

## Agent Notes

<!-- Implementation guidance for AI agents -->
`;

  writeFileSync(join(adrDir, `${seqStr}-${name}.md`), content);
  console.log(pc.green(`✓ Created docs/adr/${seqStr}-${name}.md`));
}
