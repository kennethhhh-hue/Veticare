# Code Guideline

## Project Structure Overview

```
project-root/
  ├── public/                # Static assets
  ├── src/
  │   ├── components/        # All reusable UI components
  │   │   └── ui/            # Prebuilt and custom UI components, grouped by function
  │   ├── hooks/             # Custom React hooks
  │   ├── lib/               # Utility functions and libraries
  │   ├── pages/             # Application pages (each page in its own subdirectory)
  │   ├── App.tsx            # Main app component, sets up route providers
  │   ├── router.tsx         # Router config, sets up routing
  │   ├── main.tsx           # Entry point for the React app
  │   └── index.css          # Global styles
  ├── package.json           # Project metadata and scripts
  ├── tailwind.config.ts     # Tailwind CSS configuration
  └── ...                    # Other config and lock files
```

## Directory Responsibilities

- **public/**: Static files served directly. Place images, icons, and robots.txt here.
- **src/components/**: All UI components.  
  - **ui/**: Contains atomic and composite UI components.  
  - **error-boundary/**: The shared error fallback (`error-fallback.tsx`) and the route-level `errorElement` (`route-error-boundary.tsx`).  
  - *Group related components into subdirectories if they share a domain or feature (e.g., `form/`, `charts/`).*
- **src/hooks/**: Custom React hooks. Each file should export a single hook focused on one responsibility.
- **src/lib/**: Utility functions and libraries that are not React components or hooks.
- **src/pages/**: All route-level pages.  
  - *Each page should have its own subdirectory if it contains more than a single file or has related logic/components.*
- **src/App.tsx**: Sets up global providers.
- **src/router.tsx**: Sets up routing.
- **src/main.tsx**: Application entry point. Wraps the app in the top-level error boundary and reports caught errors through `src/lib/report-caught-error.ts`.
- **src/setup.ts**: Side-effect imports that must run before the app renders (for example the i18n runtime injected by the `enter_i18n` skill). `src/main.tsx` is platform-managed: add such imports here instead.

**Important:**
Whenever a new module (such as a component, hook, or utility) or a new page is added or removed, this document **must be updated immediately** to reflect the changes. Keeping this documentation up to date ensures that all collaborators have a clear understanding of the current project structure and its intended organization.

## Veticare Modules

- **src/pages/dashboard/**: Admin dashboard route (`/`). Composes the KPI row, activity chart, verification queue, quick actions, activity feed and summary cards inside `AppShell`.
- **src/pages/login/**: Role chooser (`/login`) plus role-specific sign-in screens: `admin-login.tsx` (`/login/admin`, centered console form) and `mobile-login.tsx` (`/login/owner`, `/login/personnel`, phone-framed mobile sign-in). Personnel sign-in continues to `/personnel`; owners continue to `/app`. Real authentication is not connected yet.
- **src/components/veticare/**: App-level chrome — `app-shell.tsx` (sidebar, mobile sheet, topbar, notifications, profile menu) and `brand.tsx` (Veticare mark).
- **src/components/dashboard/**: Dashboard sections — `stat-card.tsx`, `activity-chart.tsx`, `verification-queue.tsx`, `quick-actions.tsx`, `activity-feed.tsx`, `summary-cards.tsx`.
- **src/pages/registrations/**: Pet Registration route (`/registrations`). Search, species/status/microchip filters, draft view, approve/reject actions and pagination over the sample registry.
- **src/pages/owners/**: Owner Directory route (`/owners`). Search, barangay/status filters, follow-up filters, owner detail sheet and pagination.
- **src/pages/impounded/**: Impounded Dogs route (`/impounded-dogs`). Shelter intake list with kennel/foster/reserved status moves, stay tracking and a record sheet.
- **src/pages/adoptions/**: Adoptions route (`/adoptions`). Application queue with home-visit state, approve/reject decisions and a detail sheet.
- **src/pages/pet-id/**: Pet ID route (`/pet-id`). Issued-ID registry with status filters, copy-to-clipboard and a digital ID preview sheet.
- **src/data/shelter-records.ts**: Sample impounded dogs, adoption applications and pet ID records.
- **src/components/veticare/id-pattern.tsx**: Shared sample ID code pattern used by the owner app card and the admin ID preview.
- **src/pages/personnel/**: City Pound Personnel mobile app (`/personnel`, tabs via `?tab=`). Dashboard, QR scanner with sample registry lookups, annual verification, scan history and profile; `pet-record.tsx` renders the shared pet/owner verification card.
- **src/data/personnel.ts**: Sample field personnel profile, registry pets with registration/vaccination states, shift scans and helpers.
- **src/pages/report-center/**: Reports route (`/reports`). Metrics, a report studio (category/period/format) and the generated-report library with search and filters.
- **src/pages/users/**: Users & Roles route (`/users`). Team directory with role/status filters, invite dialog, role editor sheet and removal confirmation.
- **src/pages/activity-logs/**: Activity Logs route (`/activity-logs`). Audit trail with module/status filters, search and export control.
- **src/pages/settings/**: System Settings route (`/settings`). Night mode, security, notifications, retention, timezone, business hours and audit logging.
- **src/data/admin-config.ts**: Sample team members, generated reports and audit log entries.
- **src/hooks/use-theme.ts** / **src/setup.ts**: Theme preference handling; `setup.ts` applies the stored theme before render.
- **src/components/admin/**: Shared admin list pieces — `page-header.tsx`, `metric-strip.tsx`, `filter-select.tsx`, `status-pill.tsx`, `pagination.tsx`.
- **src/data/admin-records.ts**: Sample registration and owner records used by both registry pages.
- **src/data/veticare.ts**: Sample dashboard dataset and navigation sections for the admin console.
- **src/pages/owner-app/**: Pet owner mobile app route (`/app`, tabs via `?tab=`). Screens for home, pets, pet detail, digital pet ID, adoption browsing and profile, mounted inside a phone frame on desktop.
- **src/components/owner-app/**: Owner app pieces — `pet-photo.tsx` (photo with placeholder fallback) and `pet-id-card.tsx` (digital ID card with sample code pattern).
- **src/data/owner-app.ts**: Sample owner, pets, vaccination records, adoptable pets and events for the mobile app.

## How to Add New Code

### 1. Adding a New Page

- **Create a subdirectory under `src/pages/` for each new page.**
  - Example: For a "Dashboard" page, create `src/pages/dashboard/`.
- **Place the main page component as `index.tsx` inside the subdirectory.**
- **Add any page-specific components or logic in the same subdirectory.**
- **Register the new route in `src/router.tsx and generate a semantic name.**
  - Example:
    ```tsx
    import Dashboard from "./pages/dashboard";
    // ...
    {
      path: "/dashboard",
      name: 'dashboard',
      element: <Dashboard />
    }
    ```

### 2. Adding a New Component

- **If you are adding a group of related components, create a subdirectory (e.g., `form/`, `charts/`).**
- **If the component is only used by a specific page, place it in that page's subdirectory under `src/pages/`.**
- **Each component should be focused on a single responsibility.**
- **Small files (< 100 lines) are encouraged for a single component.**

### 3. Adding a New Hook

- **Create a new file in `src/hooks/` named after the hook (e.g., `use-feature.ts`).**
- **Each file should export only one hook.**
- **Hooks should be as small and focused as possible.**

### 4. Adding Utilities

- **Add utility functions to `src/lib/`.**
- **Group related utilities in the same file or subdirectory if needed.**

### 5. Adding Multi-language Support

- **This template has no i18n by default.** Do not install i18next or hand-write locale files, `i18n.config.json`, or `src/i18n/`.
- **Call the `i18n_enable` tool** when the user needs more than one language. After approval, the built-in `enter_i18n` skill injects the i18n runtime and owns all later language work.

### 6. Updating Page Metadata (SEO & Social Sharing)

- **Site-level metadata lives in the `<head>` of `index.html`.** The `og:*` and `twitter:*` tags ship with Enter platform defaults and are what link previews (WhatsApp, X, Slack, etc.) display.
- **Whenever you change `<title>` or `<meta name="description">`, update `og:title` / `og:description` / `og:image:alt` and `twitter:title` / `twitter:description` to match.**
- **`og:image` / `twitter:image` must be absolute URLs**, because link-preview crawlers do not resolve relative paths. The default points to the Enter share image (1200×630); when the project has its own preview image, replace both with its absolute URL and keep `og:image:width` / `og:image:height` accurate.

## Coding Best Practices

- **One module, one responsibility:**  
  Each file (component, hook, utility) should do one thing only.
- **High cohesion, low coupling:**  
  Keep related logic together and avoid unnecessary dependencies between modules.
- **Naming conventions:**  
  - Use `PascalCase` for components and page directories.
  - Use `camelCase` for hooks and utility functions.
  - Name page subdirectories and files after their route or feature.
- **Component structure:**  
  - Keep components small and focused.
  - Extract subcomponents if a component grows too large.
- **Page structure:**  
  - Place all logic, hooks, and components specific to a page in its subdirectory.
  - Only share code via `components/`, `hooks/`, or `lib/` if it is truly reusable.
- **Documentation:**  
  - Add comments for complex logic.
  - Document the purpose of each module at the top of the file if not obvious.
- **Error boundaries:**  
  - Do not remove them: `src/main.tsx` wraps the app in one, and the pathless root route in `src/App.tsx` gives every page the shared `errorElement`, so a crashing page shows a fallback instead of a blank screen. Keep new routes in `src/router.tsx`; they become children of that root route.
  - Keep the `ErrorBoundary caught a runtime error:` log prefix in `src/lib/report-caught-error.ts`; the Enter preview uses it to recognize caught errors as runtime errors.
  - To let one section fail on its own, wrap it in `ErrorBoundary` from `react-error-boundary` with `FallbackComponent={ErrorFallback}` or a smaller fallback.

## Example: Adding a New "Profile" Page

1. **Create a directory:**  
   `src/pages/profile/`
2. **Add the main page component:**  
   `src/pages/profile/index.tsx`
3. **Add page-specific components:**  
   `src/pages/profile/ProfileHeader.tsx`, `src/pages/profile/ProfileDetails.tsx`
4. **Register the route in `App.tsx`:**
   ```tsx
   import Profile from "./pages/profile";
   // ...
   <Route path="/profile" element={<Profile />} />
   ```
5. **If you need a reusable button, add it to `src/components/ui/button.tsx`.**
