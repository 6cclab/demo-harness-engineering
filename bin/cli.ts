import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  // When compiled: dist/bin/cli.js — package.json is at ../../package.json
  // When run as source: bin/cli.ts — package.json is at ../package.json
  // Use ../../package.json to handle the compiled dist/bin path.
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
  return pkg.version;
}

function printHelp(): void {
  console.log(`
${pc.bold('demo-harness-engineering')} — Harness engineering for TypeScript projects

${pc.bold('Usage:')}
  demo-harness-engineering <command> [options]

${pc.bold('Commands:')}
  init                          Interactive setup wizard
  generate                      Re-generate files from harness.config.ts
  add <pillar>                  Add a pillar (context | constraints | entropy)
  scaffold <type> [name]        Create a new harness artifact
  doctor                        Check config and file health

${pc.bold('Scaffold types:')}
  skill <name>                  Create a new skill
  principle <id>                Add a golden principle
  task <name>                   Create an eval task card
  rule                          Add a CLAUDE.md rule
  agents-md <path>              Generate AGENTS.md for an app/package
  agents-md-root                Generate root AGENTS.md from config
  adr <name>                    Create an ADR

${pc.bold('Options:')}
  --pillar <name>               Only generate for a specific pillar
  --version                     Print version
  --help                        Print this help
`);
}

async function loadConfigFromDir(dir: string) {
  const configPath = join(dir, 'harness.config.ts');
  try {
    const mod = await import(configPath);
    return mod.default;
  } catch {
    // Try loading as JSON fallback
    try {
      const content = readFileSync(configPath, 'utf-8');
      // Extract the object from defineConfig(...)
      const match = content.match(/defineConfig\(([\s\S]+)\);?\s*$/);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch { /* ignore */ }
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(getVersion());
    return;
  }

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    return;
  }

  const command = args[0];
  const targetDir = resolve(process.cwd());

  switch (command) {
    case 'init': {
      const { init } = await import('../src/init.js');
      await init(targetDir);
      break;
    }

    case 'generate': {
      const config = await loadConfigFromDir(targetDir);
      if (!config) {
        console.error(pc.red('No harness.config.ts found. Run `init` first.'));
        process.exit(1);
      }
      const pillarIdx = args.indexOf('--pillar');
      const pillar = pillarIdx !== -1 ? args[pillarIdx + 1] : undefined;
      const { generate } = await import('../src/generate.js');
      const result = await generate(targetDir, config, pillar ? { pillar: pillar as any } : undefined);
      console.log(pc.green(`\n✓ Generated ${result.filesWritten.length} files`));
      for (const f of result.filesWritten) {
        console.log(`  ${pc.green('+')} ${f}`);
      }
      if (result.warnings.length > 0) {
        console.log(pc.yellow(`\n${result.warnings.length} warning(s):`));
        for (const w of result.warnings) {
          console.log(`  ${pc.yellow('!')} ${w}`);
        }
      }
      break;
    }

    case 'add': {
      const pillar = args[1];
      if (!pillar || !['context', 'constraints', 'entropy'].includes(pillar)) {
        console.error(pc.red('Usage: add <context | constraints | entropy>'));
        process.exit(1);
      }
      console.log(pc.bold(`\nAdd the following to your harness.config.ts:\n`));
      if (pillar === 'context') {
        console.log(pc.cyan('  context: { agentsMd: true, claudeMd: true, adr: true, skills: [\'pre-pr\', \'new-package\'] },'));
      } else if (pillar === 'constraints') {
        console.log(pc.cyan('  constraints: {\n    importBoundaries: { clientOnlyPackages: [], approvedCrossAppImports: {} },\n    goldenPrinciples: [],\n    hooks: { preCommit: \'lint-staged\', commitMsg: \'conventional\' },\n    linter: \'biome\',\n  },'));
      } else {
        console.log(pc.cyan('  entropy: {\n    eval: true,\n    scanner: true,\n    storage: { type: \'none\' },\n    ci: { runner: \'ubuntu-latest\', secrets: \'github-secrets\', schedule: \'0 10 * * 1\' },\n  },'));
      }
      console.log(pc.dim('\nAfter adding, run: npx demo-harness-engineering generate'));

      const config = await loadConfigFromDir(targetDir);
      if (config) {
        const { generate } = await import('../src/generate.js');
        const result = await generate(targetDir, config, { pillar: pillar as any });
        console.log(pc.green(`\n✓ Generated ${result.filesWritten.length} files for ${pillar} pillar`));
      }
      break;
    }

    case 'scaffold': {
      const type = args[1];
      const name = args[2] ?? '';
      if (!type) {
        console.error(pc.red('Usage: scaffold <type> [name]'));
        console.log('Types: skill, principle, task, rule, agents-md, agents-md-root, adr');
        process.exit(1);
      }
      const config = await loadConfigFromDir(targetDir);
      const { scaffold } = await import('../src/scaffold.js');
      await scaffold(type, name, targetDir, config ?? {});
      break;
    }

    case 'doctor': {
      const config = await loadConfigFromDir(targetDir);
      if (!config) {
        console.error(pc.red('No harness.config.ts found. Run `init` first.'));
        process.exit(1);
      }
      const { doctor } = await import('../src/doctor.js');
      const result = await doctor(targetDir, config);
      if (result.healthy) {
        console.log(pc.green('\n✓ Everything looks healthy!'));
      } else {
        console.log(pc.yellow(`\n${result.issues.length} issue(s) found:\n`));
        for (const issue of result.issues) {
          console.log(`  ${pc.yellow('!')} ${issue}`);
        }
      }
      break;
    }

    default:
      console.error(pc.red(`Unknown command: ${command}`));
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(pc.red('Fatal error:'), err);
  process.exit(1);
});
