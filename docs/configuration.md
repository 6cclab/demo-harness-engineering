# Configuration Reference

All configuration lives in `harness.config.ts` at your project root. Use the `defineConfig` helper for TypeScript inference:

```typescript
import { defineConfig } from 'demo-harness-engineering';

export default defineConfig({ ... });
```

`defineConfig` is a pass-through — it returns the config unchanged and exists solely for type checking.

---

## `project`

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `"my-project"` | Project name used in generated headings and file content. |
| `scope` | `string` | `""` | NPM scope (e.g. `@volttrack`). Used to prefix package import paths. |
| `monorepo` | `boolean` | `false` | Whether the project is a monorepo. Affects AGENTS.md generation. |
| `packageManager` | `"pnpm" \| "npm" \| "yarn" \| "bun"` | `"npm"` | Package manager used in generated scripts and CI workflow. |

---

## `apps`

An array of app descriptors. Each app gets its own `AGENTS.md`.

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | App name (used in paths and package names). |
| `path` | `string` | required | Path relative to the monorepo root (e.g. `apps/api`). |
| `type` | `"backend" \| "frontend"` | required | Backend apps are checked against server-side constraints; frontend apps can use client-only packages. |
| `srcDir` | `string` | `"src"` | Source directory inside the app (used in import boundary checks). |

---

## `packages`

`string[]` — default `[]`

List of shared package names (without scope). Each package gets an `AGENTS.md` stub. Import boundary rules reference these names to detect violations.

---

## `context`

| Field | Type | Default | Description |
|---|---|---|---|
| `agentsMd` | `boolean` | `true` | Generate `AGENTS.md` for each app and package. |
| `claudeMd` | `boolean` | `true` | Generate root `CLAUDE.md` with project conventions and golden principles. |
| `adr` | `boolean` | `true` | Generate an `docs/adr/` directory with an ADR index. |
| `skills` | `string[]` | `["pre-pr", "new-package"]` | Skill names to scaffold under `.claude/skills/`. |
| `requiredAppSections` | `string[]` | `["## Role", "## Structure", "## Patterns", "## Forbidden"]` | Section headers that every per-app `AGENTS.md` must contain. Used by the doctor check. |
| `requiredRootSections` | `string[]` | `["## Golden Principles"]` | Section headers that the root `CLAUDE.md` must contain. |

---

## `constraints`

### `constraints.importBoundaries`

| Field | Type | Default | Description |
|---|---|---|---|
| `clientOnlyPackages` | `string[]` | `[]` | Packages that may only be imported by frontend apps. Violations fail the import-boundary test. |
| `approvedCrossAppImports` | `Record<string, string[]>` | `{}` | Per-app allow-list of cross-app import paths. Any cross-app import not in this list is a violation. |
| `packageAppExceptions` | `Record<string, string[]>` | `{}` | Per-package exceptions allowing imports from specific app packages (e.g. `core` needing `@scope/auth/schema`). |

### `constraints.goldenPrinciples`

Array of `{ id: string; rule: string; check: string }`. Each principle is embedded in `CLAUDE.md` and cross-referenced in `golden-principles.test.ts`.

Available `check` values: `"import-boundary"`, `"no-console-log"`, `"type-check-script"`.

### `constraints.hooks`

| Field | Type | Default | Description |
|---|---|---|---|
| `preCommit` | `"lint-staged" \| string \| false` | `"lint-staged"` | Expected pre-commit hook. Set to `false` to disable the check. |
| `commitMsg` | `"conventional" \| false` | `"conventional"` | Whether a conventional-commits commit-msg hook is required. |

### `constraints.linter`

`"biome" | "eslint" | "none"` — default `"none"`

Determines which linter config files the scripts test expects to find.

---

## `entropy`

| Field | Type | Default | Description |
|---|---|---|---|
| `eval` | `boolean` | `true` | Generate the eval framework (task card directory + runner). |
| `scanner` | `boolean` | `true` | Generate the drift scanner script. |

### `entropy.storage`

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `"s3" \| "none"` | `"none"` | Where to store eval results. `"s3"` adds S3 upload steps to the CI workflow. |
| `bucket` | `string` | `""` | S3 bucket name (only used when `type` is `"s3"`). |

### `entropy.ci`

| Field | Type | Default | Description |
|---|---|---|---|
| `runner` | `string` | `"ubuntu-latest"` | GitHub Actions runner label (e.g. `"[self-hosted, linux]"` or a custom label). |
| `secrets` | `"infisical" \| "github-secrets" \| "none"` | `"github-secrets"` | How secrets are injected into CI. `"infisical"` adds an Infisical token step. |
| `schedule` | `string` | `"0 10 * * 1"` | Cron schedule for the eval workflow (default: Monday 10:00 UTC). |

---

## Full example

See [examples/volttrack/harness.config.ts](../examples/volttrack/harness.config.ts) for a complete real-world configuration.
