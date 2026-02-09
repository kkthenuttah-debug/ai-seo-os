import { type ElementorElement } from "@/types/elementor";
import { cn } from "@/lib/utils";
import {
  Type,
  AlignLeft,
  Image,
  Space,
  Minus,
  Video,
  Star,
  GripVertical,
  ChevronDown,
  Layout,
  List,
  AlertCircle,
  PlusSquare,
  HelpCircle,
  Layers,
} from "lucide-react";

interface ElementRendererProps {
  element: ElementorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  children?: React.ReactNode;
  dragHandleProps?: any;
}

export function ElementRenderer({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  children,
  dragHandleProps,
}: ElementRendererProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element.id);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHover(element.id);
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  if (element.elType === "section") {
    return (
      <div
        data-element-id={element.id}
        data-element-type="section"
        className={cn(
          "relative border-2 border-dashed border-transparent transition-all",
          "min-h-[100px] p-4 mb-4",
          isSelected && "border-blue-500 bg-blue-50/10",
          isHovered && !isSelected && "border-blue-300 bg-blue-50/5",
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isSelected && (
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 z-10">
            <div {...dragHandleProps} className="cursor-grab">
              <GripVertical className="h-3 w-3" />
            </div>
            Section
          </div>
        )}
        <div className="flex gap-2 w-full">{children}</div>
      </div>
    );
  }

  if (element.elType === "column") {
    const columnSize = element.settings._column_size || 100;
    return (
      <div
        data-element-id={element.id}
        data-element-type="column"
        className={cn(
          "relative border-2 border-dashed border-transparent transition-all",
          "min-h-[80px] p-3 flex-1",
          isSelected && "border-green-500 bg-green-50/10",
          isHovered && !isSelected && "border-green-300 bg-green-50/5",
        )}
        style={{ flexBasis: `${columnSize}%` }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isSelected && (
          <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 z-10">
            <div {...dragHandleProps} className="cursor-grab">
              <GripVertical className="h-3 w-3" />
            </div>
            Column ({columnSize}%)
          </div>
        )}
        <div className="space-y-2 w-full h-full">{children}</div>
      </div>
    );
  }

  if (element.elType === "widget") {
    return (
      <WidgetRenderer
        element={element}
        isSelected={isSelected}
        isHovered={isHovered}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        dragHandleProps={dragHandleProps}
      />
    );
  }

  return null;
}

interface WidgetRendererProps {
  element: ElementorElement;
  isSelected: boolean;
  isHovered: boolean;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  dragHandleProps?: any;
}

