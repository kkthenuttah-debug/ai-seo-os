import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { projectsService } from "@/services/projects";
import type { Project } from "@/types/models";
import { formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/useNotification";
import { Plus } from "lucide-react";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDomain, setCreateDomain] = useState("");
  const [createNiche, setCreateNiche] = useState("");
  const [createTargetAudience, setCreateTargetAudience] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const { showError } = useNotification();
  const limit = 12;

  const fetchProjects = () => {
    setLoading(true);
    projectsService
      .list({ page, limit })
      .then((res) => {
        setProjects(res.projects);
        setTotal(res.total);
      })
      .catch((err) => showError(err instanceof Error ? err.message : "Failed to load projects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    projectsService
      .list({ page, limit })
      .then((res) => {
        if (!cancelled) {
          setProjects(res.projects);
          setTotal(res.total);
        }
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : "Failed to load projects");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, showError]);

  const handleCreateProject = async () => {
    const name = createName.trim();
    const domain = createDomain.trim();
    if (!name || !domain) {
      showError("Name and domain are required.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const settings: Record<string, string> = {};
      if (createNiche.trim()) settings.niche = createNiche.trim();
      if (createTargetAudience.trim()) settings.target_audience = createTargetAudience.trim();
      const project = await projectsService.create({
        name,
        domain,
        ...(Object.keys(settings).length ? { settings } : {}),
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateDomain("");
      setCreateNiche("");
      setCreateTargetAudience("");
      fetchProjects();
      navigate(`/app/projects/${project.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const filtered = search
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.domain.toLowerCase().includes(search.toLowerCase())
      )
    : projects;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Track every automated SEO workspace.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>Add a new SEO project. You can change name and domain later.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">Project name</Label>
                <Input
                  id="create-name"
                  placeholder="My Website"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-domain">Domain</Label>
                <Input
                  id="create-domain"
                  placeholder="example.com"
                  value={createDomain}
                  onChange={(e) => setCreateDomain(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-niche">Niche (optional)</Label>
                <Input
                  id="create-niche"
                  placeholder="e.g. B2B SaaS, fitness, local plumbing"
                  value={createNiche}
                  onChange={(e) => setCreateNiche(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-target-audience">Target audience (optional)</Label>
                <Input
                  id="create-target-audience"
                  placeholder="e.g. small business owners, developers"
                  value={createTargetAudience}
                  onChange={(e) => setCreateTargetAudience(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search projects"
          className="md:max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "No projects match your search." : "No projects yet. Create one to get started."}
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                {...project}
                updatedAt={
                  project.updatedAt
                    ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })
                    : "—"
                }
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {total === 0 ? 0 : start}-{end} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
