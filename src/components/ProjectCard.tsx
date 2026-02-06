import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Target, Settings, ExternalLink } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  domain: string;
  status: string;
  updatedAt: string;
  pagesCount?: number;
  leadsCount?: number;
  keywordsCount?: number;
}

export function ProjectCard({ 
  id, 
  name, 
  domain, 
  status, 
  updatedAt, 
  pagesCount = 0, 
  leadsCount = 0, 
  keywordsCount = 0 
}: ProjectCardProps) {
  return (
    <Card className="flex h-full flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge 
            variant={status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{domain}</p>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">{pagesCount}</div>
            <div className="text-xs text-muted-foreground">Pages</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">{leadsCount}</div>
            <div className="text-xs text-muted-foreground">Leads</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">{keywordsCount}</div>
            <div className="text-xs text-muted-foreground">Keywords</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center border-t pt-3">
          Last activity {updatedAt}
        </div>
      </CardContent>
      <CardFooter className="pt-3 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link to={`/app/projects/${id}/overview`}>
            <ExternalLink className="h-3 w-3 mr-1" />
            View
          </Link>
        </Button>
        <Button asChild size="sm" className="flex-1">
          <Link to={`/app/projects/${id}/settings`}>
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
