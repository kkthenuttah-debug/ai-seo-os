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
import { Trash2, Copy, Plus, X } from "lucide-react";
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

        {renderSpacingControl("Margin", "margin")}
        {renderSpacingControl("Padding", "padding")}
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
                 <div className="text-sm text-muted-foreground italic">Advanced settings coming soon</div>
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </Card>
  );
}
