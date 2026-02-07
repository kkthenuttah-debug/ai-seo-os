import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  Play,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Code,
  Settings,
  Lightbulb,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { agentsService, type AgentInfo } from "@/services/agents";
import { useNotification } from "@/hooks/useNotification";

type AgentType =
  | "market_research"
  | "site_architect"
  | "content_builder"
  | "elementor_builder"
  | "internal_linker"
  | "page_builder"
  | "publisher"
  | "optimizer"
  | "monitor"
  | "fixer"
  | "technical_seo";

interface AgentLauncherProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultAgent?: AgentType;
}

const agentPresets: Record<string, Partial<Record<AgentType, Record<string, unknown>>>> = {
  market_research: {
    market_research: {
      niche: "",
      target_audience: "",
      competitors: [],
    },
  },
  content_builder: {
    content_builder: {
      page_title: "",
      target_keyword: "",
      content_type: "blog_post",
      tone: "professional",
      word_count: 1500,
    },
  },
  page_builder: {
    page_builder: {
      page: {
        title: "",
        slug: "",
        target_keyword: "",
        content_type: "landing_page",
      },
    },
  },
  optimizer: {
    optimizer: {
      page_id: "",
      optimization_type: "seo",
    },
  },
  publisher: {
    publisher: {
      page_id: "",
    },
  },
};

const agentHelpText: Record<AgentType, { purpose: string; inputs: string; output: string }> = {
  market_research: {
    purpose: "Analyze your niche, competitors, and find keyword opportunities",
    inputs: "Niche, target audience, competitor URLs (optional)",
    output: "Market analysis, competitor insights, keyword opportunities",
  },
  site_architect: {
    purpose: "Design optimal site structure and internal linking strategy",
    inputs: "Market research data (auto-fetched)",
    output: "Site structure, category hierarchy, URL mapping",
  },
  content_builder: {
    purpose: "Generate SEO-optimized content for your pages",
    inputs: "Page title, target keyword, content type, tone, word count",
    output: "Complete content with headings, meta tags, and internal link suggestions",
  },
  elementor_builder: {
    purpose: "Create Elementor page layouts from content",
    inputs: "Content from content_builder (auto-fetched)",
    output: "Elementor JSON data for visual page builder",
  },
  internal_linker: {
    purpose: "Build internal link structure between pages",
    inputs: "Site architecture (auto-fetched)",
    output: "Internal link recommendations and mapping",
  },
  page_builder: {
    purpose: "Assemble complete pages with content and layout",
    inputs: "Page details (title, slug, keyword, type)",
    output: "Complete page ready for publishing",
  },
  publisher: {
    purpose: "Publish pages to your WordPress site",
    inputs: "Page ID to publish",
    output: "Published page with WordPress URL",
  },
  optimizer: {
    purpose: "Optimize existing pages based on performance data",
    inputs: "Page ID, optimization type",
    output: "Optimization recommendations and updated content",
  },
  monitor: {
    purpose: "Monitor site health and rankings",
    inputs: "None (runs automatically)",
    output: "Health score, alerts, trends, recommendations",
  },
  fixer: {
    purpose: "Fix technical SEO issues automatically",
    inputs: "Issues detected by monitor (auto-fetched)",
    output: "Fixed issues report",
  },
  technical_seo: {
    purpose: "Audit and improve technical SEO aspects",
    inputs: "Site URL and configuration",
    output: "Technical audit report with fixes",
  },
};

