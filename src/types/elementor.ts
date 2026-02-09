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
  | "html"
  | "progress-bar"
  | "counter"
  | "testimonials"
  | "image-carousel"
  | "google-maps"
  | "icon-list"
  | "lottie"
  | "social-icons";

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
  // Advanced settings
  _element_id?: string;
  _css_classes?: string;
  z_index?: number;
  border_style?: string;
  border_width?: { top?: string; right?: string; bottom?: string; left?: string };
  border_color?: string;
  border_radius?: { top?: string; right?: string; bottom?: string; left?: string };
  box_shadow?: string;
  hide_desktop?: boolean;
  hide_tablet?: boolean;
  hide_mobile?: boolean;
  entrance_animation?: string;
  // Gradient background
  background_gradient?: {
    type?: string;
    color1?: string;
    color2?: string;
    angle?: number;
  };
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
