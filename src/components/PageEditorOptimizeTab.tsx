import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, Check, Zap } from "lucide-react";
import { analyticsService, type PagePerformanceResponse } from "@/services/analytics";
import {
  optimizationService,
  type OptimizerRecommendation,
  type OptimizerResult,
} from "@/services/optimization";
import { useNotification } from "@/hooks/useNotification";

interface PageEditorOptimizeTabProps {
  projectId: string;
  pageId: string | null;
  /** Only when editing existing page */
  currentTitle: string;
  currentMetaDescription: string;
  currentContent: string;
  onApplyTitle: (value: string) => void;
  onApplyMetaDescription: (value: string) => void;
  onApplyContent: (value: string) => void;
}

export function PageEditorOptimizeTab({
  projectId,
  pageId,
  currentTitle,
  currentMetaDescription,
  currentContent,
  onApplyTitle,
  onApplyMetaDescription,
  onApplyContent,
}: PageEditorOptimizeTabProps) {
  const [performance, setPerformance] = useState<PagePerformanceResponse | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<OptimizerResult | null>(null);
  const { showError, notifySuccess } = useNotification();

  useEffect(() => {
    if (!projectId || !pageId) {
      setPerformance(null);
      return;
    }
    setPerfLoading(true);
    analyticsService
      .pagePerformance(projectId, pageId)
      .then(setPerformance)
      .catch(() => setPerformance(null))
      .finally(() => setPerfLoading(false));
  }, [projectId, pageId]);

  const handleAnalyze = async () => {
    if (!projectId || !pageId) {
      showError("Save the page first to analyze.");
      return;
    }
    setAnalyzing(true);
    setRecommendations(null);
    try {
      const gscData = performance?.queries ?? [];
      if (gscData.length === 0) {
        notifySuccess("No GSC data for this page yet. Running with empty data.");
      }
      const { runId } = await optimizationService.runOptimizer(
        projectId,
        pageId,
        currentContent || currentTitle || "(no content)",
        gscData
      );
      const result = await optimizationService.pollRunUntilComplete(projectId, runId);
      setRecommendations(result);
      notifySuccess("Analysis complete.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQuickApply = (rec: OptimizerRecommendation) => {
    if (rec.type === "title" && rec.suggested) {
      onApplyTitle(rec.suggested);
      notifySuccess("Title applied");
    } else if (rec.type === "meta" && rec.suggested) {
      onApplyMetaDescription(rec.suggested);
      notifySuccess("Meta description applied");
    } else if ((rec.type === "content" || rec.type === "heading") && rec.suggested) {
      onApplyContent(rec.suggested);
      notifySuccess("Content applied");
    }
  };

  const canAnalyze = !!pageId;

  return (
    <div className="space-y-6">
      {!pageId && (
        <Card className="border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Save the page first.</strong> Performance data and the Optimizer will be available after you save. In create mode, click &quot;Create Page&quot; (or save as draft), then reopen the page to use this tab.
            </p>
          </CardContent>
        </Card>
      )}

      {/* GSC Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Search performance
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time GSC data for this page (last 30 days)
          </p>
        </CardHeader>
        <CardContent>
          {!pageId ? (
            <p className="text-sm text-muted-foreground">
              Data will appear here after you save the page.
            </p>
          ) : perfLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : performance ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-semibold">{performance.clicks}</div>
                <div className="text-xs text-muted-foreground">Clicks</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{performance.impressions}</div>
                <div className="text-xs text-muted-foreground">Impressions</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{performance.avgPosition.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg position</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{performance.queries.length}</div>
                <div className="text-xs text-muted-foreground">Queries</div>
              </div>
              {performance.queries.length > 0 && (
                <div className="col-span-2 sm:col-span-4 mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Top queries</p>
                  <div className="flex flex-wrap gap-1">
                    {performance.queries.slice(0, 8).map((q) => (
                      <Badge key={q.query} variant="secondary" className="text-xs">
                        {q.query} (pos {q.position.toFixed(0)})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No performance data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Optimizer Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Optimizer agent
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            One-click analysis for high-impact SEO recommendations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pageId ? (
            <p className="text-sm text-muted-foreground">
              Save the page to run the Optimizer and get recommendations.
            </p>
          ) : null}
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Analyze
              </>
            )}
          </Button>

          {recommendations && recommendations.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Recommendations</h4>
              <ul className="space-y-3">
                {recommendations.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          rec.priority === "high"
                            ? "default"
                            : rec.priority === "medium"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {rec.type}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleQuickApply(rec)}
                      >
                        <Check className="h-3 w-3" />
                        Quick apply
                      </Button>
                    </div>
                    <p className="text-muted-foreground">{rec.reason}</p>
                    <div className="grid gap-1 text-xs">
                      <span className="text-muted-foreground">Suggested:</span>
                      <span className="font-medium">{rec.suggested}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations && recommendations.recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">No recommendations from the agent.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
