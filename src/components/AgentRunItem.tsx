import { Card, CardContent } from "@/components/ui/card";

interface AgentRunItemProps {
  agent: string;
  status: string;
  duration: string;
  summary: string;
}

export function AgentRunItem({ agent, status, duration, summary }: AgentRunItemProps) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>{agent}</span>
          <span className="text-xs text-muted-foreground">{duration}</span>
        </div>
        <div className="text-xs text-muted-foreground">{summary}</div>
        <div className="text-xs">Status: {status}</div>
      </CardContent>
    </Card>
  );
}