function WidgetRenderer({
  element,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  dragHandleProps,
}: WidgetRendererProps) {
  const widgetType = element.widgetType || "unknown";
  const settings = element.settings;

  const getWidgetIcon = () => {
    switch (widgetType) {
      case "heading":
        return <Type className="h-4 w-4" />;
      case "text-editor":
        return <AlignLeft className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "spacer":
        return <Space className="h-4 w-4" />;
      case "divider":
        return <Minus className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "star-rating":
        return <Star className="h-4 w-4" />;
      case "icon":
        return <HelpCircle className="h-4 w-4" />;
      case "icon-box":
        return <Layout className="h-4 w-4" />;
      case "image-box":
        return <Layers className="h-4 w-4" />;
      case "accordion":
        return <List className="h-4 w-4" />;
      case "tabs":
        return <Layout className="h-4 w-4" />;
      case "toggle":
        return <PlusSquare className="h-4 w-4" />;
      case "alert":
        return <AlertCircle className="h-4 w-4" />;
      case "html":
        return <Code className="h-4 w-4" />;
      default:
        return <AlignLeft className="h-4 w-4" />;
    }
  };

  const renderWidgetContent = () => {
    switch (widgetType) {
      case "heading":
        const HeaderTag =
          (settings.header_size as keyof JSX.IntrinsicElements) || "h2";
        return (
          <HeaderTag
            className={cn(
              "font-bold",
              settings.align === "center" && "text-center",
              settings.align === "right" && "text-right",
            )}
            style={{ color: settings.color as string }}
          >
            {settings.title as string}
          </HeaderTag>
        );

      case "text-editor":
        return (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: settings.content as string }}
          />
        );

      case "button":
        const align = settings.align as string;
        return (
          <div
            className={cn(
              "flex",
              align === "center"
                ? "justify-center"
                : align === "right"
                  ? "justify-end"
                  : "justify-start",
            )}
          >
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {settings.text as string}
            </button>
          </div>
        );

      case "image":
        return (
          <div
            className={cn(
              "flex",
              settings.align === "center"
                ? "justify-center"
                : settings.align === "right"
                  ? "justify-end"
                  : "justify-start",
            )}
          >
            <img
              src={
                (settings.image as { url: string })?.url ||
                "https://via.placeholder.com/400x300"
              }
              alt="Widget"
              className="max-w-full h-auto rounded shadow-sm"
            />
          </div>
        );

      case "spacer":
        const spaceSize = (settings.space as { size: number })?.size || 50;
        return <div style={{ height: `${spaceSize}px` }} />;

      case "divider":
        return (
          <hr
            className="w-full my-4"
            style={{
              borderColor: settings.color as string,
              borderTopWidth: (settings.weight as { size: number })?.size || 1,
              borderStyle: (settings.style as string) || "solid",
            }}
          />
        );

      case "video":
        return (
          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
            <Video className="h-12 w-12 text-gray-400" />
          </div>
        );

      case "icon":
        return (
          <div
            className={cn(
              "flex",
              settings.align === "center"
                ? "justify-center"
                : settings.align === "right"
                  ? "justify-end"
                  : "justify-start",
            )}
          >
            <HelpCircle
              className="h-12 w-12"
              style={{ color: settings.color as string }}
            />
          </div>
        );

      case "icon-box":
        return (
          <div className="flex flex-col items-center text-center p-4 border rounded">
            <Layout
              className="h-8 w-8 mb-2"
              style={{ color: settings.color as string }}
            />
            <h3 className="font-bold">{settings.title as string}</h3>
            <p className="text-sm text-muted-foreground">
              {settings.description as string}
            </p>
          </div>
        );

      case "image-box":
        return (
          <div className="flex flex-col items-center text-center p-4 border rounded">
            <img
              src={
                (settings.image as { url: string })?.url ||
                "https://via.placeholder.com/150"
              }
              alt="Box"
              className="w-full h-32 object-cover rounded mb-2"
            />
            <h3 className="font-bold">{settings.title as string}</h3>
            <p className="text-sm text-muted-foreground">
              {settings.description as string}
            </p>
          </div>
        );

      case "star-rating":
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i <= (settings.rating as number)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300",
                )}
              />
            ))}
          </div>
        );

      case "accordion":
      case "tabs":
      case "toggle":
        const items = (settings.items as any[]) || [];
        return (
          <div className="border rounded divide-y">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 flex justify-between items-center">
                <span className="font-medium">{item.title}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No items added
              </div>
            )}
          </div>
        );

      case "alert":
        return (
          <div
            className={cn(
              "p-4 rounded-lg border flex gap-3",
              settings.type === "info" && "bg-blue-50 border-blue-200 text-blue-800",
              settings.type === "success" && "bg-green-50 border-green-200 text-green-800",
              settings.type === "warning" && "bg-yellow-50 border-yellow-200 text-yellow-800",
              settings.type === "danger" && "bg-red-50 border-red-200 text-red-800",
            )}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <div className="font-bold">{settings.title as string}</div>
              <div className="text-sm">{settings.description as string}</div>
            </div>
          </div>
        );

      case "html":
        return (
          <div className="p-4 bg-muted font-mono text-xs rounded border">
            {`<!-- Custom HTML -->`}
            <div className="mt-1 opacity-50 truncate">
              {settings.html as string}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-100 text-sm text-gray-600 rounded">
            Widget: {widgetType}
          </div>
        );
    }
  };

  return (
    <div
      data-element-id={element.id}
      data-element-type="widget"
      data-widget-type={widgetType}
      className={cn(
        "relative border-2 border-dashed border-transparent transition-all",
        "p-2 rounded cursor-pointer",
        isSelected && "border-purple-500 bg-purple-50/10",
        isHovered && !isSelected && "border-purple-300 bg-purple-50/5",
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <div className="absolute -top-6 left-0 bg-purple-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 z-10">
          <div {...dragHandleProps} className="cursor-grab">
            <GripVertical className="h-3 w-3" />
          </div>
          {widgetType}
        </div>
      )}
      {renderWidgetContent()}
    </div>
  );
}

