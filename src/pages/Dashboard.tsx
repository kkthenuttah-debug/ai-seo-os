import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { RecentActivity } from "@/components/RecentActivity";
import { ProjectCard } from "@/components/ProjectCard";
import { Calendar, TrendingUp, Minus, Plus, Settings, BookOpen, Play } from "lucide-react";
import { projectsService } from "@/services/projects";
import type { Project } from "@/types/models";
import { formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/useNotification";

const emptyActivities: Array<{ id: string; type: string; message: string; time: string; timestamp: number }> = [];

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showError } = useNotification();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    projectsService
      .list({ limit: 10 })
      .then((res) => {
        if (!cancelled) setProjects(res.projects);
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : "Failed to load projects");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [showError]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const recentProjects = projects.slice(0, 6);
  const stats = [
    { label: "Total Projects", value: projects.length, trend: "neutral" as const, change: "", helper: "" },
    { label: "Pages Published", value: "—", trend: "neutral" as const, change: "", helper: "From project overviews" },
    { label: "Leads Captured", value: "—", trend: "neutral" as const, change: "", helper: "From project overviews" },
    { label: "Keywords Ranking", value: "—", trend: "neutral" as const, change: "", helper: "From project overviews" },
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back!</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatTime(currentTime)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {projects.length === 0
              ? "Create your first project to start SEO automation."
              : "Your projects and automations are listed below."}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/app/projects">
            <Plus className="h-4 w-4" />
            View projects
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                {getTrendIcon(stat.trend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              {stat.helper && <p className="text-xs text-muted-foreground mt-1">{stat.helper}</p>}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent projects</h3>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/projects">View all</Link>
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          ) : recentProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  updatedAt={project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }) : "—"}
                />
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity activities={emptyActivities} />
            {emptyActivities.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-muted/30 p-6">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">Common tasks to get you started quickly.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/app/projects">
              <Plus className="h-4 w-4" />
              View all projects
            </Link>
          </Button>
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Setup wizard
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/app/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </section>

      {!loading && projects.length === 0 && (
        <section className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Get Started with Your First Project</h3>
            <p className="text-muted-foreground mb-6">
              Set up your AI-powered SEO automation in a few steps.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <h4 className="font-medium">Add a project</h4>
                  <p className="text-sm text-muted-foreground">Create a project and add your domain.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <h4 className="font-medium">Connect WordPress</h4>
                  <p className="text-sm text-muted-foreground">Link your site for automated publishing.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <h4 className="font-medium">Connect Google Search Console</h4>
                  <p className="text-sm text-muted-foreground">Enable rankings and traffic tracking.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">4</div>
                <div>
                  <h4 className="font-medium">Run agents</h4>
                  <p className="text-sm text-muted-foreground">Use AI agents for research, content, and optimization.</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/app/projects">
                  <Play className="h-4 w-4" />
                  Go to projects
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
