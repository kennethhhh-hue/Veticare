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

### Owner notification emails

Personnel's **Report Impound** and **For Registration** actions queue emails for the pet's owner. The registration notice requires an expired registration. The owner must have an active account and a confirmed email address in Supabase Auth.

1. Apply the owner notification email migrations and deploy `owner-notification-email` with `verify_jwt` disabled as set in `supabase/config.toml`. The function checks its dedicated worker key.
2. Sign in to Google Cloud with the Gmail account that will send the notices. For a single sender, use [Personal mode onboarding](https://console.cloud.google.com/auth/overview/personal) to create a **Web application** OAuth client with `https://developers.google.com/oauthplayground` as its authorized redirect URI. Save the Client ID and Client Secret, then [enable Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) for that project. For an External app in Testing, Google expires the Gmail refresh token after seven days. [Google Auth setup](https://support.google.com/cloud/answer/15544987)
3. In [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/), open the gear menu, set **Access type** to **Offline**, turn on **Use your own OAuth credentials**, and enter the Client ID and Client Secret. In Step 1, enter `https://www.googleapis.com/auth/gmail.send` and click **Authorize APIs**. Use the same Gmail account that created the Personal mode project. In Step 2, click **Exchange authorization code for tokens** and copy the **Refresh token**.
4. Save these values under **Supabase → Edge Functions → Secrets**.

   | Name | Value |
   | --- | --- |
   | `GMAIL_CLIENT_ID` | Google OAuth Client ID |
   | `GMAIL_CLIENT_SECRET` | Google OAuth Client Secret |
   | `GMAIL_REFRESH_TOKEN` | Refresh token from OAuth 2.0 Playground |
   | `OWNER_NOTIFICATION_FROM` | The Gmail address you authorized in Step 3 |
   | `OWNER_NOTIFICATION_WORKER_KEY` | The existing worker key, or a new value generated with `node -p "require('node:crypto').randomBytes(32).toString('hex')"` |

5. Under **Supabase → Vault**, set `owner_notification_project_url` to the Supabase project URL and `owner_notification_worker_key` to the same worker key. Add the Vault worker key last to start delivery. The scheduled job checks the queue every minute.
