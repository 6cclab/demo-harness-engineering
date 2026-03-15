import { defineConfig } from 'demo-harness-engineering';

export default defineConfig({
  project: {
    name: 'volttrack',
    scope: '@volttrack',
    monorepo: true,
    packageManager: 'pnpm',
  },

  apps: [
    { name: 'api', path: 'apps/api', type: 'backend' },
    { name: 'auth', path: 'apps/auth', type: 'backend' },
    { name: 'client', path: 'apps/client', type: 'frontend', srcDir: 'app' },
    { name: 'event-bus', path: 'apps/event-bus', type: 'backend' },
    { name: 'ws-gateway', path: 'apps/ws-gateway', type: 'backend' },
  ],

  packages: [
    'database', 'logger', 'tracing', 'cache', 'ui', 'core',
    'client-utils', 'constants', 'api-types', 'graphql-queries',
    'rivian-graphql', 'kafka', 'tsconfig',
  ],

  context: {
    agentsMd: true,
    claudeMd: true,
    adr: true,
    skills: ['pre-pr', 'new-package'],
    requiredAppSections: ['## Role', '## Structure', '## Patterns', '## Forbidden'],
    requiredRootSections: ['## Golden Principles', '## Dependency Layer Model', '## Common Agent Pitfalls'],
  },

  constraints: {
    importBoundaries: {
      clientOnlyPackages: ['@volttrack/ui', '@volttrack/core', '@volttrack/client-utils'],
      approvedCrossAppImports: {
        client: [
          '@volttrack/ws-gateway/topics',
          '@volttrack/event-bus/types',
          '@volttrack/api/sdk',
          '@volttrack/api/schema',
          '@volttrack/api/types',
          '@volttrack/api/utils',
          '@volttrack/auth/sdk',
          '@volttrack/auth/schema',
          '@volttrack/auth/better-auth',
        ],
        api: ['@volttrack/auth/better-auth', '@volttrack/auth/sdk'],
        'event-bus': ['@volttrack/api/types', '@volttrack/api/sdk', '@volttrack/api/schema'],
        'ws-gateway': ['@volttrack/auth/sdk', '@volttrack/api/types', '@volttrack/api/utils'],
      },
      packageAppExceptions: {
        core: ['@volttrack/auth/schema'],
        'client-utils': ['@volttrack/auth/schema'],
      },
    },
    goldenPrinciples: [
      { id: 'GP-1', rule: 'No cross-app runtime imports', check: 'import-boundary' },
      { id: 'GP-2', rule: 'All backend routes via createRoute()', check: 'no-console-log' },
      { id: 'GP-3', rule: 'All errors via handleError', check: 'no-console-log' },
      { id: 'GP-4', rule: 'No console.log — use @volttrack/logger', check: 'no-console-log' },
      { id: 'GP-5', rule: 'Schema changes require Prisma migration', check: 'type-check-script' },
      { id: 'GP-6', rule: 'New routes require SDK regeneration', check: 'type-check-script' },
      { id: 'GP-7', rule: 'Build-time env vars in turbo.json', check: 'type-check-script' },
      { id: 'GP-8', rule: 'Every package must have type-check script', check: 'type-check-script' },
    ],
    hooks: { preCommit: 'lint-staged', commitMsg: 'conventional' },
    linter: 'biome',
  },

  entropy: {
    eval: true,
    scanner: true,
    storage: { type: 's3', bucket: 'volttrack-evals' },
    ci: {
      runner: '[6cclab]',
      secrets: 'infisical',
      schedule: '0 10 * * 3',
    },
  },
});
