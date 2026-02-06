import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { Input } from "@/components/ui/input";

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
  {
    id: "project-3",
    name: "Cloudrise",
    domain: "cloudrise.io",
    status: "active",
    updatedAt: "3 days ago",
  },
];

export default function Projects() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Track every automated SEO workspace.</p>
        </div>
        <Button>Create project</Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input placeholder="Search projects" className="md:max-w-sm" />
        <Button variant="outline">Filter by status</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 1-3 of 12 projects</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Previous
          </Button>
          <Button size="sm" variant="outline">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
