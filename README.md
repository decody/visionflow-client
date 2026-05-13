# VisionFlow

VisionFlow is a pnpm monorepo with a Next.js web app plus shared TypeScript utilities.

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
  app/      Next.js app router routes
  src/      Web app source
packages/
  shared/   Shared API, query, and domain helpers
```

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm format
pnpm build
```

Copy `.env.example` values into your environment and set the Sentry DSNs when the projects are connected.

## Vercel deployments

Deploy the web app as one Vercel project from this Git repository:

- `visionflow-web`
  - Root Directory: `apps`
  - Framework Preset: Next.js
  - Build Command: `pnpm build`
  - Output Directory: `.next`

Assign the public domain to this project.

If Vercel reports `No Next.js version detected`, open the project's Settings >
General and set Root Directory to `apps`. The root package is the workspace
package and does not depend on Next.js directly; the Next.js package lives in
`apps/package.json`.

If Vercel reports `No Output Directory named "public" found`, open the project's
Settings > Build and Deployment and clear the stale `public` Output Directory
value. The project should use `.next`.

The root `vercel.json` is a fallback for a mistakenly root-scoped Vercel project
and deploys the web app from `apps`. For the intended setup, still set the
Vercel project's Root Directory to `apps`.
