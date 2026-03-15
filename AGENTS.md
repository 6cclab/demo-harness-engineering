# demo-harness-engineering

A CLI tool for scaffolding AI coding agent harnesses in TypeScript monorepos. Generates Context, Constraints, and Entropy artifacts from a single `harness.config.ts`.

## Stack

- TypeScript (ES2023, ESM-only via `"type": "module"`)
- Node >= 20
- pnpm (package manager)
- tsup (build)
- vitest (tests)
- Handlebars (template engine for generated files)

## Project layout

```
bin/cli.ts          CLI entrypoint — raw argv parsing, dispatches to commands
src/
  types.ts          All domain interfaces (HarnessConfig, ResolvedConfig, etc.)
  config.ts         defineConfig(), resolveConfig(), buildTemplateContext()
  generate.ts       Orchestrates pillar generators
  init.ts           Interactive setup wizard
  scaffold.ts       Scaffold subcommands (skill, principle, task, rule, adr, agents-md)
  doctor.ts         Config + file health checker
  scan.ts           Repo scanner — infers apps, packages, linter, package manager
  manifest.ts       Tracks managed vs user-owned generated files
  generators/
    context.ts      Generates CLAUDE.md, AGENTS.md, skills, ADR stubs
    constraints.ts  Generates structural tests, import rules, hooks
    entropy.ts      Generates eval framework, task cards, CI workflows
    helpers.ts      Shared template/file utilities
templates/          Handlebars templates organized by pillar
```

## Commands

```
pnpm build          Build with tsup
pnpm test           Run vitest
pnpm type-check     Run tsc --noEmit
pnpm dev            Watch mode build
```

## Conventions

- Conventional commits required (`feat:`, `fix:`, `chore:`, etc.)
- Releases are automated via semantic-release on `main`
- Tests live next to source files as `*.test.ts`
- No CLI framework — uses raw `process.argv` parsing
- Config is loaded via dynamic `import()` of `harness.config.ts` from the target directory
- All generator output is tracked in `.harness-manifest.json` for diffing managed vs user-owned files

## Key types

- `HarnessConfig` — user-facing config shape (all fields optional)
- `ResolvedConfig` — config with all defaults filled in
- `TemplateContext` — extends resolved config with derived fields for templates (`backendApps`, `frontendApps`, `appPackageNames`)
- `ManifestFile` — tracks content hashes of managed files

## Working with generators

Each pillar generator (`context.ts`, `constraints.ts`, `entropy.ts`) returns `GeneratedFile[]`. The orchestrator in `generate.ts` collects them, writes to disk, and updates the manifest. Templates are in `templates/<pillar>/` and use Handlebars syntax.

## CI

GitHub Actions workflow at `.github/workflows/release.yml` runs on pushes to `main`: install, build, test, then semantic-release.
