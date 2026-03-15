import { execSync } from 'node:child_process';
import { existsSync, globSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ClaudeCodeAdapter } from './adapters/claude-code.js';
import { ManualAdapter } from './adapters/manual.js';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible.js';
import { gradeTask, parseTaskCard } from './grader.js';
import { uploadReport } from './storage.js';
import type {
  AgentAdapter,
  AgentConfig,
  GradeOptions,
  ReportCard,
} from './types.js';

const HARNESS_FILES_TO_STRIP = [
  'CLAUDE.md',
  'AGENTS.md',
  'apps/*/AGENTS.md',
  'packages/*/AGENTS.md',
  '.claude/skills/new-route/SKILL.md',
  '.claude/skills/new-feature/SKILL.md',
  '.claude/skills/new-client-route/SKILL.md',
  '.claude/skills/new-package/SKILL.md',
  '.claude/skills/pre-pr/SKILL.md',
  '.claude/skills/validate-ui/SKILL.md',
  '.claude/skills/local-setup/SKILL.md',
];

function loadAdapterConfig(configPath: string): AgentConfig {
  return parseYaml(readFileSync(configPath, 'utf-8')) as AgentConfig;
}

function createAdapter(config: AgentConfig): AgentAdapter {
  switch (config.type) {
    case 'claude-code':
      return new ClaudeCodeAdapter(config);
    case 'openai-compatible':
      return new OpenAICompatibleAdapter(config);
    case 'manual':
      return new ManualAdapter();
    default:
      throw new Error(`Unknown adapter type: ${config.type}`);
  }
}

function createWorktree(repoRoot: string): string {
  const branch = `eval-${Date.now()}`;
  const worktreePath = join(repoRoot, '.eval-worktrees', branch);
  execSync(`git worktree add "${worktreePath}" -b "${branch}"`, {
    cwd: repoRoot,
    stdio: 'pipe',
  });
  execSync('pnpm install --frozen-lockfile', {
    cwd: worktreePath,
    stdio: 'pipe',
    timeout: 120_000,
  });
  return worktreePath;
}

function cleanupWorktree(repoRoot: string, worktreePath: string): void {
  const branch = worktreePath.split('/').pop() ?? '';
  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: repoRoot,
      stdio: 'pipe',
    });
  } catch {
    /* ignore */
  }
  try {
    execSync(`git branch -D "${branch}"`, { cwd: repoRoot, stdio: 'pipe' });
  } catch {
    /* ignore */
  }
}

function stripHarnessDocs(worktreePath: string): void {
  for (const pattern of HARNESS_FILES_TO_STRIP) {
    const matches = globSync(pattern, { cwd: worktreePath });
    for (const match of matches) {
      const fullPath = join(worktreePath, match);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    }
  }
}

export async function runEval(opts: {
  taskPath: string;
  agentConfigPath: string;
  repoRoot: string;
  noHarness: boolean;
  upload: boolean;
  baseline: string;
  autonomy?: number;
  efficiency?: number;
}): Promise<ReportCard> {
  const taskCard = parseTaskCard(opts.taskPath);
  const config = loadAdapterConfig(opts.agentConfigPath);
  const adapter = createAdapter(config);
  const timeout = config.timeout ?? 600_000;

  console.log(`\nEval: ${taskCard.title}`);
  console.log(`Agent: ${adapter.name}`);
  console.log(`No-harness: ${opts.noHarness}`);

  // Step 1: Create worktree
  console.log('Creating worktree...');
  const worktreePath = createWorktree(opts.repoRoot);

  try {
    // Step 2: Strip harness docs if A/B testing
    if (opts.noHarness) {
      console.log('Stripping harness documentation...');
      stripHarnessDocs(worktreePath);
    }

    // Step 3-4: Execute agent
    console.log(`Running agent (timeout: ${timeout / 1000}s)...`);
    const result = await adapter.execute({
      prompt: taskCard.prompt,
      workdir: worktreePath,
      timeout,
    });
    console.log(
      `Agent finished: exit=${result.exitCode}, duration=${Math.round(result.duration / 1000)}s`,
    );

    // Step 5: Grade
    console.log('Grading...');
    const gradeOpts: GradeOptions = {
      baseline: opts.baseline,
      workdir: worktreePath,
      agent: adapter.name,
      autonomy: opts.autonomy,
      efficiency: opts.efficiency,
      upload: opts.upload,
    };

    const report = await gradeTask(taskCard, gradeOpts);

    // Step 6: Upload
    if (opts.upload) {
      const s3Path = await uploadReport(report);
      if (s3Path) {
        console.log(`Report uploaded to ${s3Path}`);
      }
    }

    // Print report
    console.log(JSON.stringify(report, null, 2));

    return report;
  } finally {
    // Step 7: Cleanup
    console.log('Cleaning up worktree...');
    cleanupWorktree(opts.repoRoot, worktreePath);
  }
}
