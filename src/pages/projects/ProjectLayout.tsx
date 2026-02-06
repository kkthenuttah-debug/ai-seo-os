import { NavLink, Outlet, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", to: "overview" },
  { label: "Pages", to: "pages" },
  { label: "Agents", to: "agents" },
  { label: "Rankings", to: "rankings" },
  { label: "Leads", to: "leads" },
  { label: "Integrations", to: "integrations" },
  { label: "Settings", to: "settings" },
];

export default function ProjectLayout() {
  const { projectId } = useParams();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Project</p>
            <h2 className="text-2xl font-semibold">{projectId}</h2>
            <p className="text-sm text-muted-foreground">Automation is currently active.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-2 text-sm">Pause loop</button>
            <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
              Run agent
            </button>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={`/app/projects/${projectId}/${tab.to}`}
              className={({ isActive }) =>
                cn(
                  "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "bg-muted text-foreground"
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
