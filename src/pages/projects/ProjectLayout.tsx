import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { projectsService } from "@/services/projects";
import { useNotification } from "@/hooks/useNotification";

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
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const { showError, notifySuccess } = useNotification();

  useEffect(() => {
    if (!projectId) return;
    projectsService
      .get(projectId)
      .then((p) => setProjectName(p.name))
      .catch(() => setProjectName(null));
  }, [projectId]);

  const handleRunAgent = async () => {
    if (!projectId) return;
    setRunLoading(true);
    try {
      await projectsService.startLoop(projectId);
      notifySuccess("Agent loop started. Check the Agents tab for progress.");
      navigate(`/app/projects/${projectId}/agents`, { replace: false });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start agents");
    } finally {
      setRunLoading(false);
    }
  };

  const handlePauseLoop = async () => {
    if (!projectId) return;
    setPauseLoading(true);
    try {
      await projectsService.pause(projectId);
      notifySuccess("Loop paused.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to pause");
    } finally {
      setPauseLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Project</p>
            <h2 className="text-2xl font-semibold">{projectName ?? projectId ?? "Project"}</h2>
            <p className="text-sm text-muted-foreground">Automation is currently active.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePauseLoop} disabled={pauseLoading}>
              {pauseLoading ? "Pausing…" : "Pause loop"}
            </Button>
            <Button size="sm" onClick={handleRunAgent} disabled={runLoading}>
              {runLoading ? "Starting…" : "Run agent"}
            </Button>
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
