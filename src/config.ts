import type {
  HarnessConfig,
  ResolvedAppConfig,
  ResolvedConfig,
  TemplateContext,
} from './types.js';

export function defineConfig(config: HarnessConfig): HarnessConfig {
  return config;
}

const DEFAULT_APP_SECTIONS = ['## Role', '## Structure', '## Patterns', '## Forbidden'];
const DEFAULT_ROOT_SECTIONS = ['## Golden Principles'];

export function resolveConfig(config: HarnessConfig): ResolvedConfig {
  const project = {
    name: config.project?.name ?? 'my-project',
    scope: config.project?.scope ?? '',
    monorepo: config.project?.monorepo ?? false,
    packageManager: config.project?.packageManager ?? 'npm',
  };

  const apps: ResolvedAppConfig[] = (config.apps ?? []).map((app) => ({
    name: app.name,
    path: app.path,
    type: app.type,
    srcDir: app.srcDir ?? 'src',
  }));

  const packages = config.packages ?? [];

  const context = {
    agentsMd: config.context?.agentsMd ?? true,
    claudeMd: config.context?.claudeMd ?? true,
    adr: config.context?.adr ?? true,
    skills: config.context?.skills ?? ['pre-pr', 'new-package'],
    requiredAppSections: config.context?.requiredAppSections ?? DEFAULT_APP_SECTIONS,
    requiredRootSections: config.context?.requiredRootSections ?? DEFAULT_ROOT_SECTIONS,
  };

  const constraints = {
    importBoundaries: {
      clientOnlyPackages: config.constraints?.importBoundaries?.clientOnlyPackages ?? [],
      approvedCrossAppImports: config.constraints?.importBoundaries?.approvedCrossAppImports ?? {},
      packageAppExceptions: config.constraints?.importBoundaries?.packageAppExceptions ?? {},
    },
    goldenPrinciples: config.constraints?.goldenPrinciples ?? [],
    hooks: {
      preCommit: config.constraints?.hooks?.preCommit ?? 'lint-staged',
      commitMsg: config.constraints?.hooks?.commitMsg ?? 'conventional',
    },
    linter: config.constraints?.linter ?? 'none',
  };

  const entropy = {
    eval: config.entropy?.eval ?? true,
    scanner: config.entropy?.scanner ?? true,
    storage: {
      type: config.entropy?.storage?.type ?? 'none',
      bucket: config.entropy?.storage?.bucket ?? '',
    },
    ci: {
      runner: config.entropy?.ci?.runner ?? 'ubuntu-latest',
      secrets: config.entropy?.ci?.secrets ?? 'github-secrets',
      schedule: config.entropy?.ci?.schedule ?? '0 10 * * 1',
    },
  };

  return { project, apps, packages, context, constraints, entropy };
}

export function buildTemplateContext(config: ResolvedConfig): TemplateContext {
  const backendApps = config.apps.filter((a) => a.type === 'backend');
  const frontendApps = config.apps.filter((a) => a.type === 'frontend');

  const appPackageNames: Record<string, string> = {};
  for (const app of config.apps) {
    appPackageNames[app.name] = config.project.scope
      ? `${config.project.scope}/${app.name}`
      : app.name;
  }

  return {
    project: config.project,
    apps: config.apps,
    packages: config.packages,
    backendApps,
    frontendApps,
    scope: config.project.scope,
    appPackageNames,
    context: config.context,
    constraints: config.constraints,
    entropy: config.entropy,
  };
}
