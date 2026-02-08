import { type ElementorElement } from "@/types/elementor";
import { ElementRenderer } from "./ElementRenderer";

interface RecursiveElementTreeProps {
  elements: ElementorElement[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string) => void;
  onHoverElement: (id: string | null) => void;
}

export function RecursiveElementTree({
  elements,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
}: RecursiveElementTreeProps) {
  const renderElement = (element: ElementorElement): JSX.Element => {
    const isSelected = element.id === selectedElementId;
    const isHovered = element.id === hoveredElementId;

    return (
      <ElementRenderer
        key={element.id}
        element={element}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={onSelectElement}
        onHover={onHoverElement}
      >
        {element.elements && element.elements.length > 0
          ? element.elements.map(renderElement)
          : null}
      </ElementRenderer>
    );
  };

  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No elements yet</p>
          <p className="text-sm">Add a section to get started</p>
        </div>
      </div>
    );
  }

  return <div className="space-y-4">{elements.map(renderElement)}</div>;
}
