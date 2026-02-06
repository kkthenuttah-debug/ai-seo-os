import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  id: string;
  name: string;
  domain: string;
  status: string;
  updatedAt: string;
}

export function ProjectCard({ id, name, domain, status, updatedAt }: ProjectCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <p className="text-sm text-muted-foreground">{domain}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          Status: <span className="font-medium text-foreground">{status}</span>
        </div>
        <div className="text-xs text-muted-foreground">Last activity {updatedAt}</div>
      </CardContent>
      <CardFooter className="mt-auto flex justify-between">
        <Button asChild size="sm" variant="outline">
          <Link to={`/app/projects/${id}/overview`}>View</Link>
        </Button>
        <Button asChild size="sm">
          <Link to={`/app/projects/${id}/settings`}>Settings</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
