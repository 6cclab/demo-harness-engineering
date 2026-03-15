# VoltTrack Example

This is a real-world `harness.config.ts` drawn from VoltTrack — a production EV tracking monorepo with 5 apps and 14 shared packages.

**Stack:** Hono (API + Auth + event-bus + ws-gateway), React Router v7 (client), BullMQ + Redis, TimescaleDB via Prisma, ArgoCD for deployments.

## What this config demonstrates

- **5 apps** across `backend` and `frontend` types, with the React Router client using `srcDir: 'app'` instead of the default `src`.
- **14 packages** covering UI, data access, tracing, caching, GraphQL, and build tooling.
- **Import boundary enforcement** — client-only packages are locked down, and every cross-app import (e.g., `@volttrack/api/sdk` into `client`) is explicitly allow-listed.
- **8 golden principles** mapped to automated checks that run in CI.
- **Entropy pillar** configured with S3 eval storage, a self-hosted GitHub Actions runner (`[6cclab]`), Infisical secrets, and a Wednesday morning schedule.

## Running it locally

```bash
# From the repo root
npx demo-harness-engineering generate
```

This will emit the full context, constraints, and entropy file tree for the VoltTrack workspace.

For a full reference of every config field, see [docs/configuration.md](../../docs/configuration.md).
For step-by-step setup, see [docs/getting-started.md](../../docs/getting-started.md).
