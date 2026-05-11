# VisionFlow

VisionFlow is a pnpm monorepo with Next.js web and admin apps, plus shared TypeScript utilities.

## Stack

- pnpm workspace monorepo
- React, Next.js, TypeScript
- Zustand, Axios, TanStack React Query, React Query Devtools
- Ant Design, AG Grid Community, CSS Modules
- React Three Fiber, Recharts
- Sentry
- Prettier with import organization on save

## Structure

```txt
apps/
  web/      Next.js app router application
  admin/    Next.js administration console
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

## Vercel deployments

Deploy this monorepo as two separate Vercel projects from the same Git repository:

- `visionflow-web`
  - Root Directory: `apps/web`
  - Framework Preset: Next.js
  - Build Command: `pnpm build`
  - Output Directory: `.next`
- `visionflow-admin`
  - Root Directory: `apps/admin`
  - Framework Preset: Next.js
  - Build Command: `pnpm build`
  - Output Directory: `.next`

Assign the public domain to the web project and an admin subdomain, such as `admin.visionflow.com`, to the admin project.

If Vercel reports `No Output Directory named "public" found`, open the failing
project's Settings > Build and Deployment and clear the stale `public` Output
Directory value. Both the web and admin projects should use `.next`.

If Vercel reports `apps/web/.next` under a path like
`/vercel/path0/apps/admin/apps/web/.next`, the admin project is using the web
project's output directory. Open the admin project's Settings > Build and
Deployment and set Output Directory to `.next`.

The root `vercel.json` is a fallback for a mistakenly root-scoped Vercel project
and deploys the web app from `apps/web`. For the intended two-project setup,
still set each Vercel project's Root Directory to `apps/web` or `apps/admin`.
