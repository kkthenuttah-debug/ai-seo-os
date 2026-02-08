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
  Code,
} from "lucide-react";

interface ElementRendererProps {
  element: ElementorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  children?: React.ReactNode;
}

export function ElementRenderer({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  children,
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
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Section
          </div>
        )}
        <div className="flex gap-2">{children}</div>
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
          <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded">
            Column ({columnSize}%)
          </div>
        )}
        <div className="space-y-2">{children}</div>
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
}

function WidgetRenderer({
  element,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
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
          <HeaderTag className="font-bold">
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
            className={`flex ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}
          >
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {settings.text as string}
            </button>
          </div>
        );

      case "image":
        return (
          <img
            src={
              (settings.image as { url: string })?.url ||
              "https://via.placeholder.com/400x300"
            }
            alt="Widget"
            className="max-w-full h-auto"
          />
        );

      case "spacer":
        const spaceSize = (settings.space as { size: number })?.size || 50;
        return <div style={{ height: `${spaceSize}px` }} />;

      case "divider":
        return <hr className="border-gray-300" />;

      case "video":
        return (
          <div className="aspect-video bg-gray-200 flex items-center justify-center">
            <Video className="h-12 w-12 text-gray-400" />
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-100 text-sm text-gray-600">
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
        <div className="absolute -top-6 left-0 bg-purple-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          {getWidgetIcon()}
          {widgetType}
        </div>
      )}
      {renderWidgetContent()}
    </div>
  );
}
