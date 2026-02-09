import { type ElementorElement } from "@/types/elementor";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableElement } from "./SortableElement";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface RecursiveElementTreeProps {
  elements: ElementorElement[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string) => void;
  onHoverElement: (id: string | null) => void;
  parentId?: string;
}

export function RecursiveElementTree({
  elements,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  parentId = "root",
}: RecursiveElementTreeProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: parentId,
    data: {
      type: "container",
      parentId,
    },
  });

  const renderElement = (element: ElementorElement): JSX.Element => {
    const isSelected = element.id === selectedElementId;
    const isHovered = element.id === hoveredElementId;

    return (
      <SortableElement
        key={element.id}
        element={element}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={onSelectElement}
        onHover={onHoverElement}
      >
        {element.elements && element.elements.length > 0 ? (
          <RecursiveElementTree
            elements={element.elements}
            selectedElementId={selectedElementId}
            hoveredElementId={hoveredElementId}
            onSelectElement={onSelectElement}
            onHoverElement={onHoverElement}
            parentId={element.id}
          />
        ) : (
          <div className="min-h-[40px] flex items-center justify-center border-2 border-dashed border-muted rounded-md text-xs text-muted-foreground">
            Drop elements here
          </div>
        )}
      </SortableElement>
    );
  };

  if (elements.length === 0 && parentId === "root") {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg transition-colors",
          isOver && "bg-primary/5 border-primary"
        )}
      >
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No elements yet</p>
          <p className="text-sm">Drag a section here to get started</p>
        </div>
      </div>
    );
  }

  // Determine strategy based on parent type (simple heuristic)
  // Sections (root) are vertical
  // Columns (inside section) are horizontal
  // Widgets (inside column) are vertical
  
  // We don't easily know the parent type here without passing it, 
  // but we can guess or just use vertical as default.
  // Actually, sections are always vertical, columns inside sections are horizontal,
  // widgets inside columns are vertical.
  
  const isHorizontal = false; // We can improve this if needed

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full h-full min-h-[40px]",
        parentId === "root" ? "space-y-4" : "flex flex-wrap gap-2",
        isOver && "bg-primary/5"
      )}
    >
      <SortableContext
        items={elements.map((e) => e.id)}
        strategy={isHorizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {elements.map(renderElement)}
      </SortableContext>
    </div>
  );
}

