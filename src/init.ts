import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import prompts from 'prompts';
import { generate } from './generate.js';
import { scanProject } from './scan.js';
import type { HarnessConfig } from './types.js';

function serializeConfig(config: HarnessConfig): string {
  const lines = [`import { defineConfig } from 'demo-harness-engineering';`, '', 'export default defineConfig('];
  lines.push(JSON.stringify(config, null, 2));
  lines.push(');');
  return lines.join('\n') + '\n';
}

export async function init(targetDir: string): Promise<void> {
  console.log(pc.bold('\n🔧 Harness Engineering — Init\n'));

  // 1. Scan
  console.log(pc.dim('Scanning project...'));
  const scan = scanProject(targetDir);

  // 2. Confirm
  console.log(`\nDetected:`);
  console.log(`  Name: ${pc.cyan(scan.name)}`);
  console.log(`  Scope: ${pc.cyan(scan.scope || '(none)')}`);
  console.log(`  Monorepo: ${pc.cyan(String(scan.monorepo))}`);
  console.log(`  Package manager: ${pc.cyan(scan.packageManager)}`);
  console.log(`  Linter: ${pc.cyan(scan.linter)}`);
  if (scan.apps.length > 0) {
    console.log(`  Apps: ${scan.apps.map((a) => pc.cyan(a.name)).join(', ')}`);
  }
  if (scan.packages.length > 0) {
    console.log(`  Packages: ${scan.packages.map((p) => pc.cyan(p)).join(', ')}`);
  }

  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: 'Does this look right?',
    initial: true,
  });
  if (!confirmed) {
    console.log(pc.yellow('Aborted. Edit harness.config.ts manually and run `generate`.'));
    return;
  }

  // 3. Select pillars
  const { pillars } = await prompts({
    type: 'multiselect',
    name: 'pillars',
    message: 'Which pillars to enable?',
    choices: [
      { title: 'Context (AGENTS.md, CLAUDE.md, ADR, skills)', value: 'context', selected: true },
      { title: 'Constraints (structural tests, import boundaries, hooks)', value: 'constraints', selected: true },
      { title: 'Entropy (eval framework, scanner, CI)', value: 'entropy', selected: true },
    ],
  });

  const config: HarnessConfig = {
    project: {
      name: scan.name,
      scope: scan.scope || undefined,
      monorepo: scan.monorepo,
      packageManager: scan.packageManager,
    },
    apps: scan.apps,
    packages: scan.packages,
  };

  // 4. Per-pillar questions
  if (pillars.includes('context')) {
    config.context = { agentsMd: true, claudeMd: true, adr: true, skills: ['pre-pr', 'new-package'] };
  }

  if (pillars.includes('constraints')) {
    const constraintAnswers = await prompts([
      {
        type: scan.apps.length > 0 ? 'multiselect' : null,
        name: 'clientOnlyPackages',
        message: 'Which packages are frontend-only? (backend apps cannot import these)',
        choices: scan.packages.map((p) => ({
          title: `${scan.scope}/${p}`,
          value: `${scan.scope}/${p}`,
        })),
      },
    ]);

    config.constraints = {
      importBoundaries: {
        clientOnlyPackages: constraintAnswers.clientOnlyPackages ?? [],
        approvedCrossAppImports: {},
        packageAppExceptions: {},
      },
      goldenPrinciples: [
        { id: 'GP-1', rule: 'No cross-app runtime imports', check: 'import-boundary' },
        { id: 'GP-2', rule: 'No console.log in source files', check: 'no-console-log' },
        { id: 'GP-3', rule: 'All packages have type-check script', check: 'type-check-script' },
      ],
      hooks: { preCommit: 'lint-staged', commitMsg: 'conventional' },
      linter: scan.linter,
    };
  }

  if (pillars.includes('entropy')) {
    const entropyAnswers = await prompts([
      {
        type: 'select',
        name: 'storageType',
        message: 'Eval report storage?',
        choices: [
          { title: 'None (stdout only)', value: 'none' },
          { title: 'S3-compatible (Garage, MinIO, AWS)', value: 's3' },
        ],
      },
      {
        type: 'text',
        name: 'runner',
        message: 'CI runner label?',
        initial: 'ubuntu-latest',
      },
    ]);

    config.entropy = {
      eval: true,
      scanner: true,
      storage: { type: entropyAnswers.storageType },
      ci: {
        runner: entropyAnswers.runner,
        secrets: 'github-secrets',
        schedule: '0 10 * * 1',
      },
    };
  }

  // 5. Write config
  const configPath = join(targetDir, 'harness.config.ts');
  writeFileSync(configPath, serializeConfig(config));
  console.log(pc.green(`\n✓ Created ${configPath}`));

  // 6. Generate
  console.log(pc.dim('\nGenerating files...'));
  const result = await generate(targetDir, config);
  for (const file of result.filesWritten) {
    console.log(`  ${pc.green('+')} ${file}`);
  }

  // 7. Install deps (best-effort)
  try {
    console.log(pc.dim(`\nInstalling dependencies...`));
    execSync(`${scan.packageManager} install`, { cwd: targetDir, stdio: 'inherit' });
  } catch {
    console.log(pc.yellow('Could not install dependencies automatically. Run install manually.'));
  }

  // 8. Summary
  console.log(pc.bold(pc.green(`\n✓ Harness engineering initialized! ${result.filesWritten.length} files created.`)));
  console.log(`\nNext steps:`);
  console.log(`  1. Review AGENTS.md and CLAUDE.md — customize for your project`);
  console.log(`  2. Run ${pc.cyan(`${scan.packageManager} harness`)} to check structural tests`);
  console.log(`  3. Run ${pc.cyan(`${scan.packageManager} check:imports`)} to verify import boundaries`);
  console.log(`  4. Create project-specific skills: ${pc.cyan('npx demo-harness-engineering scaffold skill <name>')}`);
}
