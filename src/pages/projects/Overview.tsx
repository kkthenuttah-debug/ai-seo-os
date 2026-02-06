import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentRunItem } from "@/components/AgentRunItem";
import { Chart } from "@/components/Chart";
import { StatsCard } from "@/components/StatsCard";

const stats = [
  { label: "Pages published", value: 48, helper: "+6 this week" },
  { label: "Keywords ranking", value: 212, helper: "+12% MoM" },
  { label: "Leads captured", value: 86, helper: "+4 this week" },
];

const chartData = [
  { name: "Mon", value: 20 },
  { name: "Tue", value: 32 },
  { name: "Wed", value: 28 },
  { name: "Thu", value: 40 },
  { name: "Fri", value: 38 },
  { name: "Sat", value: 48 },
  { name: "Sun", value: 42 },
];

const agentRuns = [
  {
    agent: "Content Builder",
    status: "completed",
    duration: "6m",
    summary: "Published 3 new blog pages.",
  },
  {
    agent: "Optimizer",
    status: "running",
    duration: "2m",
    summary: "Refreshing meta data for top pages.",
  },
];

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>urban gardening ideas</span>
              <span>#3</span>
            </div>
            <div className="flex items-center justify-between">
              <span>balcony composting</span>
              <span>#5</span>
            </div>
            <div className="flex items-center justify-between">
              <span>backyard greenhouse kit</span>
              <span>#9</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Automation status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Agents are running smoothly with 2 jobs in queue.</p>
            <Button size="sm">Pause loop</Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent agent runs</h3>
          <Button variant="outline" size="sm">
            View queue
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {agentRuns.map((run) => (
            <AgentRunItem key={run.agent} {...run} />
          ))}
        </div>
      </section>
    </div>
  );
}
