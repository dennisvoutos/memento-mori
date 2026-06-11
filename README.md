# Memento Mori

Monorepo for the Memento Mori frontend, backend API, and shared TypeScript contracts.

## Workspace

- `frontend/`: React 19 + Vite client app.
- `backend/`: Express 5 + Prisma API with cookie auth, CSRF protection, Google OAuth, and email verification.
- `shared/`: shared Zod schemas and TypeScript types consumed by both apps.

## Local Setup

1. Install dependencies from the repo root:

```bash
npm install
```

2. Create `backend/.env` from `backend/.env.example` and set at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `FRONTEND_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

3. Apply the Prisma migrations from `backend/` so the generated client sees the latest schema:

```bash
cd backend
npx prisma migrate dev
```

4. Start the apps:

```bash
npm run dev
```

Or use Docker for live reload:

```bash
npm run docker:dev
```

## Docker Development (Hot Reload)

Use the development compose override to run both apps with live reload:

```bash
npm run docker:dev
```

After the first build, start again without rebuilding:

```bash
npm run docker:dev:up
```

Stop containers:

```bash
npm run docker:dev:down
```

Endpoints in dev:

- Frontend (Vite HMR): `http://localhost:5174` (or `FRONTEND_DEV_PORT` if set)
- Backend API: `http://localhost:3001`

Notes:

- File changes under `frontend/`, `backend/`, and `shared/` are mounted into containers.
- Polling is enabled for reliable file watching on Windows + Docker.

## Production Cookies

This app uses cookie-based auth plus CSRF validation for unsafe API requests.

- If the frontend and API share the same site, use a same-site API domain such as `https://api.mymementomori.com` with `AUTH_COOKIE_SAME_SITE=lax`.
- If the frontend calls a different-site backend such as `https://*.onrender.com`, set `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true` on the backend or the browser will drop the auth/CSRF cookies on cross-site requests.
- A custom-domain frontend pointing at a raw Render backend URL will otherwise fail login, refresh, and logout flows with CSRF or missing-session errors.

## Email Verification

Password registrations now create an authenticated but unverified session until the user confirms their email address.

- Verification emails are sent through Resend using `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- Verification links are built from `FRONTEND_APP_URL` and point to `/verify-email?token=...` in the frontend app.
- Existing users are backfilled to `emailVerified=true` by the `20260601000000_add_email_verification` migration so the rollout does not lock out current accounts.
- Google sign-ins are treated as verified immediately when Google reports a verified email address.
- Write routes for memorials, memories, life moments, profile updates, and user photo changes now require a verified account.

Optional verification settings in `backend/.env`:

- `EMAIL_VERIFICATION_TTL_HOURS`: how long a verification link stays valid. Default: `24`.
- `UNVERIFIED_ACCOUNT_TTL_DAYS`: how long to keep unverified accounts before cleanup. Default: `7`.
- `UNVERIFIED_ACCOUNT_CLEANUP_CRON`: cron schedule for the cleanup job. Default: `0 2 * * *`.

The cleanup job runs inside the backend process with `node-cron`. On platforms that sleep inactive instances, cleanup is best-effort and only runs while the API process is alive.

## Deployment Order

1. Set the backend email verification environment variables and secrets first.
2. Run the Prisma migration before switching traffic so the new auth fields exist and existing users are backfilled.
3. Deploy the backend.
4. Deploy the frontend once `/verify-email` and `/resend-verification` are available on the API.

The contact form still uses the SMTP settings in `backend/.env`; Resend is only used for verification emails.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
