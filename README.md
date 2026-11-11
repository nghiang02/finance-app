# Finance App

Personal finance manager (income/expense tracking, wallets, categories, monthly budgets, reports)
with one NestJS backend and two clients (Expo mobile, Next.js web) sharing code through a
pnpm + Turborepo monorepo.

## Structure

```
finance-app/
├── apps/                      # backend (NestJS), web (Next.js), mobile (Expo) – coming next
├── packages/
│   ├── shared/                # @finance/shared – Zod schemas, types, money/date helpers
│   ├── typescript-config/     # @finance/typescript-config – shared strict tsconfig presets
│   └── eslint-config/         # @finance/eslint-config – shared ESLint flat config
├── docs/                      # PROJECT_CONTEXT, ARCHITECTURE, ROADMAP
├── CLAUDE.md
├── turbo.json
└── pnpm-workspace.yaml
```

## Requirements

- Node.js >= 22 (see `.nvmrc`)
- pnpm (`npm install -g pnpm`)

## Scripts

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm build`     | Build every package/app (dependencies first) |
| `pnpm dev`       | Run all apps in watch mode                   |
| `pnpm lint`      | ESLint (type-aware)                          |
| `pnpm typecheck` | `tsc --noEmit` everywhere                    |
| `pnpm test`      | Unit tests (Vitest)                          |
| `pnpm format`    | Prettier write                               |

Run `pnpm lint && pnpm typecheck && pnpm test` before every commit.
