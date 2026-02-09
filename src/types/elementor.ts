export type ElementType = "section" | "column" | "widget";

export type WidgetType =
  | "heading"
  | "text-editor"
  | "button"
  | "image"
  | "spacer"
  | "divider"
  | "video"
  | "icon"
  | "icon-box"
  | "image-box"
  | "star-rating"
  | "accordion"
  | "tabs"
  | "toggle"
  | "alert"
  | "html";

export interface ElementSettings {
  [key: string]: unknown;
  _column_size?: number;
  layout?: string;
  gap?: string;
  title?: string;
  header_size?: string;
  content?: string;
  text?: string;
  link?: {
    url: string;
    is_external?: boolean;
    nofollow?: boolean;
  };
  align?: string;
  size?: string;
  color?: string;
  typography_typography?: string;
  background_background?: string;
  background_color?: string;
}

export interface ElementorElement {
  id: string;
  elType: ElementType;
  settings: ElementSettings;
  elements?: ElementorElement[];
  widgetType?: WidgetType;
}

export interface ElementorData {
  version?: string;
  elements: ElementorElement[];
}

export interface ElementorPageData {
  elementorData: ElementorData;
  widgetsUsed?: string[];
  sectionsCount?: number;
  columnsCount?: number;
}

export interface VisualEditorState {
  selectedElementId: string | null;
  hoveredElementId: string | null;
  isDragging: boolean;
  draggedElementId: string | null;
  copiedElement: ElementorElement | null;
  history: ElementorData[];
  historyIndex: number;
  zoom: number;
}

export interface EditorAction {
  type: "add" | "update" | "delete" | "move" | "duplicate" | "undo" | "redo";
  elementId?: string;
  element?: ElementorElement;
  parentId?: string;
  targetIndex?: number;
  updates?: Partial<ElementSettings>;
}
