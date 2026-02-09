import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  Save,
  Globe,
  FileText,
  Code,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Paintbrush,
  Maximize2,
  Minimize2,
  TrendingUp,
} from "lucide-react";
import { pagesService, type PageFromApi } from "@/services/pages";
import { useNotification } from "@/hooks/useNotification";
import { VisualEditor } from "@/components/VisualEditor";
import type { ElementorData } from "@/types/elementor";
import { validateElementorData, renderElementorToHtml } from "@/lib/elementor-utils";

interface PageEditorProps {
  projectId: string;
  page?: PageFromApi | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (page: PageFromApi) => void;
  mode: "create" | "edit";
}

interface PageFormData {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  status: "draft" | "published" | "optimized";
  elementorData: string;
}

const initialFormData: PageFormData = {
  title: "",
  slug: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  status: "draft",
  elementorData: "{}",
};

export function PageEditor({
  projectId,
  page,
  isOpen,
  onClose,
  onSave,
  mode,
}: PageEditorProps) {
  const [formData, setFormData] = useState<PageFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("content");
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { showError, notifySuccess } = useNotification();

  useEffect(() => {
    if (isOpen) {
      if (page && mode === "edit") {
        setFormData({
          title: page.title || "",
          slug: page.slug || "",
          content: page.content || "",
          metaTitle: page.meta_title || "",
          metaDescription: page.meta_description || "",
          metaKeywords: page.meta_keywords || "",
          status:
            (page.status as "draft" | "published" | "optimized") || "draft",
          elementorData: page.elementor_data
            ? JSON.stringify(page.elementor_data, null, 2)
            : "{}",
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, page, mode]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 60);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: mode === "create" && !prev.slug ? generateSlug(title) : prev.slug,
    }));
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug =
        "Slug can only contain lowercase letters, numbers, and hyphens";
    }

    // Validate JSON
    try {
      JSON.parse(formData.elementorData);
    } catch {
      newErrors.elementorData = "Invalid JSON format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        metaTitle: formData.metaTitle,
        metaDescription: formData.metaDescription,
        metaKeywords: formData.metaKeywords,
        status: formData.status,
        elementorData: JSON.parse(formData.elementorData),
      };

      let savedPage: PageFromApi;
      if (mode === "edit" && page) {
        savedPage = await pagesService.update(projectId, page.id, payload);
        notifySuccess("Page updated successfully");
      } else {
        savedPage = await pagesService.create(projectId, {
          title: payload.title,
          slug: payload.slug,
          content: payload.content,
        });
        // Update additional fields after creation
        if (savedPage.id) {
          savedPage = await pagesService.update(
            projectId,
            savedPage.id,
            payload,
          );
        }
        notifySuccess("Page created successfully");
      }

      onSave(savedPage);
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    let html = '';
    
    try {
      const elementorData = JSON.parse(formData.elementorData);
      if (elementorData && elementorData.elements && elementorData.elements.length > 0) {
        html = renderElementorToHtml(elementorData);
      } else {
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formData.metaTitle || formData.title}</title>
  <meta name="description" content="${formData.metaDescription}">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
    .content { color: #333; }
    .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="meta">
    <strong>Slug:</strong> /${formData.slug}<br>
    <strong>Status:</strong> ${formData.status}<br>
    ${formData.metaKeywords ? `<strong>Keywords:</strong> ${formData.metaKeywords}` : ""}
  </div>
  <h1>${formData.title}</h1>
  <div class="content">
    ${formData.content.replace(/\n/g, "<br>") || "<em>No content yet</em>"}
  </div>
</body>
</html>`;
      }
    } catch (err) {
      html = `<!DOCTYPE html>
<html><body><div style="padding: 20px; text-align: center;">
  <h2>Preview Error</h2>
  <p>Unable to generate preview. Please check the page data.</p>
</div></body></html>`;
    }
    
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Published
          </Badge>
        );
      case "optimized":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Optimized
          </Badge>
        );
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const wordCount = formData.content.split(/\s+/).filter(Boolean).length;
  const charCount = formData.content.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`overflow-hidden flex flex-col ${isMaximized ? "max-w-none w-screen h-screen m-0 rounded-none" : "max-w-4xl max-h-[90vh]"}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {mode === "create" ? (
                  <>
                    <FileText className="h-5 w-5" />
                    Create New Page
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Edit Page
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Create a new page for your project."
                  : `Editing "${page?.title}"`}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            {getStatusBadge(formData.status)}
            <span className="text-sm text-muted-foreground">
              {wordCount} words · {charCount} chars
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-1" />
              Content
            </TabsTrigger>
            <TabsTrigger value="visual">
              <Paintbrush className="h-4 w-4 mr-1" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Globe className="h-4 w-4 mr-1" />
              SEO & Meta
            </TabsTrigger>
            <TabsTrigger value="optimize" disabled={mode === "create" || !page?.id}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Optimize
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Code className="h-4 w-4 mr-1" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto flex-1 max-h-[50vh]">
            <TabsContent value="visual" className="h-[600px] m-0">
              <VisualEditor
                initialData={
                  formData.elementorData !== "{}"
                    ? JSON.parse(formData.elementorData)
                    : undefined
                }
                onSave={(data) => {
                  setFormData((prev) => ({
                    ...prev,
                    elementorData: JSON.stringify(data, null, 2),
                  }));
                }}
              />
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Page Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter page title"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  URL Slug <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        slug: e.target.value,
                      }));
                      if (errors.slug)
                        setErrors((prev) => ({ ...prev, slug: "" }));
                    }}
                    placeholder="page-url-slug"
                    className={errors.slug ? "border-red-500" : ""}
                  />
                </div>
                {errors.slug && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.slug}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Enter page content..."
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports HTML. Content will be rendered on the page.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metaTitle: e.target.value,
                    }))
                  }
                  placeholder="SEO title (appears in search results)"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.metaTitle.length}/60 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metaDescription: e.target.value,
                    }))
                  }
                  placeholder="Brief description for search engines"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.metaDescription.length}/160 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metaKeywords: e.target.value,
                    }))
                  }
                  placeholder="keyword1, keyword2, keyword3"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords (optional)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Page Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "draft" | "published" | "optimized") =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="optimized">Optimized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="optimize" className="space-y-4">
              {page?.status === "draft" && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Page Not Published
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This page must be published before optimization data is available.
                    </p>
                  </div>
                </div>
              )}
              
              {page?.status !== "draft" && (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Performance Analytics</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold text-blue-600">--</div>
                        <div className="text-xs text-muted-foreground">Clicks (30d)</div>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold text-purple-600">--</div>
                        <div className="text-xs text-muted-foreground">Impressions (30d)</div>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold text-green-600">--%</div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold text-orange-600">--</div>
                        <div className="text-xs text-muted-foreground">Avg. Position</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Analytics data will be available once GSC integration is active.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Top Keywords</Label>
                    <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                      No keyword data available yet
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">AI-Powered Optimization</Label>
                    <div className="p-4 border rounded-lg space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Get AI-powered recommendations to improve this page's SEO performance.
                      </p>
                      <Button className="w-full gap-2" variant="outline">
                        <Sparkles className="h-4 w-4" />
                        Analyze SEO with AI
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Recommendations</Label>
                    <div className="border rounded-lg divide-y">
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Run AI analysis to see optimization recommendations
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="advanced-toggle">Show Elementor Data</Label>
                  <p className="text-xs text-muted-foreground">
                    Edit raw Elementor JSON data (advanced users only)
                  </p>
                </div>
                <Switch
                  id="advanced-toggle"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                />
              </div>

              {showAdvanced && (
                <div className="space-y-2">
                  <Label htmlFor="elementorData">Elementor Data (JSON)</Label>
                  <Textarea
                    id="elementorData"
                    value={formData.elementorData}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        elementorData: e.target.value,
                      }));
                      if (errors.elementorData)
                        setErrors((prev) => ({ ...prev, elementorData: "" }));
                    }}
                    placeholder="{}"
                    className={`min-h-[300px] font-mono text-sm ${errors.elementorData ? "border-red-500" : ""}`}
                  />
                  {errors.elementorData && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.elementorData}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Raw Elementor page builder data in JSON format. Invalid JSON
                    will prevent saving.
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {mode === "create" ? "Create Page" : "Save Changes"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Page Preview
            </DialogTitle>
            <DialogDescription>
              Preview how your page will appear to visitors
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              title="Page Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
