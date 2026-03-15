# The Three Pillars

Harness engineering structures AI agent governance into three concerns that each address a different failure mode.

---

## Context pillar

**What it generates:**
- `CLAUDE.md` — root-level instruction file read by Claude and Cursor agents. Contains the project overview, golden principles, dependency layer model, and known agent pitfalls.
- `AGENTS.md` per app and per package — scope-specific context that tells an agent the role of this module, its internal structure, approved patterns, and forbidden actions.
- `.claude/skills/` — reusable skill scripts that agents invoke for recurring tasks (e.g. `pre-pr`, `new-package`, `scaffold-component`).
- `docs/adr/` — Architecture Decision Record directory with an index so agents can understand why past decisions were made.

**When to use:**
Enable the context pillar whenever you are using an AI coding assistant. Without accurate context, agents hallucinate package names, violate import boundaries, and repeat patterns the team has already rejected.

The pillar does not just write files once — `generate` is idempotent and regenerates managed files when config changes, while preserving files you have marked as user-owned.

---

## Constraints pillar

**What it generates:**
- `import-boundaries.test.ts` — a Vitest suite that statically analyzes imports across the monorepo and fails if any app or package violates the approved cross-app import list or the client-only package rules.
- `golden-principles.test.ts` — one test per golden principle, verifying the codebase property named in the `check` field (e.g. `no-console-log`, `type-check-script`).
- `hooks.test.ts` — checks that `.husky/pre-commit` and `.husky/commit-msg` exist and reference the expected tools.
- `scripts.test.ts` — asserts that every app and package in `package.json` has the required scripts (e.g. `type-check`).

**How it works:**
All constraint tests live under `.harness/constraints/` and run with `pnpm vitest run`. They are designed to be added to CI as a blocking gate — they produce plain pass/fail output with actionable error messages.

The structural tests enforce golden principles at the file level, complementing linters that work at the expression level. A linter catches `console.log`; a constraint test catches a missing `type-check` script in a newly added package.

---

## Entropy pillar

**What it generates:**
- `.harness/evals/` — directory for YAML task card files, each describing a prompt, expected output, and scoring rubric.
- `.harness/scan.ts` — a drift scanner that checks whether `AGENTS.md` files are stale relative to source changes, whether new packages have been added without context files, and whether import violations have accumulated since the last run.
- `.github/workflows/harness-eval.yml` — a GitHub Actions workflow that runs on a cron schedule (default: weekly), executes the eval suite, and optionally uploads results to S3.

**What it measures:**
Entropy is the tendency of a codebase — and agent behavior — to drift away from the intended architecture over time. The eval framework gives you a quantitative signal: did the agent's pass rate on task cards go up or down this week?

The scanner provides a faster feedback loop: it runs in CI on every PR and emits warnings when context files fall behind the code they describe.

**When to invest in this pillar:**
Once agents are writing code regularly, you will want to know whether they are improving or regressing. The entropy pillar is optional at project start but becomes valuable as soon as you have more than a handful of agent-generated PRs per week.
