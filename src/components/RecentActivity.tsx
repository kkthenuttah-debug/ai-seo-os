import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  FileText, 
  Users, 
  TrendingUp, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  message: string;
  time: string;
  timestamp: number;
}

interface RecentActivityProps {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'agent_completed':
      return <Bot className="h-4 w-4 text-blue-600" />;
    case 'page_published':
      return <FileText className="h-4 w-4 text-green-600" />;
    case 'leads_captured':
      return <Users className="h-4 w-4 text-purple-600" />;
    case 'ranking_improved':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'integration_status':
      return <Settings className="h-4 w-4 text-orange-600" />;
    case 'page_optimized':
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

const getActivityBadgeVariant = (type: string) => {
  switch (type) {
    case 'agent_completed':
      return 'default';
    case 'page_published':
      return 'default';
    case 'leads_captured':
      return 'secondary';
    case 'ranking_improved':
      return 'default';
    case 'integration_status':
      return 'outline';
    case 'page_optimized':
      return 'default';
    default:
      return 'outline';
  }
};

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <CardContent className="p-6 text-center text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
      </CardContent>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant={getActivityBadgeVariant(activity.type) as any}
                className="text-xs"
              >
                {activity.type.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
            <p className="text-sm text-foreground leading-tight">
              {activity.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}