const categoryColors = {
  strategy: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  execution: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export function AgentLauncher({ projectId, isOpen, onClose, defaultAgent }: AgentLauncherProps) {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<AgentType | "">(defaultAgent || "");
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useJsonInput, setUseJsonInput] = useState(false);
  const [jsonInput, setJsonInput] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState("form");
  const { showError, notifySuccess } = useNotification();

  useEffect(() => {
    if (isOpen) {
      loadAgents();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (selectedAgent && agentPresets[selectedAgent]) {
      const preset = agentPresets[selectedAgent][selectedAgent] || {};
      setFormData(preset);
      setJsonInput(JSON.stringify(preset, null, 2));
    } else {
      setFormData({});
      setJsonInput("{}");
    }
    setJsonError("");
  }, [selectedAgent]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await agentsService.list(projectId);
      setAgents(response.agents);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      setJsonError("");
      return true;
    } catch {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedAgent) {
      showError("Please select an agent");
      return;
    }

    let input: Record<string, unknown>;

    if (useJsonInput) {
      if (!validateJson(jsonInput)) return;
      input = JSON.parse(jsonInput);
    } else {
      input = formData;
    }

    setIsSubmitting(true);
    try {
      const result = await agentsService.run(projectId, selectedAgent, input);
      notifySuccess(`Agent ${formatAgentName(selectedAgent)} scheduled successfully`);
      onClose();
      // Navigate to agents monitor to see the job
      navigate(`/app/projects/${projectId}/agents`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to run agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAgentName = (type: string) => {
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const selectedAgentInfo = agents.find((a) => a.type === selectedAgent);
  const helpText = selectedAgent ? agentHelpText[selectedAgent] : null;

  const renderFormFields = () => {
    switch (selectedAgent) {
      case "market_research":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="niche">Niche / Industry</Label>
              <Input
                id="niche"
                value={(formData.niche as string) || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, niche: e.target.value }))}
                placeholder="e.g., Digital Marketing, SaaS, Health & Fitness"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={(formData.target_audience as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, target_audience: e.target.value }))
                }
                placeholder="e.g., Small business owners, Marketing professionals"
              />
            </div>
          </div>
        );

      case "content_builder":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page_title">Page Title</Label>
              <Input
                id="page_title"
                value={(formData.page_title as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, page_title: e.target.value }))
                }
                placeholder="e.g., 10 Tips for Better SEO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_keyword">Target Keyword</Label>
              <Input
                id="target_keyword"
                value={(formData.target_keyword as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, target_keyword: e.target.value }))
                }
                placeholder="e.g., SEO tips"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="content_type">Content Type</Label>
                <Select
                  value={(formData.content_type as string) || "blog_post"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, content_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog_post">Blog Post</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                    <SelectItem value="product_page">Product Page</SelectItem>
                    <SelectItem value="service_page">Service Page</SelectItem>
                    <SelectItem value="about_page">About Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={(formData.tone as string) || "professional"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, tone: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="word_count">Word Count</Label>
              <Input
                id="word_count"
                type="number"
                value={(formData.word_count as number) || 1500}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, word_count: parseInt(e.target.value) }))
                }
                min={500}
                max={5000}
                step={100}
              />
            </div>
          </div>
        );

      case "page_builder":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page_title">Page Title</Label>
              <Input
                id="page_title"
                value={((formData.page as Record<string, string>)?.title as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    page: { ...(prev.page as object), title: e.target.value },
                  }))
                }
                placeholder="e.g., Our Services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page_slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  id="page_slug"
                  value={((formData.page as Record<string, string>)?.slug as string) || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      page: { ...(prev.page as object), slug: e.target.value },
                    }))
                  }
                  placeholder="our-services"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_keyword">Target Keyword</Label>
              <Input
                id="target_keyword"
                value={((formData.page as Record<string, string>)?.target_keyword as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    page: { ...(prev.page as object), target_keyword: e.target.value },
                  }))
                }
                placeholder="e.g., services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={((formData.page as Record<string, string>)?.content_type as string) || "landing_page"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    page: { ...(prev.page as object), content_type: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="product_page">Product Page</SelectItem>
                  <SelectItem value="service_page">Service Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "publisher":
      case "optimizer":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page_id">Page ID</Label>
              <Input
                id="page_id"
                value={(formData.page_id as string) || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, page_id: e.target.value }))}
                placeholder="Enter the page ID from the Pages section"
              />
              <p className="text-xs text-muted-foreground">
                Find the page ID in the Pages section of your project
              </p>
            </div>
            {selectedAgent === "optimizer" && (
              <div className="space-y-2">
                <Label htmlFor="optimization_type">Optimization Type</Label>
                <Select
                  value={(formData.optimization_type as string) || "seo"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, optimization_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seo">SEO Optimization</SelectItem>
                    <SelectItem value="readability">Readability</SelectItem>
                    <SelectItem value="conversion">Conversion Rate</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>This agent runs with default settings.</p>
            <p className="text-sm">Switch to JSON input for advanced configuration.</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Run Agent
          </DialogTitle>
          <DialogDescription>
            Select an agent and configure its input to start a new job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto">
          {/* Agent Selection */}
          <div className="space-y-2">
            <Label htmlFor="agent-select">Select Agent</Label>
            <Select
              value={selectedAgent}
              onValueChange={(value) => setSelectedAgent(value as AgentType)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    Loading agents...
                  </SelectItem>
                ) : (
                  agents.map((agent) => (
                    <SelectItem key={agent.type} value={agent.type}>
                      <div className="flex items-center gap-2">
                        <span>{agent.name}</span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${categoryColors[agent.category]}`}
                        >
                          {agent.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Info Card */}
          {selectedAgentInfo && helpText && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm">{helpText.purpose}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-muted-foreground">Input: {helpText.inputs}</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <p className="text-sm text-muted-foreground">Output: {helpText.output}</p>
                </div>
                {selectedAgentInfo.dependencies.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Dependencies: {selectedAgentInfo.dependencies.map(formatAgentName).join(", ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Input Method Toggle */}
          <div className="flex items-center justify-between py-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Input Method</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">JSON</span>
              <Switch checked={useJsonInput} onCheckedChange={setUseJsonInput} />
            </div>
          </div>

          {/* Input Form */}
          {selectedAgent ? (
            useJsonInput ? (
              <div className="space-y-2">
                <Label htmlFor="json-input">
                  <Code className="h-4 w-4 inline mr-1" />
                  JSON Input
                </Label>
                <Textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    validateJson(e.target.value);
                  }}
                  className={`min-h-[200px] font-mono text-sm ${jsonError ? "border-red-500" : ""}`}
                  placeholder='{"key": "value"}'
                />
                {jsonError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {jsonError}
                  </p>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4">{renderFormFields()}</div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an agent to configure its input</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAgent || isSubmitting || (useJsonInput && !!jsonError)}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
