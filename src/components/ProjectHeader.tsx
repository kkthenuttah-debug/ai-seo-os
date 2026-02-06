import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Settings, 
  Pause, 
  Play, 
  ExternalLink, 
  Trash2, 
  Copy,
  Calendar,
  Globe
} from "lucide-react";

interface ProjectHeaderProps {
  projectName: string;
  domain: string;
  status: string;
  lastUpdated: string;
}

export function ProjectHeader({ 
  projectName, 
  domain, 
  status, 
  lastUpdated 
}: ProjectHeaderProps) {
  const isActive = status === 'active';

  const handleToggleStatus = () => {
    // This would typically update the project status
    console.log('Toggle project status');
  };

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(domain);
    // You could show a toast notification here
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border bg-card p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{projectName}</h2>
          <Badge 
            variant={isActive ? 'default' : 'secondary'}
            className="text-xs"
          >
            {status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span>{domain}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 ml-1"
              onClick={handleCopyDomain}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Last activity {lastUpdated}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant={isActive ? "outline" : "default"}
          size="sm"
          onClick={handleToggleStatus}
          className="gap-2"
        >
          {isActive ? (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Resume
            </>
          )}
        </Button>
        
        <Button variant="outline" size="sm" asChild>
          <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View Site
          </a>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Project Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Copy Domain
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}