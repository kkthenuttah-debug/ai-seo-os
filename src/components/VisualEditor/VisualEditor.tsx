import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Undo,
  Redo,
  Save,
  Eye,
  Code,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DefaultAnnouncements,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  ElementorData,
  ElementorElement,
  ElementSettings,
  WidgetType,
} from "@/types/elementor";
import {
  createSection,
  createColumn,
  createWidget,
  findElementById,
  updateElement,
  deleteElement,
  duplicateElement,
  insertElement,
  moveElement,
  exportToJSON,
  importFromJSON,
  canAcceptChild,
} from "@/lib/elementor-utils";
import { ElementToolbox } from "./ElementToolbox";
import { PropertiesPanel } from "./PropertiesPanel";
import { RecursiveElementTree } from "./RecursiveElementTree";
import { ElementRenderer } from "./ElementRenderer";
import { useNotification } from "@/hooks/useNotification";

interface VisualEditorProps {
  initialData?: ElementorData;
  onSave: (data: ElementorData) => void;
  onPreview?: (data: ElementorData) => void;
}

const MAX_HISTORY = 50;

export function VisualEditor({
  initialData,
  onSave,
  onPreview,
}: VisualEditorProps) {
  const [elements, setElements] = useState<ElementorElement[]>(
    initialData?.elements || [],
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [history, setHistory] = useState<ElementorElement[][]>([
    initialData?.elements || [],
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [activeElement, setActiveElement] = useState<ElementorElement | null>(
    null,
  );

  const { notifySuccess, showError } = useNotification();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addToHistory = useCallback(
    (newElements: ElementorElement[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newElements)));
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
          return newHistory;
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    },
    [historyIndex],
  );

  const updateElements = useCallback(
    (newElements: ElementorElement[]) => {
      setElements(newElements);
      addToHistory(newElements);
    },
    [addToHistory],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "element") {
      setActiveElement(active.data.current.element);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveElement(null);

    if (!over) return;

    // Case 1: Dragging a toolbox item
    if (active.data.current?.type === "toolbox-item") {
      const itemType = active.data.current.itemType;
      const targetId = over.id as string;

      if (itemType === "section") {
        const newSection = createSection();
        newSection.elements = [createColumn(100)];
        
        if (targetId === "root") {
          updateElements([...elements, newSection]);
        } else {
          // Find where it was dropped and insert after
          const newElements = insertElement(elements, newSection, null);
          updateElements(newElements);
        }
        notifySuccess("Section added");
      } else {
        // Adding a widget
        const widgetType = itemType as WidgetType;
        const targetContainer = over.data.current?.parentId || targetId;
        
        const parent = findElementById(elements, targetContainer);
        if (parent && canAcceptChild(parent.elType, "widget")) {
          const widget = createWidget(widgetType);
          const newElements = insertElement(elements, widget, targetContainer);
          updateElements(newElements);
          setSelectedElementId(widget.id);
          notifySuccess(`${widgetType} widget added`);
        } else {
          showError("Widgets can only be added to columns");
        }
      }
      return;
    }

    // Case 2: Moving an existing element
    if (active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      // Handle reordering sections (root elements)
      const activeIndex = elements.findIndex((e) => e.id === activeId);
      const overIndex = elements.findIndex((e) => e.id === overId);

      if (activeIndex !== -1 && overIndex !== -1) {
        updateElements(arrayMove(elements, activeIndex, overIndex));
      } else {
        // Move element to a new container or new position within container
        const targetContainerId = over.data.current?.parentId || overId;
        const newElements = moveElement(elements, activeId, targetContainerId, -1);
        updateElements(newElements);
      }
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleAddSection = () => {
    const section = createSection();
    const column = createColumn(100);
    section.elements = [column];
    updateElements([...elements, section]);
    notifySuccess("Section added");
  };

  const handleAddWidget = (widgetType: WidgetType, parentId: string | null) => {
    if (!parentId) {
      showError("Please select a column first");
      return;
    }

    const parent = findElementById(elements, parentId);
    if (!parent) {
      showError("Parent element not found");
      return;
    }

    if (!canAcceptChild(parent.elType, "widget")) {
      showError("Widgets can only be added to columns");
      return;
    }

    const widget = createWidget(widgetType);
    const newElements = insertElement(elements, widget, parentId);
    updateElements(newElements);
    setSelectedElementId(widget.id);
    notifySuccess(`${widgetType} widget added`);
  };

  const handleUpdateElement = (
    id: string,
    updates: Partial<ElementSettings>,
  ) => {
    const newElements = updateElement(elements, id, updates);
    updateElements(newElements);
  };

  const handleDeleteElement = (id: string) => {
    const newElements = deleteElement(elements, id);
    updateElements(newElements);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    notifySuccess("Element deleted");
  };

  const handleDuplicateElement = (id: string) => {
    const element = findElementById(elements, id);
    if (!element) return;

    const duplicated = duplicateElement(element);
    const newElements = insertElement(elements, duplicated, null);
    updateElements(newElements);
    setSelectedElementId(duplicated.id);
    notifySuccess("Element duplicated");
  };

  const handleSave = () => {
    const data: ElementorData = {
      version: "3.18.0",
      elements,
    };
    onSave(data);
    notifySuccess("Page saved successfully");
  };

  const handlePreview = () => {
    const data: ElementorData = {
      version: "3.18.0",
      elements,
    };
    if (onPreview) {
      onPreview(data);
    } else {
      notifySuccess("Preview feature coming soon");
    }
  };

  const handleExport = () => {
    const data: ElementorData = {
      version: "3.18.0",
      elements,
    };
    const json = exportToJSON(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elementor-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notifySuccess("Layout exported");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            const data = importFromJSON(json);
            if (data) {
              updateElements(data.elements);
              notifySuccess("Layout imported");
            } else {
              showError("Invalid JSON format");
            }
          } catch (err) {
            showError("Failed to import layout");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all elements?")) {
      updateElements([]);
      setSelectedElementId(null);
      notifySuccess("Layout cleared");
    }
  };

  const selectedElement = selectedElementId
    ? findElementById(elements, selectedElementId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <Card className="mb-4 border-none shadow-sm bg-muted/50">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex === 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
              >
                <Code className="h-4 w-4 mr-1" />
                {showCode ? "Visual" : "Code"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={elements.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </Card>

        {/* Editor Layout */}
        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Toolbox - Left */}
          <div className="w-72 flex-shrink-0">
            <ElementToolbox
              onAddSection={handleAddSection}
              onAddWidget={handleAddWidget}
              selectedElementId={selectedElementId}
            />
          </div>

          {/* Canvas - Center */}
          <div className="flex-1 overflow-auto bg-muted/30 rounded-lg border border-dashed">
            <div className="p-8 min-h-full max-w-5xl mx-auto">
              <Card className="p-8 shadow-lg min-h-[800px] bg-white dark:bg-zinc-950">
                {showCode ? (
                  <div className="font-mono text-sm">
                    <pre className="bg-muted p-4 rounded overflow-auto">
                      {exportToJSON({ version: "3.18.0", elements })}
                    </pre>
                  </div>
                ) : (
                  <RecursiveElementTree
                    elements={elements}
                    selectedElementId={selectedElementId}
                    hoveredElementId={hoveredElementId}
                    onSelectElement={setSelectedElementId}
                    onHoverElement={setHoveredElementId}
                  />
                )}
              </Card>
            </div>
          </div>

          {/* Properties Panel - Right */}
          <div className="w-80 flex-shrink-0">
            <PropertiesPanel
              element={selectedElement}
              elements={elements}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
            />
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeElement ? (
          <div className="opacity-80 pointer-events-none scale-95 transition-transform">
            <ElementRenderer
              element={activeElement}
              isSelected={false}
              isHovered={false}
              onSelect={() => {}}
              onHover={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

