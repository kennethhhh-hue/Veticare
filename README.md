# Veticare

Veticare is a veterinary clinic and pet-care management system for Batangas City. It supports pet-owner registration, pet identification, veterinary and shelter workflows, adoptions, and administration.

## Tech Stack

- React, TypeScript, and Vite
- Tailwind CSS and Radix UI
- Supabase Auth, PostgreSQL, Storage, and Row Level Security
- pnpm

## Local Development

Requirements: Node.js and pnpm.

```bash
pnpm install
pnpm dev
```

Create a `.env.local` file with the Supabase project URL and publishable client key:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Do not put a Supabase service-role key in frontend environment variables.

## Build

```bash
pnpm run build:prod
```

The production build is written to `dist/`.

## Deployment

Deploy the Vite frontend to Vercel with `pnpm install --frozen-lockfile` as the install command, `pnpm run build:prod` as the build command, and `dist` as the output directory. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project environment variables, then redeploy.

Database migrations and Supabase Edge Functions are deployed separately from the Vercel frontend.
