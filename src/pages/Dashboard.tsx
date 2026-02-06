import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "@/components/ProjectCard";
import { StatsCard } from "@/components/StatsCard";

const projects = [
  {
    id: "project-1",
    name: "Urban Garden Co",
    domain: "urbangarden.co",
    status: "active",
    updatedAt: "2 hours ago",
  },
  {
    id: "project-2",
    name: "Solar Peak",
    domain: "solarpk.com",
    status: "paused",
    updatedAt: "yesterday",
  },
];

const activities = [
  "Market research agent discovered 12 new keyword clusters.",
  "Content builder published 4 new pages.",
  "Monitor flagged a ranking drop for 3 keywords.",
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Your automations are running smoothly. Keep an eye on performance below.
          </p>
        </div>
        <Button>Launch new project</Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Active projects" value={projects.length} helper="2 running automations" />
        <StatsCard label="Pages published" value={128} helper="+12 this week" />
        <StatsCard label="Leads captured" value={312} helper="+8% MoM" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent projects</h3>
            <Button variant="outline" size="sm">
              View all
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} {...project} />
            ))}
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {activities.map((activity) => (
              <div key={activity} className="rounded-lg border bg-muted/30 p-3">
                {activity}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-muted/30 p-6">
        <h3 className="text-lg font-semibold">Get started</h3>
        <p className="text-sm text-muted-foreground">
          Connect integrations, seed your first keyword list, and let the agents go to work.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline">Connect WordPress</Button>
          <Button variant="outline">Sync GSC</Button>
          <Button>Start automation loop</Button>
        </div>
      </section>
    </div>
  );
}
