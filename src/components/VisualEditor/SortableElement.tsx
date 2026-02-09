import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ElementorElement } from "@/types/elementor";
import { ElementRenderer } from "./ElementRenderer";
import { cn } from "@/lib/utils";

interface SortableElementProps {
  element: ElementorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  children?: React.ReactNode;
}

export function SortableElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  children,
}: SortableElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: element.id,
    data: {
      type: "element",
      element,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "opacity-30 z-50",
      )}
    >
      <ElementRenderer
        element={element}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={onSelect}
        onHover={onHover}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </ElementRenderer>
    </div>
  );
}
