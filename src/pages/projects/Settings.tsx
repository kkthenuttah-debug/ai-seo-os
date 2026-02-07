import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage } from "@/components/ErrorMessage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { projectSettingsSchema } from "@/types/forms";
import type { z } from "zod";
import { projectsService, type ProjectFull } from "@/services/projects";
import { useNotification } from "@/hooks/useNotification";

type ProjectSettingsValues = z.infer<typeof projectSettingsSchema>;

const DEFAULT_AI_MODEL = "Gemini 3 Pro Preview";
const DEFAULT_TEMPERATURE = 0.6;

export default function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);
  const [aiTemperature, setAiTemperature] = useState(DEFAULT_TEMPERATURE);
  const [aiSaving, setAiSaving] = useState(false);
  const { showError, notifySuccess } = useNotification();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectSettingsValues>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: { name: "", domain: "", status: "active", niche: "", target_audience: "" },
  });

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectsService
      .getFull(projectId)
      .then((p) => {
        setProject(p);
        const s = p.settings ?? {};
        reset({
          name: p.name,
          domain: p.domain ?? "",
          status: p.status === "paused" ? "paused" : "active",
          niche: (s.niche as string) ?? "",
          target_audience: (s.target_audience as string) ?? "",
        });
        setAiModel((s.ai_model as string) ?? DEFAULT_AI_MODEL);
        setAiTemperature(Number(s.ai_temperature) || DEFAULT_TEMPERATURE);
      })
      .catch(() => showError("Failed to load project"))
      .finally(() => setLoading(false));
  }, [projectId, reset, showError]);

  const onSubmit = async (values: ProjectSettingsValues) => {
    if (!projectId || !project) return;
    setSaving(true);
    try {
      await projectsService.update(projectId, {
        name: values.name,
        domain: values.domain,
        status: values.status,
        settings: {
          ...(project.settings ?? {}),
          niche: values.niche ?? "",
          target_audience: values.target_audience ?? "",
        },
      });
      setProject((prev) =>
        prev
          ? {
              ...prev,
              ...values,
              settings: {
                ...(prev.settings ?? {}),
                niche: values.niche ?? "",
                target_audience: values.target_audience ?? "",
              },
            }
          : null
      );
      notifySuccess("Project details saved.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAiSettings = async () => {
    if (!projectId || !project) return;
    setAiSaving(true);
    try {
      await projectsService.update(projectId, {
        settings: {
          ...(project.settings ?? {}),
          ai_model: aiModel,
          ai_temperature: aiTemperature,
        },
      });
      setProject((prev) =>
        prev ? { ...prev, settings: { ...prev.settings, ai_model: aiModel, ai_temperature: aiTemperature } } : null
      );
      notifySuccess("AI settings saved.");
      setAiDialogOpen(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save AI settings");
    } finally {
      setAiSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <p className="text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  const settings = project?.settings ?? {};
  const displayModel = (settings.ai_model as string) ?? DEFAULT_AI_MODEL;
  const displayTemp = Number(settings.ai_temperature) ?? DEFAULT_TEMPERATURE;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" {...register("name")} />
              {errors.name ? <ErrorMessage message={errors.name.message ?? ""} /> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" {...register("domain")} />
              {errors.domain ? <ErrorMessage message={errors.domain.message ?? ""} /> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input id="status" {...register("status")} />
              {errors.status ? <ErrorMessage message={errors.status.message ?? ""} /> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="niche">Niche</Label>
              <Input id="niche" placeholder="e.g. B2B SaaS, fitness" {...register("niche")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target audience</Label>
              <Input
                id="target_audience"
                placeholder="e.g. small business owners, developers"
                {...register("target_audience")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Automation runs daily at 8:00 AM with adaptive monitoring.</p>
            <Button variant="outline" type="button" disabled>
              Edit schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Model: {displayModel} · Temperature: {displayTemp}
            </p>
            <Button variant="outline" type="button" onClick={() => setAiDialogOpen(true)}>
              Adjust model
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deleting a project will remove pages, rankings, and automation history.
            </p>
            <Button variant="destructive" type="button" disabled>
              Delete project
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust model</DialogTitle>
            <DialogDescription>
              Choose the model and temperature used for AI agents. Higher temperature increases creativity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="e.g. Gemini 3 Pro Preview"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-temperature">Temperature (0–1)</Label>
              <Input
                id="ai-temperature"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={aiTemperature}
                onChange={(e) => setAiTemperature(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAiSettings} disabled={aiSaving}>
              {aiSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
