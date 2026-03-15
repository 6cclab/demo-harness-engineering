# demo-harness-engineering

**Harness engineering** is a discipline for making AI coding agents productive and safe inside real TypeScript monorepos. It has three pillars: **Context** (what the agent should know), **Constraints** (what the agent must never do), and **Entropy** (how you measure whether the agent is drifting).

This package scaffolds all three from a single `harness.config.ts` file.

## Quickstart

```bash
npx demo-harness-engineering init
```

The wizard scans your repo, infers apps and packages, and writes `harness.config.ts`. Then run:

```bash
npx demo-harness-engineering generate
```

## The Three Pillars

| Pillar | What it does |
|---|---|
| **Context** | Generates `CLAUDE.md`, `AGENTS.md` files, skill scripts, and ADR stubs so agents always have accurate, up-to-date project context. |
| **Constraints** | Emits structural test suites (import boundaries, golden principles, hook config, linter checks) that fail CI before bad patterns reach review. |
| **Entropy** | Produces an eval framework with YAML task cards, a pattern scanner for drift detection, and a GitHub Actions workflow to track agent quality over time. |

## Scaffold types

| Command | What it creates |
|---|---|
| `scaffold skill <name>` | A new `.claude/skills/<name>.md` skill file |
| `scaffold principle <id>` | A golden principle entry in `harness.config.ts` |
| `scaffold task <name>` | An eval task card YAML under `.harness/evals/` |
| `scaffold rule` | A `CLAUDE.md` rule block |
| `scaffold agents-md <path>` | `AGENTS.md` for a specific app or package |
| `scaffold agents-md-root` | Root-level `AGENTS.md` from config |
| `scaffold adr <name>` | An Architecture Decision Record under `docs/adr/` |

## Docs

- [Getting started](docs/getting-started.md)
- [Configuration reference](docs/configuration.md)
- [Pillars deep-dive](docs/pillars.md)
- [Writing task cards](docs/writing-task-cards.md)
- [VoltTrack real-world example](examples/volttrack/README.md)

## License

MIT
