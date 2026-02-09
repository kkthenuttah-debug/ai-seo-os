import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Trash2, Copy, Plus, X, Palette } from "lucide-react";
import type { ElementorElement, ElementSettings } from "@/types/elementor";
import { cn } from "@/lib/utils";

interface PropertiesPanelProps {
  element: ElementorElement | null;
  elements: ElementorElement[];
  onUpdateElement: (id: string, updates: Partial<ElementSettings>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
}

interface SpacingValue {
  top: string;
  right: string;
  bottom: string;
  left: string;
  unit: string;
  isLinked: boolean;
}

export function PropertiesPanel({
  element,
  elements,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState("content");
  const [localSettings, setLocalSettings] = useState<ElementSettings>({});

  useEffect(() => {
    if (element) {
      setLocalSettings(element.settings);
    }
  }, [element]);

  if (!element) {
    return (
      <Card className="h-full border-none shadow-none bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-20 border-2 border-dashed rounded-lg">
            Select an element to edit
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = (key: string, value: unknown) => {
    const updates = { [key]: value };
    setLocalSettings((prev) => ({ ...prev, ...updates }));
    onUpdateElement(element.id, updates);
  };

  const renderSpacingControl = (label: string, key: string) => {
    const spacing = (localSettings[key] as SpacingValue) || {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
      unit: "px",
      isLinked: true,
    };

    const updateSpacing = (field: keyof SpacingValue, value: any) => {
      let newSpacing = { ...spacing, [field]: value };
      if (spacing.isLinked && (field === "top" || field === "right" || field === "bottom" || field === "left")) {
        newSpacing = { ...newSpacing, top: value, right: value, bottom: value, left: value };
      }
      handleUpdate(key, newSpacing);
    };

    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
        <div className="grid grid-cols-4 gap-1">
          {["top", "right", "bottom", "left"].map((dir) => (
            <div key={dir} className="space-y-1">
              <Input
                className="h-8 px-1 text-center text-xs"
                value={spacing[dir as keyof SpacingValue] as string}
                onChange={(e) => updateSpacing(dir as keyof SpacingValue, e.target.value)}
              />
              <div className="text-[10px] text-center text-muted-foreground uppercase">{dir}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContentTab = () => {
    const widgetType = element.widgetType;

    switch (widgetType) {
      case "heading":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={(localSettings.title as string) || ""}
                onChange={(e) => handleUpdate("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header_size">HTML Tag</Label>
              <Select
                value={(localSettings.header_size as string) || "h2"}
                onValueChange={(value) => handleUpdate("header_size", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "text-editor":
        return (
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={(localSettings.content as string) || ""}
              onChange={(e) => handleUpdate("content", e.target.value)}
              className="min-h-[200px]"
            />
          </div>
        );

      case "image":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={((localSettings.image as any)?.url as string) || ""}
                onChange={(e) => handleUpdate("image", { url: e.target.value })}
              />
            </div>
          </div>
        );

      case "button":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Text</Label>
              <Input
                id="text"
                value={(localSettings.text as string) || ""}
                onChange={(e) => handleUpdate("text", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Link URL</Label>
              <Input
                id="url"
                value={((localSettings.link as any)?.url as string) || ""}
                onChange={(e) => handleUpdate("link", { ...((localSettings.link as any) || {}), url: e.target.value })}
              />
            </div>
          </div>
        );

      case "accordion":
      case "tabs":
      case "toggle":
        const items = (localSettings.items as any[]) || [];
        return (
          <div className="space-y-4">
            <Label>Items</Label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/20 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newItems = [...items];
                      newItems.splice(index, 1);
                      handleUpdate("items", newItems);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Input
                    className="h-8 text-xs"
                    value={item.title}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, title: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                    placeholder="Title"
                  />
                  <Textarea
                    className="text-xs min-h-[60px]"
                    value={item.content}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = { ...item, content: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                    placeholder="Content"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => {
                  handleUpdate("items", [...items, { title: "New Item", content: "New content" }]);
                }}
              >
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
          </div>
        );

      case "alert":
        return (
          <div className="space-y-4">
             <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={(localSettings.type as string) || "info"}
                onValueChange={(value) => handleUpdate("type", value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="danger">Danger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={(localSettings.title as string) || ""}
                onChange={(e) => handleUpdate("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={(localSettings.description as string) || ""}
                onChange={(e) => handleUpdate("description", e.target.value)}
              />
            </div>
          </div>
        );

      case "html":
        return (
          <div className="space-y-2">
            <Label>HTML Code</Label>
            <Textarea
              className="font-mono min-h-[200px]"
              value={(localSettings.html as string) || ""}
              onChange={(e) => handleUpdate("html", e.target.value)}
            />
          </div>
        );

      case "progress-bar":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={(localSettings.title as string) || ""}
                onChange={(e) => handleUpdate("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={(localSettings.percent as number) || 0}
                onChange={(e) => handleUpdate("percent", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2 flex items-center justify-between">
              <Label>Display Percentage</Label>
              <Switch
                checked={(localSettings.display_percentage as boolean) !== false}
                onCheckedChange={(checked) => handleUpdate("display_percentage", checked)}
              />
            </div>
          </div>
        );

      case "counter":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Starting Number</Label>
              <Input
                type="number"
                value={(localSettings.starting_number as number) || 0}
                onChange={(e) => handleUpdate("starting_number", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Ending Number</Label>
              <Input
                type="number"
                value={(localSettings.ending_number as number) || 0}
                onChange={(e) => handleUpdate("ending_number", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (ms)</Label>
              <Input
                type="number"
                value={(localSettings.duration as number) || 2000}
                onChange={(e) => handleUpdate("duration", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={(localSettings.title as string) || ""}
                onChange={(e) => handleUpdate("title", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Prefix</Label>
                <Input
                  value={(localSettings.prefix as string) || ""}
                  onChange={(e) => handleUpdate("prefix", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Suffix</Label>
                <Input
                  value={(localSettings.suffix as string) || ""}
                  onChange={(e) => handleUpdate("suffix", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case "testimonials":
        const testimonialItems = (localSettings.items as any[]) || [];
        return (
          <div className="space-y-4">
            <Label>Testimonials</Label>
            <div className="space-y-2">
              {testimonialItems.map((item, index) => (
                <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/20 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newItems = [...testimonialItems];
                      newItems.splice(index, 1);
                      handleUpdate("items", newItems);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Input
                    placeholder="Name"
                    value={item.name || ""}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, name: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                  <Input
                    placeholder="Title/Company"
                    value={item.title || ""}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, title: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                  <Textarea
                    placeholder="Testimonial content"
                    value={item.content || ""}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, content: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                  <Input
                    placeholder="Image URL"
                    value={item.image || ""}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, image: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Rating (1-5)"
                    min="1"
                    max="5"
                    value={item.rating || 5}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, rating: parseInt(e.target.value) };
                      handleUpdate("items", newItems);
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => {
                  handleUpdate("items", [
                    ...testimonialItems,
                    { name: "John Doe", title: "CEO", content: "Great service!", image: "", rating: 5 },
                  ]);
                }}
              >
                <Plus className="h-3 w-3" /> Add Testimonial
              </Button>
            </div>
          </div>
        );

      case "image-carousel":
        const carouselImages = (localSettings.images as any[]) || [];
        return (
          <div className="space-y-4">
            <Label>Images</Label>
            <div className="space-y-2">
              {carouselImages.map((img, index) => (
                <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/20 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newImages = [...carouselImages];
                      newImages.splice(index, 1);
                      handleUpdate("images", newImages);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Input
                    placeholder="Image URL"
                    value={img.url || ""}
                    onChange={(e) => {
                      const newImages = [...carouselImages];
                      newImages[index] = { ...img, url: e.target.value };
                      handleUpdate("images", newImages);
                    }}
                  />
                  <Input
                    placeholder="Alt text"
                    value={img.alt || ""}
                    onChange={(e) => {
                      const newImages = [...carouselImages];
                      newImages[index] = { ...img, alt: e.target.value };
                      handleUpdate("images", newImages);
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => {
                  handleUpdate("images", [
                    ...carouselImages,
                    { url: "https://via.placeholder.com/800x600", alt: "Image" },
                  ]);
                }}
              >
                <Plus className="h-3 w-3" /> Add Image
              </Button>
            </div>
          </div>
        );

      case "google-maps":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Address/Location</Label>
              <Input
                value={(localSettings.address as string) || ""}
                onChange={(e) => handleUpdate("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Zoom Level</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={(localSettings.zoom as number) || 12}
                onChange={(e) => handleUpdate("zoom", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Height (px)</Label>
              <Input
                type="number"
                value={(localSettings.height as number) || 400}
                onChange={(e) => handleUpdate("height", parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case "icon-list":
        const iconListItems = (localSettings.items as any[]) || [];
        return (
          <div className="space-y-4">
            <Label>List Items</Label>
            <div className="space-y-2">
              {iconListItems.map((item, index) => (
                <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/20 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newItems = [...iconListItems];
                      newItems.splice(index, 1);
                      handleUpdate("items", newItems);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Input
                    placeholder="Text"
                    value={item.text || ""}
                    onChange={(e) => {
                      const newItems = [...iconListItems];
                      newItems[index] = { ...item, text: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                  <Input
                    placeholder="Icon (emoji or text)"
                    value={item.icon || "✓"}
                    onChange={(e) => {
                      const newItems = [...iconListItems];
                      newItems[index] = { ...item, icon: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => {
                  handleUpdate("items", [...iconListItems, { text: "New item", icon: "✓" }]);
                }}
              >
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
          </div>
        );

      case "lottie":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lottie JSON URL</Label>
              <Input
                value={(localSettings.source_url as string) || ""}
                onChange={(e) => handleUpdate("source_url", e.target.value)}
                placeholder="https://assets.lottiefiles.com/..."
              />
            </div>
            <div className="space-y-2 flex items-center justify-between">
              <Label>Loop</Label>
              <Switch
                checked={(localSettings.loop as boolean) !== false}
                onCheckedChange={(checked) => handleUpdate("loop", checked)}
              />
            </div>
            <div className="space-y-2 flex items-center justify-between">
              <Label>Autoplay</Label>
              <Switch
                checked={(localSettings.autoplay as boolean) !== false}
                onCheckedChange={(checked) => handleUpdate("autoplay", checked)}
              />
            </div>
          </div>
        );

      case "social-icons":
        const socialItems = (localSettings.items as any[]) || [];
        return (
          <div className="space-y-4">
            <Label>Social Networks</Label>
            <div className="space-y-2">
              {socialItems.map((item, index) => (
                <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/20 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newItems = [...socialItems];
                      newItems.splice(index, 1);
                      handleUpdate("items", newItems);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Select
                    value={item.network || "facebook"}
                    onValueChange={(value) => {
                      const newItems = [...socialItems];
                      newItems[index] = { ...item, network: value };
                      handleUpdate("items", newItems);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="pinterest">Pinterest</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="URL"
                    value={item.url || ""}
                    onChange={(e) => {
                      const newItems = [...socialItems];
                      newItems[index] = { ...item, url: e.target.value };
                      handleUpdate("items", newItems);
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed"
                onClick={() => {
                  handleUpdate("items", [...socialItems, { network: "facebook", url: "#" }]);
                }}
              >
                <Plus className="h-3 w-3" /> Add Social Network
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Icon Shape</Label>
              <Select
                value={(localSettings.shape as string) || "square"}
                onValueChange={(value) => handleUpdate("shape", value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        if (element.elType === "column") {
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Column Width (%)</Label>
                <Input
                  type="number"
                  value={(localSettings._column_size as number) || 100}
                  onChange={(e) => handleUpdate("_column_size", parseInt(e.target.value))}
                />
              </div>
            </div>
          );
        }
        if (element.elType === "section") {
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Content Width</Label>
                <Select
                  value={(localSettings.layout as string) || "boxed"}
                  onValueChange={(v) => handleUpdate("layout", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boxed">Boxed</SelectItem>
                    <SelectItem value="full_width">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        }
        return <div className="text-sm text-muted-foreground">No content settings</div>;
    }
  };

  const renderStyleTab = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Alignment</Label>
          <div className="flex bg-muted p-1 rounded-md">
            {["left", "center", "right", "justify"].map((align) => (
              <Button
                key={align}
                variant={localSettings.align === align ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => handleUpdate("align", align)}
              >
                {align}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Text Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-12 h-8 p-1"
              value={(localSettings.color as string) || "#000000"}
              onChange={(e) => handleUpdate("color", e.target.value)}
            />
            <Input
              className="h-8 flex-1"
              value={(localSettings.color as string) || "#000000"}
              onChange={(e) => handleUpdate("color", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Background Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-12 h-8 p-1"
              value={(localSettings.background_color as string) || "#ffffff"}
              onChange={(e) => handleUpdate("background_color", e.target.value)}
            />
            <Input
              className="h-8 flex-1"
              value={(localSettings.background_color as string) || "#ffffff"}
              onChange={(e) => handleUpdate("background_color", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4" />
            <Label>Gradient Background</Label>
          </div>
          <div className="space-y-2 p-3 border rounded-md bg-muted/20">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Color 1</Label>
                <Input
                  type="color"
                  className="w-full h-8 p-1"
                  value={((localSettings.background_gradient as any)?.color1 as string) || "#6366f1"}
                  onChange={(e) => handleUpdate("background_gradient", {
                    ...((localSettings.background_gradient as any) || {}),
                    color1: e.target.value
                  })}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Color 2</Label>
                <Input
                  type="color"
                  className="w-full h-8 p-1"
                  value={((localSettings.background_gradient as any)?.color2 as string) || "#8b5cf6"}
                  onChange={(e) => handleUpdate("background_gradient", {
                    ...((localSettings.background_gradient as any) || {}),
                    color2: e.target.value
                  })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Angle (deg)</Label>
              <Input
                type="number"
                min="0"
                max="360"
                className="h-8"
                value={((localSettings.background_gradient as any)?.angle as number) || 45}
                onChange={(e) => handleUpdate("background_gradient", {
                  ...((localSettings.background_gradient as any) || {}),
                  angle: parseInt(e.target.value)
                })}
              />
            </div>
          </div>
        </div>

        {renderSpacingControl("Margin", "margin")}
        {renderSpacingControl("Padding", "padding")}
      </div>
    );
  };

  const renderAdvancedTab = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Layout</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">CSS ID</Label>
              <Input
                value={(localSettings._element_id as string) || ""}
                onChange={(e) => handleUpdate("_element_id", e.target.value)}
                placeholder="element-id"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">CSS Classes</Label>
              <Input
                value={(localSettings._css_classes as string) || ""}
                onChange={(e) => handleUpdate("_css_classes", e.target.value)}
                placeholder="class1 class2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Z-Index</Label>
              <Input
                type="number"
                value={(localSettings.z_index as number) || ""}
                onChange={(e) => handleUpdate("z_index", parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold">Border</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Style</Label>
              <Select
                value={(localSettings.border_style as string) || "none"}
                onValueChange={(value) => handleUpdate("border_style", value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-12 h-8 p-1"
                  value={(localSettings.border_color as string) || "#000000"}
                  onChange={(e) => handleUpdate("border_color", e.target.value)}
                />
                <Input
                  className="h-8 flex-1"
                  value={(localSettings.border_color as string) || "#000000"}
                  onChange={(e) => handleUpdate("border_color", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Width (px)</Label>
              <div className="grid grid-cols-4 gap-1">
                {["top", "right", "bottom", "left"].map((side) => (
                  <Input
                    key={side}
                    type="number"
                    className="h-8 px-1 text-center text-xs"
                    placeholder="0"
                    value={((localSettings.border_width as any)?.[side] as string) || ""}
                    onChange={(e) => handleUpdate("border_width", {
                      ...((localSettings.border_width as any) || {}),
                      [side]: e.target.value
                    })}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Radius (px)</Label>
              <div className="grid grid-cols-4 gap-1">
                {["top", "right", "bottom", "left"].map((side) => (
                  <Input
                    key={side}
                    type="number"
                    className="h-8 px-1 text-center text-xs"
                    placeholder="0"
                    value={((localSettings.border_radius as any)?.[side] as string) || ""}
                    onChange={(e) => handleUpdate("border_radius", {
                      ...((localSettings.border_radius as any) || {}),
                      [side]: e.target.value
                    })}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Box Shadow</Label>
              <Input
                value={(localSettings.box_shadow as string) || ""}
                onChange={(e) => handleUpdate("box_shadow", e.target.value)}
                placeholder="0px 4px 6px rgba(0,0,0,0.1)"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold">Responsive</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hide on Desktop</Label>
              <Switch
                checked={(localSettings.hide_desktop as boolean) || false}
                onCheckedChange={(checked) => handleUpdate("hide_desktop", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hide on Tablet</Label>
              <Switch
                checked={(localSettings.hide_tablet as boolean) || false}
                onCheckedChange={(checked) => handleUpdate("hide_tablet", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hide on Mobile</Label>
              <Switch
                checked={(localSettings.hide_mobile as boolean) || false}
                onCheckedChange={(checked) => handleUpdate("hide_mobile", checked)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold">Motion Effects</Label>
          <div className="space-y-2">
            <Label className="text-xs">Entrance Animation</Label>
            <Select
              value={(localSettings.entrance_animation as string) || "none"}
              onValueChange={(value) => handleUpdate("entrance_animation", value)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fadeIn">Fade In</SelectItem>
                <SelectItem value="fadeInUp">Fade In Up</SelectItem>
                <SelectItem value="fadeInDown">Fade In Down</SelectItem>
                <SelectItem value="fadeInLeft">Fade In Left</SelectItem>
                <SelectItem value="fadeInRight">Fade In Right</SelectItem>
                <SelectItem value="slideInUp">Slide In Up</SelectItem>
                <SelectItem value="slideInDown">Slide In Down</SelectItem>
                <SelectItem value="slideInLeft">Slide In Left</SelectItem>
                <SelectItem value="slideInRight">Slide In Right</SelectItem>
                <SelectItem value="zoomIn">Zoom In</SelectItem>
                <SelectItem value="bounceIn">Bounce In</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full border-l rounded-none flex flex-col">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] uppercase">
              {element.elType}
            </span>
            {element.widgetType || element.elType}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicateElement(element.id)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteElement(element.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 px-4">
          <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4">Content</TabsTrigger>
          <TabsTrigger value="style" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4">Style</TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4">Advanced</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <TabsContent value="content" className="mt-0 outline-none">
                {renderContentTab()}
              </TabsContent>
              <TabsContent value="style" className="mt-0 outline-none">
                {renderStyleTab()}
              </TabsContent>
              <TabsContent value="advanced" className="mt-0 outline-none">
                {renderAdvancedTab()}
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </Card>
  );
}
