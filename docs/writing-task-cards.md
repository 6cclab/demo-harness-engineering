# Writing Task Cards

Task cards are YAML files that define a prompt, the expected agent behavior, and a scoring rubric. They live under `.harness/evals/` and are run by the entropy CI workflow.

Scaffold a new card:

```bash
npx demo-harness-engineering scaffold task <name>
```

---

## YAML format

```yaml
id: "add-route-001"
name: "Add a new API route"
pillar: constraints
difficulty: medium

prompt: |
  Add a POST /vehicles/:id/ping route to apps/api.
  It should accept { timestamp: string } and return { ok: true }.
  Use createRoute() and register it in the vehicles router.

expectedBehavior:
  - Creates the route using createRoute()
  - Adds input validation with zod
  - Does not use console.log
  - Regenerates the SDK after adding the route

checks:
  - type: no-console-log
    target: "apps/api/src/routes/vehicles.ts"
  - type: import-boundary
    target: "apps/api/src"
  - type: type-check-script
    package: "api"

scoring:
  correctness: 0.5
  constraints: 0.3
  style: 0.2
```

---

## Available check types

| Check type | What it verifies |
|---|---|
| `no-console-log` | No `console.log` calls in the target file or directory. |
| `import-boundary` | No cross-app imports that violate the approved list. |
| `type-check-script` | The named package has a `type-check` script and it passes. |
| `file-exists` | A specific file was created or modified. |
| `pattern-absent` | A regex pattern does not appear in the target file. |
| `pattern-present` | A regex pattern appears in the target file. |

---

## Scoring dimensions

| Dimension | Weight guidance | Description |
|---|---|---|
| `correctness` | 0.4–0.6 | Did the agent produce code that satisfies the functional requirement? |
| `constraints` | 0.2–0.4 | Did the agent respect all golden principles and import boundaries? |
| `style` | 0.1–0.2 | Does the output follow project conventions (naming, file placement, patterns)? |

Weights must sum to 1.0. The CI runner reports a weighted score per card and an aggregate pass rate across all cards.

---

## Example task card (full)

```yaml
id: "new-package-001"
name: "Scaffold a new shared package"
pillar: context
difficulty: easy

prompt: |
  Create a new shared package called @volttrack/notifications.
  It should export a sendEmail() function stub.
  Follow the new-package skill in .claude/skills/new-package.md.

expectedBehavior:
  - Creates packages/notifications/ with package.json, tsconfig.json, and src/index.ts
  - Adds a type-check script to package.json
  - Does not import from any app package

checks:
  - type: file-exists
    path: "packages/notifications/src/index.ts"
  - type: type-check-script
    package: "notifications"
  - type: import-boundary
    target: "packages/notifications/src"

scoring:
  correctness: 0.5
  constraints: 0.3
  style: 0.2
```

---

## Tips for writing good prompts

**Be specific about the desired output.** Agents perform better when the prompt names the exact file, function, and pattern to use rather than describing intent abstractly.

**Mirror real tasks.** Base task cards on actual PRs the team has reviewed. If an agent failed a review for a specific reason, write a card that targets that exact failure mode.

**Keep cards focused.** One task card should test one capability. A card that asks the agent to add a route, write a test, and update the SDK is measuring three things at once and produces noisy results.

**Version your cards.** Use a numeric suffix in the `id` field (`add-route-001`, `add-route-002`) so you can iterate on a card without losing historical scores.

**Set realistic difficulty.** Easy cards should have a single clear correct answer. Hard cards should involve trade-offs or require the agent to consult multiple context files. Mixing difficulties gives you a useful spread in the aggregate score.
