# Getting Started

## Prerequisites

- Node.js 20 or later
- A project with a `package.json` at the root (monorepo or single-app)

## 1. Run the init wizard

```bash
npx demo-harness-engineering init
```

The wizard will ask for your project name, scope, package manager, and which pillars to enable. It scans your workspace to detect apps and packages automatically, then writes `harness.config.ts` at the project root.

## 2. What gets created

After `init` (and after running `generate`), you will have:

**Context pillar**
- `CLAUDE.md` — root-level agent instructions with golden principles and project conventions
- `AGENTS.md` — per-app and per-package agent context files
- `.claude/skills/` — skill scripts (e.g., `pre-pr.md`, `new-package.md`)
- `docs/adr/` — Architecture Decision Record stub directory

**Constraints pillar**
- `.harness/constraints/import-boundaries.test.ts` — enforces cross-app import rules
- `.harness/constraints/golden-principles.test.ts` — checks each golden principle
- `.harness/constraints/hooks.test.ts` — verifies git hook configuration
- `.harness/constraints/scripts.test.ts` — ensures required scripts exist in each package

**Entropy pillar**
- `.harness/evals/` — eval task card directory
- `.harness/scan.ts` — drift scanner that checks AGENTS.md freshness and boundary violations
- `.github/workflows/harness-eval.yml` — CI workflow for weekly eval runs

## 3. Verify the setup

```bash
pnpm harness
# or: npx demo-harness-engineering doctor
```

The `doctor` command checks that all expected files exist and that `harness.config.ts` is valid.

## 4. Create project-specific skills

```bash
npx demo-harness-engineering scaffold skill <name>
```

This creates `.claude/skills/<name>.md` with a template you fill in. Skills are referenced from `CLAUDE.md` and loaded by agents when they match a task.

## 5. Create eval task cards

```bash
npx demo-harness-engineering scaffold task <name>
```

This creates `.harness/evals/<name>.yaml` — a structured prompt + expected-output pair used to measure agent quality over time. See [writing-task-cards.md](writing-task-cards.md) for the full format.
