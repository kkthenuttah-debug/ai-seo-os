import type {
  ElementorElement,
  ElementorData,
  ElementSettings,
  WidgetType,
} from "@/types/elementor";

export function generateId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createSection(
  settings: Partial<ElementSettings> = {},
): ElementorElement {
  return {
    id: generateId(),
    elType: "section",
    settings: {
      layout: "boxed",
      gap: "default",
      ...settings,
    },
    elements: [],
  };
}

export function createColumn(
  size: number = 100,
  settings: Partial<ElementSettings> = {},
): ElementorElement {
  return {
    id: generateId(),
    elType: "column",
    settings: {
      _column_size: size,
      ...settings,
    },
    elements: [],
  };
}

export function createWidget(
  widgetType: WidgetType,
  settings: Partial<ElementSettings> = {},
): ElementorElement {
  const defaultSettings = getDefaultWidgetSettings(widgetType);
  return {
    id: generateId(),
    elType: "widget",
    widgetType,
    settings: {
      ...defaultSettings,
      ...settings,
    },
  };
}

function getDefaultWidgetSettings(widgetType: WidgetType): ElementSettings {
  switch (widgetType) {
    case "heading":
      return {
        title: "Heading Text",
        header_size: "h2",
        align: "left",
      };
    case "text-editor":
      return {
        content: "<p>Enter your text here...</p>",
      };
    case "button":
      return {
        text: "Click Here",
        align: "left",
        size: "md",
        link: {
          url: "#",
          is_external: false,
          nofollow: false,
        },
      };
    case "image":
      return {
        image: {
          url: "https://via.placeholder.com/800x600",
        },
        align: "center",
      };
    case "spacer":
      return {
        space: {
          size: 50,
        },
      };
    case "divider":
      return {
        style: "solid",
        weight: {
          size: 1,
        },
        color: "#ddd",
      };
    case "video":
      return {
        video: {
          url: "https://www.youtube.com/watch?v=XHOmBV4js_E",
        },
      };
    case "icon":
      return {
        icon: "star",
        view: "default",
        shape: "circle",
      };
    case "icon-box":
      return {
        icon: "star",
        title: "This is the Heading",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        position: "top",
      };
    case "image-box":
      return {
        image: {
          url: "https://via.placeholder.com/800x600",
        },
        title: "This is the Heading",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        position: "top",
      };
    case "star-rating":
      return {
        rating: 5,
        scale: 5,
        title: "Rating",
      };
    case "accordion":
      return {
        items: [
          { title: "Accordion Item #1", content: "Item content 1" },
          { title: "Accordion Item #2", content: "Item content 2" },
        ],
      };
    case "tabs":
      return {
        items: [
          { title: "Tab #1", content: "Tab content 1" },
          { title: "Tab #2", content: "Tab content 2" },
        ],
      };
    case "toggle":
      return {
        items: [
          { title: "Toggle Item #1", content: "Toggle content 1" },
        ],
      };
    case "alert":
      return {
        type: "info",
        title: "This is an alert",
        description: "I am an alert box.",
      };
    case "html":
      return {
        html: '<div class="custom-html">Enter your HTML here</div>',
      };
    default:
      return {};
  }
}

export function findElementById(
  elements: ElementorElement[],
  id: string,
): ElementorElement | null {
  for (const element of elements) {
    if (element.id === id) {
      return element;
    }
    if (element.elements && element.elements.length > 0) {
      const found = findElementById(element.elements, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParentElement(
  elements: ElementorElement[],
  childId: string,
  parent: ElementorElement | null = null,
): ElementorElement | null {
  for (const element of elements) {
    if (element.elements) {
      const childIndex = element.elements.findIndex((e) => e.id === childId);
      if (childIndex !== -1) {
        return element;
      }
      const found = findParentElement(element.elements, childId, element);
      if (found) return found;
    }
  }
  return null;
}

export function updateElement(
  elements: ElementorElement[],
  id: string,
  updates: Partial<ElementSettings>,
): ElementorElement[] {
  return elements.map((element) => {
    if (element.id === id) {
      return {
        ...element,
        settings: {
          ...element.settings,
          ...updates,
        },
      };
    }
    if (element.elements && element.elements.length > 0) {
      return {
        ...element,
        elements: updateElement(element.elements, id, updates),
      };
    }
    return element;
  });
}

export function deleteElement(
  elements: ElementorElement[],
  id: string,
): ElementorElement[] {
  return elements
    .filter((element) => element.id !== id)
    .map((element) => {
      if (element.elements && element.elements.length > 0) {
        return {
          ...element,
          elements: deleteElement(element.elements, id),
        };
      }
      return element;
    });
}

export function duplicateElement(element: ElementorElement): ElementorElement {
  const newElement = {
    ...element,
    id: generateId(),
  };

  if (newElement.elements && newElement.elements.length > 0) {
    newElement.elements = newElement.elements.map(duplicateElement);
  }

  return newElement;
}

export function insertElement(
  elements: ElementorElement[],
  newElement: ElementorElement,
  parentId: string | null,
  targetIndex: number = -1,
): ElementorElement[] {
  if (parentId === null) {
    if (targetIndex === -1) {
      return [...elements, newElement];
    }
    const newElements = [...elements];
    newElements.splice(targetIndex, 0, newElement);
    return newElements;
  }

  return elements.map((element) => {
    if (element.id === parentId) {
      const children = element.elements || [];
      if (targetIndex === -1) {
        return {
          ...element,
          elements: [...children, newElement],
        };
      }
      const newChildren = [...children];
      newChildren.splice(targetIndex, 0, newElement);
      return {
        ...element,
        elements: newChildren,
      };
    }
    if (element.elements && element.elements.length > 0) {
      return {
        ...element,
        elements: insertElement(
          element.elements,
          newElement,
          parentId,
          targetIndex,
        ),
      };
    }
    return element;
  });
}

export function moveElement(
  elements: ElementorElement[],
  elementId: string,
  targetParentId: string | null,
  targetIndex: number,
): ElementorElement[] {
  const element = findElementById(elements, elementId);
  if (!element) return elements;

  const withoutElement = deleteElement(elements, elementId);
  return insertElement(withoutElement, element, targetParentId, targetIndex);
}

export function canAcceptChild(parentType: string, childType: string): boolean {
  if (parentType === "section" && childType === "column") return true;
  if (parentType === "column" && childType === "widget") return true;
  return false;
}

export function validateElementorData(data: unknown): data is ElementorData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.elements);
}

export function countElements(elements: ElementorElement[]): {
  sections: number;
  columns: number;
  widgets: number;
  widgetTypes: Record<string, number>;
} {
  let sections = 0;
  let columns = 0;
  let widgets = 0;
  const widgetTypes: Record<string, number> = {};

  function traverse(elements: ElementorElement[]) {
    for (const element of elements) {
      if (element.elType === "section") sections++;
      if (element.elType === "column") columns++;
      if (element.elType === "widget") {
        widgets++;
        if (element.widgetType) {
          widgetTypes[element.widgetType] =
            (widgetTypes[element.widgetType] || 0) + 1;
        }
      }
      if (element.elements) {
        traverse(element.elements);
      }
    }
  }

  traverse(elements);
  return { sections, columns, widgets, widgetTypes };
}

export function exportToJSON(data: ElementorData): string {
  return JSON.stringify(data, null, 2);
}

export function importFromJSON(json: string): ElementorData | null {
  try {
    const parsed = JSON.parse(json);
    if (validateElementorData(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
