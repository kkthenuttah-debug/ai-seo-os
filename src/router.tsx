import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { RouteError } from "@/components/RouteError";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner label="Loading" />
    </div>
  );
}

function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <AppLayout />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/pages/Landing")).default,
        }),
      },
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/auth/login" replace />,
          },
          {
            path: "login",
            lazy: async () => ({
              Component: (await import("@/pages/auth/Login")).default,
            }),
          },
          {
            path: "signup",
            lazy: async () => ({
              Component: (await import("@/pages/auth/Signup")).default,
            }),
          },
          {
            path: "forgot-password",
            lazy: async () => ({
              Component: (await import("@/pages/auth/ForgotPassword")).default,
            }),
          },
        ],
      },
      {
        path: "app",
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/app/dashboard" replace />,
          },
          {
            path: "dashboard",
            lazy: async () => ({
              Component: (await import("@/pages/Dashboard")).default,
            }),
          },
          {
            path: "projects",
            lazy: async () => ({
              Component: (await import("@/pages/Projects")).default,
            }),
          },
          {
            path: "projects/:projectId",
            lazy: async () => ({
              Component: (await import("@/pages/projects/ProjectLayout"))
                .default,
            }),
            children: [
              {
                index: true,
                element: <Navigate to="overview" replace />,
              },
              {
                path: "overview",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/Overview"))
                    .default,
                }),
              },
              {
                path: "pages",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/Pages")).default,
                }),
              },
              {
                path: "agents",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/AgentsMonitor"))
                    .default,
                }),
              },
              {
                path: "rankings",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/Rankings"))
                    .default,
                }),
              },
              {
                path: "leads",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/Leads")).default,
                }),
              },
              {
                path: "integrations",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/Integrations"))
                    .default,
                }),
              },
              {
                path: "settings",
                lazy: async () => ({
                  Component: (await import("@/pages/projects/Settings"))
                    .default,
                }),
              },
            ],
          },
          {
            path: "settings",
            lazy: async () => ({
              Component: (await import("@/pages/Settings")).default,
            }),
          },
          {
            path: "settings/account",
            lazy: async () => ({
              Component: (await import("@/pages/settings/Account")).default,
            }),
          },
          {
            path: "visual-editor-demo",
            lazy: async () => ({
              Component: (await import("@/pages/VisualEditorDemo")).default,
            }),
          },
        ],
      },
    ],
  },
]);
