import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WidgetType } from "@/types/elementor";

interface DraggableToolboxItemProps {
  type: WidgetType | "section";
  label: string;
  icon: React.ReactNode;
  description: string;
  disabled?: boolean;
}

export function DraggableToolboxItem({
  type,
  label,
  icon,
  description,
  disabled,
}: DraggableToolboxItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: {
      type: "toolbox-item",
      itemType: type,
    },
    disabled,
  });

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      className={cn(
        "w-full justify-start gap-2 h-auto py-2 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 border-2 border-primary",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      {...listeners}
      {...attributes}
      disabled={disabled}
    >
      {icon}
      <div className="text-left">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </Button>
  );
}
