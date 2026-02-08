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
import { Trash2, Copy } from "lucide-react";
import type { ElementorElement, ElementSettings } from "@/types/elementor";
import { findElementById } from "@/lib/elementor-utils";

interface PropertiesPanelProps {
  element: ElementorElement | null;
  elements: ElementorElement[];
  onUpdateElement: (id: string, updates: Partial<ElementSettings>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
}

export function PropertiesPanel({
  element,
  elements,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}: PropertiesPanelProps) {
  const [localSettings, setLocalSettings] = useState<ElementSettings>({});

  useEffect(() => {
    if (element) {
      setLocalSettings(element.settings);
    }
  }, [element]);

  if (!element) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Select an element to edit its properties
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

  const renderWidgetProperties = () => {
    const widgetType = element.widgetType;

    switch (widgetType) {
      case "heading":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Text</Label>
              <Input
                id="title"
                value={(localSettings.title as string) || ""}
                onChange={(e) => handleUpdate("title", e.target.value)}
                placeholder="Enter heading text"
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
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                  <SelectItem value="h5">H5</SelectItem>
                  <SelectItem value="h6">H6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="align">Alignment</Label>
              <Select
                value={(localSettings.align as string) || "left"}
                onValueChange={(value) => handleUpdate("align", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "text-editor":
        return (
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={(localSettings.content as string) || ""}
              onChange={(e) => handleUpdate("content", e.target.value)}
              placeholder="Enter content (HTML supported)"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        );

      case "button":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="text">Button Text</Label>
              <Input
                id="text"
                value={(localSettings.text as string) || ""}
                onChange={(e) => handleUpdate("text", e.target.value)}
                placeholder="Click Here"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_url">Link URL</Label>
              <Input
                id="link_url"
                value={
                  ((localSettings.link as { url: string })?.url as string) || ""
                }
                onChange={(e) =>
                  handleUpdate("link", {
                    ...(localSettings.link as object),
                    url: e.target.value,
                  })
                }
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={(localSettings.size as string) || "md"}
                onValueChange={(value) => handleUpdate("size", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Extra Small</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "image":
        return (
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={
                ((localSettings.image as { url: string })?.url as string) || ""
              }
              onChange={(e) =>
                handleUpdate("image", {
                  ...(localSettings.image as object),
                  url: e.target.value,
                })
              }
              placeholder="https://example.com/image.jpg"
            />
          </div>
        );

      case "spacer":
        return (
          <div className="space-y-2">
            <Label htmlFor="space_size">Height (px)</Label>
            <Input
              id="space_size"
              type="number"
              value={
                ((localSettings.space as { size: number })?.size as number) ||
                50
              }
              onChange={(e) =>
                handleUpdate("space", {
                  size: parseInt(e.target.value) || 50,
                })
              }
              min="0"
              max="500"
            />
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No properties available for this widget type
          </div>
        );
    }
  };

  const renderColumnProperties = () => {
    return (
      <div className="space-y-2">
        <Label htmlFor="column_size">Width (%)</Label>
        <Input
          id="column_size"
          type="number"
          value={(localSettings._column_size as number) || 100}
          onChange={(e) =>
            handleUpdate("_column_size", parseInt(e.target.value) || 100)
          }
          min="10"
          max="100"
          step="5"
        />
      </div>
    );
  };

  const renderSectionProperties = () => {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="layout">Layout</Label>
          <Select
            value={(localSettings.layout as string) || "boxed"}
            onValueChange={(value) => handleUpdate("layout", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boxed">Boxed</SelectItem>
              <SelectItem value="full_width">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gap">Column Gap</Label>
          <Select
            value={(localSettings.gap as string) || "default"}
            onValueChange={(value) => handleUpdate("gap", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No Gap</SelectItem>
              <SelectItem value="narrow">Narrow</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="wide">Wide</SelectItem>
              <SelectItem value="wider">Wider</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    );
  };

  const getElementTypeLabel = () => {
    if (element.elType === "widget") return element.widgetType || "Widget";
    if (element.elType === "column") return "Column";
    return "Section";
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium">
          {getElementTypeLabel()}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicateElement(element.id)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteElement(element.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {element.elType === "section" && renderSectionProperties()}
            {element.elType === "column" && renderColumnProperties()}
            {element.elType === "widget" && renderWidgetProperties()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
