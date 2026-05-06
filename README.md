# VisionFlow

VisionFlow is a pnpm monorepo with a Next.js web app, a Vite admin app, and shared TypeScript utilities.

## Stack

- pnpm workspace monorepo
- React, Next.js, Vite, TypeScript
- Zustand, Axios, TanStack React Query, React Query Devtools
- Ant Design, AG Grid Community, CSS Modules
- React Three Fiber, Recharts
- Sentry
- Prettier with import organization on save

## Structure

```txt
apps/
  web/      Next.js app router application
  admin/    Vite React administration console
packages/
  shared/   Shared API, query, and domain helpers
```

## Commands

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:admin
pnpm lint
pnpm typecheck
pnpm format
pnpm build
```

Copy `.env.example` values into your environment and set the Sentry DSNs when the projects are connected.
