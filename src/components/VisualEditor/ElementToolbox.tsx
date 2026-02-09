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
  HelpCircle,
  Layout,
  Layers,
  List,
  PlusSquare,
  AlertCircle,
} from "lucide-react";
import type { WidgetType } from "@/types/elementor";
import { DraggableToolboxItem } from "./DraggableToolboxItem";

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
    type: "image",
    label: "Image",
    icon: <Image className="h-4 w-4" />,
    description: "Add an image",
  },
  {
    type: "video",
    label: "Video",
    icon: <Video className="h-4 w-4" />,
    description: "Embed video",
  },
  {
    type: "button",
    label: "Button",
    icon: <MousePointer2 className="h-4 w-4" />,
    description: "Call-to-action button",
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus className="h-4 w-4" />,
    description: "Horizontal line",
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: <Space className="h-4 w-4" />,
    description: "Vertical spacing",
  },
  {
    type: "icon",
    label: "Icon",
    icon: <HelpCircle className="h-4 w-4" />,
    description: "Simple icon",
  },
  {
    type: "icon-box",
    label: "Icon Box",
    icon: <Layout className="h-4 w-4" />,
    description: "Icon with text",
  },
  {
    type: "image-box",
    label: "Image Box",
    icon: <Layers className="h-4 w-4" />,
    description: "Image with text",
  },
  {
    type: "star-rating",
    label: "Star Rating",
    icon: <Star className="h-4 w-4" />,
    description: "Display ratings",
  },
  {
    type: "accordion",
    label: "Accordion",
    icon: <List className="h-4 w-4" />,
    description: "Collapsible items",
  },
  {
    type: "tabs",
    label: "Tabs",
    icon: <Layout className="h-4 w-4" />,
    description: "Tabbed content",
  },
  {
    type: "toggle",
    label: "Toggle",
    icon: <PlusSquare className="h-4 w-4" />,
    description: "Single collapsible",
  },
  {
    type: "alert",
    label: "Alert",
    icon: <AlertCircle className="h-4 w-4" />,
    description: "Announcement box",
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
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {/* Layout Elements */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                Layout
              </h3>
              <div className="space-y-1">
                <DraggableToolboxItem
                  type="section"
                  label="Section"
                  icon={<Square className="h-4 w-4" />}
                  description="Container for columns"
                />
              </div>
            </div>

            {/* Widget Elements */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                Widgets
              </h3>
              <div className="space-y-1">
                {widgets.map((widget) => (
                  <DraggableToolboxItem
                    key={widget.type}
                    type={widget.type}
                    label={widget.label}
                    icon={widget.icon}
                    description={widget.description}
                  />
                ))}
              </div>
            </div>

            <div className="px-2 py-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
              <p className="font-medium mb-1">💡 Tip</p>
              <p className="text-muted-foreground">
                Drag and drop elements onto the canvas. Sections can contain columns, and columns contain widgets.
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

