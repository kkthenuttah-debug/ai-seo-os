import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary" />
          <h1 className="text-xl font-semibold">SEO Autopilot</h1>
          <p className="text-sm text-muted-foreground">Sign in to your automation workspace.</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
