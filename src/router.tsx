import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import { OwnerPasswordReset, ownerPasswordResetPath } from "./pages/login/owner-password-reset";
import { AcceptInvite } from "./pages/login/accept-invite";
import OwnerApp from "./pages/owner-app";
import Registrations from "./pages/registrations";
import Owners from "./pages/owners";
import ImpoundedDogs from "./pages/impounded";
import Adoptions from "./pages/adoptions";
import PetId from "./pages/pet-id";
import Reports from "./pages/report-center";
import UsersRoles from "./pages/users";
import ActivityLogs from "./pages/activity-logs";
import Settings from "./pages/settings";
import PersonnelApp from "./pages/personnel";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./integrations/supabase/auth";

export const routers = [
  {
    path: "/",
    name: "dashboard",
    element: <RequireAuth role="admin"><Dashboard /></RequireAuth>,
  },
  {
    path: "/login",
    name: "login",
    element: <Login />,
  },
  {
    path: "/login/admin",
    name: "login-admin",
    element: <Login />,
  },
  {
    path: "/login/accept-invite",
    name: "accept-invite",
    element: <AcceptInvite />,
  },
  {
    path: "/login/owner",
    name: "login-owner",
    element: <Login />,
  },
  {
    path: ownerPasswordResetPath,
    name: "owner-password-reset",
    element: <OwnerPasswordReset />,
  },
  {
    path: "/login/personnel",
    name: "login-personnel",
    element: <Login />,
  },
  {
    path: "/registrations",
    name: "pet-registrations",
    element: <RequireAuth role="admin"><Registrations /></RequireAuth>,
  },
  {
    path: "/owners",
    name: "owners",
    element: <RequireAuth role="admin"><Owners /></RequireAuth>,
  },
  {
    path: "/impounded-dogs",
    name: "impounded-dogs",
    element: <RequireAuth role="admin"><ImpoundedDogs /></RequireAuth>,
  },
  {
    path: "/adoptions",
    name: "adoptions",
    element: <RequireAuth role="admin"><Adoptions /></RequireAuth>,
  },
  {
    path: "/pet-id",
    name: "pet-id",
    element: <RequireAuth role="admin"><PetId /></RequireAuth>,
  },
  {
    path: "/reports",
    name: "reports",
    element: <RequireAuth role="admin"><Reports /></RequireAuth>,
  },
  {
    path: "/users",
    name: "users-roles",
    element: <RequireAuth role="admin"><UsersRoles /></RequireAuth>,
  },
  {
    path: "/activity-logs",
    name: "activity-logs",
    element: <RequireAuth role="admin"><ActivityLogs /></RequireAuth>,
  },
  {
    path: "/settings",
    name: "settings",
    element: <RequireAuth role="admin"><Settings /></RequireAuth>,
  },
  {
    path: "/personnel",
    name: "personnel-app",
    element: <RequireAuth role="personnel"><PersonnelApp /></RequireAuth>,
  },
  {
    path: "/app",
    name: "owner-app",
    element: <RequireAuth role="owner"><OwnerApp /></RequireAuth>,
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
