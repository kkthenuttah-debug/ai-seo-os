import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/StatsCard";
import { RecentActivity } from "@/components/RecentActivity";
import { ProjectCard } from "@/components/ProjectCard";
import { Calendar, TrendingUp, TrendingDown, Minus, Plus, Settings, BookOpen, Play } from "lucide-react";

const projects = [
  {
    id: "project-1",
    name: "Urban Garden Co",
    domain: "urbangarden.co",
    status: "active",
    updatedAt: "2 hours ago",
    pagesCount: 24,
    leadsCount: 89,
    keywordsCount: 156,
  },
  {
    id: "project-2",
    name: "Solar Peak",
    domain: "solarpk.com",
    status: "paused",
    updatedAt: "yesterday",
    pagesCount: 18,
    leadsCount: 34,
    keywordsCount: 89,
  },
  {
    id: "project-3",
    name: "Fitness First",
    domain: "fitnessfirst.io",
    status: "active",
    updatedAt: "3 days ago",
    pagesCount: 31,
    leadsCount: 67,
    keywordsCount: 203,
  },
];

const activities = [
  {
    id: "1",
    type: "agent_completed",
    message: "Market research agent discovered 12 new keyword clusters",
    time: "2 hours ago",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "2",
    type: "page_published",
    message: "Content builder published 'Ultimate Guide to Urban Composting'",
    time: "4 hours ago",
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
  },
  {
    id: "3",
    type: "leads_captured",
    message: "New lead captured from urbangarden.co/composting-guide",
    time: "6 hours ago",
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
  },
  {
    id: "4",
    type: "ranking_improved",
    message: "Keyword 'balcony gardening' moved from #12 to #8",
    time: "8 hours ago",
    timestamp: Date.now() - 8 * 60 * 60 * 1000,
  },
  {
    id: "5",
    type: "integration_status",
    message: "Google Search Console sync completed successfully",
    time: "12 hours ago",
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
  },
  {
    id: "6",
    type: "page_optimized",
    message: "SEO optimizer improved meta descriptions for 5 pages",
    time: "1 day ago",
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
  },
];

const stats = [
  {
    label: "Total Projects",
    value: 3,
    trend: "up",
    change: "+1 this month",
    helper: "2 running automations",
  },
  {
    label: "Pages Published",
    value: 73,
    trend: "up",
    change: "+12 this week",
    helper: "Across all projects",
  },
  {
    label: "Leads Captured",
    value: 190,
    trend: "up",
    change: "+8% MoM",
    helper: "This month",
  },
  {
    label: "Keywords Ranking Top 3",
    value: 23,
    trend: "up",
    change: "+4 this week",
    helper: "Out of 448 total",
  },
];

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Welcome back!</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatTime(currentTime)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your automations are running smoothly. Keep an eye on performance below.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Launch new project
        </Button>
      </section>

      {/* Stats Cards Grid */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                {getTrendIcon(stat.trend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <div className={`text-xs flex items-center gap-1 ${getTrendColor(stat.trend)}`}>
                {stat.change}
              </div>
              {stat.helper && (
                <p className="text-xs text-muted-foreground mt-1">{stat.helper}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Recent Projects Section */}
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

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity activities={activities.slice(0, 8)} />
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions Section */}
      <section className="rounded-xl border bg-muted/30 p-6">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">
          Common tasks to get you started quickly.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create new project
          </Button>
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Setup wizard
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Documentation
          </Button>
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Start automation
          </Button>
        </div>
      </section>

      {/* Getting Started Guide (if no projects) */}
      {projects.length === 0 && (
        <section className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">🚀 Get Started with Your First Project</h3>
            <p className="text-muted-foreground mb-6">
              Let's set up your AI-powered SEO automation in just a few simple steps.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Connect Your Domain</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your website domain and verify ownership
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Setup WordPress Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect your WordPress site for automated publishing
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Connect Google Search Console</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable tracking and monitoring of your search performance
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Launch Automation</h4>
                  <p className="text-sm text-muted-foreground">
                    Let AI agents handle market research, content creation, and optimization
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button size="lg" className="gap-2">
                <Play className="h-4 w-4" />
                Start Setup Wizard
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}