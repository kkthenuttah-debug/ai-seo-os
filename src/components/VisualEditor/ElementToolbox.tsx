import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Type,
  AlignLeft,
  MousePointer2,
  Image,
  Space,
  Minus,
  Video,
  Star,
  Code,
  Square,
  Columns,
} from "lucide-react";
import type { WidgetType } from "@/types/elementor";

interface ElementToolboxProps {
  onAddSection: () => void;
  onAddWidget: (widgetType: WidgetType, parentId: string | null) => void;
  selectedElementId: string | null;
}

interface WidgetDefinition {
  type: WidgetType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const widgets: WidgetDefinition[] = [
  {
    type: "heading",
    label: "Heading",
    icon: <Type className="h-4 w-4" />,
    description: "Add a heading (H1-H6)",
  },
  {
    type: "text-editor",
    label: "Text Editor",
    icon: <AlignLeft className="h-4 w-4" />,
    description: "Rich text content",
  },
  {
    type: "button",
    label: "Button",
    icon: <MousePointer2 className="h-4 w-4" />,
    description: "Call-to-action button",
  },
  {
    type: "image",
    label: "Image",
    icon: <Image className="h-4 w-4" />,
    description: "Add an image",
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: <Space className="h-4 w-4" />,
    description: "Vertical spacing",
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus className="h-4 w-4" />,
    description: "Horizontal line",
  },
  {
    type: "video",
    label: "Video",
    icon: <Video className="h-4 w-4" />,
    description: "Embed video",
  },
  {
    type: "star-rating",
    label: "Star Rating",
    icon: <Star className="h-4 w-4" />,
    description: "Display ratings",
  },
  {
    type: "html",
    label: "HTML",
    icon: <Code className="h-4 w-4" />,
    description: "Custom HTML code",
  },
];

export function ElementToolbox({
  onAddSection,
  onAddWidget,
  selectedElementId,
}: ElementToolboxProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Elements</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {/* Layout Elements */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                Layout
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-auto py-2"
                  onClick={onAddSection}
                >
                  <Square className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Section</div>
                    <div className="text-xs text-muted-foreground">
                      Container for columns
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Widget Elements */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                Widgets
              </h3>
              <div className="space-y-1">
                {widgets.map((widget) => (
                  <Button
                    key={widget.type}
                    variant="ghost"
                    className="w-full justify-start gap-2 h-auto py-2"
                    onClick={() => onAddWidget(widget.type, selectedElementId)}
                    disabled={!selectedElementId}
                  >
                    {widget.icon}
                    <div className="text-left">
                      <div className="font-medium text-sm">{widget.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {widget.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {selectedElementId && (
              <div className="px-2 py-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                <p className="font-medium mb-1">💡 Tip</p>
                <p className="text-muted-foreground">
                  Select a column to add widgets. Sections contain columns, and
                  columns contain widgets.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
