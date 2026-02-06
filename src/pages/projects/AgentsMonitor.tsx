import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentRunItem } from "@/components/AgentRunItem";

const queue = [
  { agent: "Market Research", status: "queued", duration: "-", summary: "Gathering SERP data" },
  { agent: "Optimizer", status: "running", duration: "3m", summary: "Updating metadata" },
  { agent: "Publisher", status: "completed", duration: "5m", summary: "Published 2 posts" },
];

export default function AgentsMonitor() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current job</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Optimizer is refreshing top-performing pages.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Queue status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">2 jobs waiting · 1 running</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent health</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">All systems operational</CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent jobs</h3>
        <Button variant="outline" size="sm">
          Retry failed jobs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {queue.map((run) => (
          <AgentRunItem key={`${run.agent}-${run.status}`} {...run} />
        ))}
      </div>
    </div>
  );
}
