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
    case "progress-bar":
      return {
        title: "My Progress",
        percent: 75,
        display_percentage: true,
        inner_text: "",
        type: "line",
      };
    case "counter":
      return {
        starting_number: 0,
        ending_number: 1000,
        duration: 2000,
        title: "Projects Completed",
        prefix: "",
        suffix: "+",
      };
    case "testimonials":
      return {
        items: [
          {
            name: "John Doe",
            title: "CEO, Company",
            content: "This is an amazing service!",
            image: "https://via.placeholder.com/100",
            rating: 5,
          },
        ],
      };
    case "image-carousel":
      return {
        images: [
          { url: "https://via.placeholder.com/800x600", alt: "Image 1" },
          { url: "https://via.placeholder.com/800x600", alt: "Image 2" },
          { url: "https://via.placeholder.com/800x600", alt: "Image 3" },
        ],
        autoplay: true,
        autoplay_speed: 3000,
      };
    case "google-maps":
      return {
        address: "New York, NY",
        zoom: 12,
        height: 400,
      };
    case "icon-list":
      return {
        items: [
          { text: "List item 1", icon: "check" },
          { text: "List item 2", icon: "check" },
          { text: "List item 3", icon: "check" },
        ],
      };
    case "lottie":
      return {
        source_url: "https://assets.lottiefiles.com/packages/lf20_UJNc2t.json",
        loop: true,
        autoplay: true,
      };
    case "social-icons":
      return {
        items: [
          { network: "facebook", url: "#" },
          { network: "twitter", url: "#" },
          { network: "instagram", url: "#" },
          { network: "linkedin", url: "#" },
        ],
        shape: "circle",
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

// HTML Renderer for Visual Preview
export function renderElementorToHtml(data: ElementorData): string {
  const elements = data.elements || [];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elementor Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .elementor-section { width: 100%; padding: 40px 0; }
    .elementor-section.boxed { max-width: 1200px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
    .elementor-section.full_width { padding-left: 20px; padding-right: 20px; }
    .elementor-row { display: flex; flex-wrap: wrap; margin: 0 -15px; }
    .elementor-column { padding: 0 15px; }
    .elementor-widget { margin-bottom: 20px; }
    .elementor-heading { font-weight: 600; margin-bottom: 10px; }
    .elementor-text-editor { line-height: 1.8; }
    .elementor-button { display: inline-block; padding: 12px 24px; background: #0073aa; color: white; text-decoration: none; border-radius: 4px; transition: all 0.3s; }
    .elementor-button:hover { background: #005177; }
    .elementor-image img { max-width: 100%; height: auto; display: block; }
    .elementor-divider { border-top: 1px solid #ddd; margin: 20px 0; }
    .elementor-spacer { display: block; }
    .elementor-video iframe { width: 100%; aspect-ratio: 16/9; }
    .elementor-icon { font-size: 48px; }
    .elementor-icon-box { display: flex; flex-direction: column; align-items: flex-start; }
    .elementor-icon-box.top { align-items: center; text-align: center; }
    .elementor-icon-box-icon { font-size: 48px; margin-bottom: 15px; }
    .elementor-icon-box-title { font-size: 20px; font-weight: 600; margin-bottom: 10px; }
    .elementor-star-rating { color: #ffc107; }
    .elementor-accordion, .elementor-tabs, .elementor-toggle { border: 1px solid #ddd; }
    .elementor-accordion-item, .elementor-tab, .elementor-toggle-item { border-bottom: 1px solid #ddd; }
    .elementor-accordion-title, .elementor-tab-title, .elementor-toggle-title { padding: 15px; font-weight: 600; cursor: pointer; background: #f9f9f9; }
    .elementor-accordion-content, .elementor-tab-content, .elementor-toggle-content { padding: 15px; }
    .elementor-alert { padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .elementor-alert.info { background: #e7f3ff; color: #0c5ea1; }
    .elementor-alert.success { background: #d4edda; color: #155724; }
    .elementor-alert.warning { background: #fff3cd; color: #856404; }
    .elementor-alert.danger { background: #f8d7da; color: #721c24; }
    .elementor-progress-bar { background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
    .elementor-progress-bar-inner { background: #0073aa; height: 30px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; transition: width 1s; }
    .elementor-counter { text-align: center; font-size: 48px; font-weight: 700; color: #0073aa; }
    .elementor-counter-title { font-size: 18px; font-weight: 400; margin-top: 10px; }
    .elementor-testimonial { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .elementor-testimonial-content { font-style: italic; margin-bottom: 15px; }
    .elementor-testimonial-meta { display: flex; align-items: center; }
    .elementor-testimonial-image { width: 60px; height: 60px; border-radius: 50%; margin-right: 15px; }
    .elementor-carousel { position: relative; overflow: hidden; }
    .elementor-carousel-image { width: 100%; height: auto; }
    .elementor-icon-list { list-style: none; }
    .elementor-icon-list-item { display: flex; align-items: center; margin-bottom: 10px; }
    .elementor-icon-list-icon { margin-right: 10px; }
    .elementor-social-icons { display: flex; gap: 10px; }
    .elementor-social-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #0073aa; color: white; border-radius: 4px; text-decoration: none; }
    .elementor-social-icon.circle { border-radius: 50%; }
    .align-left { text-align: left; }
    .align-center { text-align: center; }
    .align-right { text-align: right; }
    .align-justify { text-align: justify; }
  </style>
</head>
<body>
  ${elements.map(element => renderElement(element)).join('')}
</body>
</html>
  `.trim();
}

function renderElement(element: ElementorElement): string {
  const settings = element.settings;
  const responsiveClasses = [
    settings.hide_desktop ? 'hide-desktop' : '',
    settings.hide_tablet ? 'hide-tablet' : '',
    settings.hide_mobile ? 'hide-mobile' : '',
  ].filter(Boolean).join(' ');

  const commonStyles = [
    settings.background_color ? `background-color: ${settings.background_color};` : '',
    settings.color ? `color: ${settings.color};` : '',
    settings.padding ? `padding: ${formatSpacing(settings.padding)};` : '',
    settings.margin ? `margin: ${formatSpacing(settings.margin)};` : '',
    settings.border_color ? `border-color: ${settings.border_color};` : '',
    settings.border_style ? `border-style: ${settings.border_style};` : '',
    settings.z_index ? `z-index: ${settings.z_index};` : '',
  ].filter(Boolean).join(' ');

  const id = settings._element_id ? `id="${settings._element_id}"` : '';
  const classes = settings._css_classes ? `class="${settings._css_classes} ${responsiveClasses}"` : (responsiveClasses ? `class="${responsiveClasses}"` : '');

  if (element.elType === 'section') {
    const layout = settings.layout || 'boxed';
    return `
      <section class="elementor-section ${layout}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-row">
          ${(element.elements || []).map(child => renderElement(child)).join('')}
        </div>
      </section>
    `;
  }

  if (element.elType === 'column') {
    const width = settings._column_size || 100;
    return `
      <div class="elementor-column" style="width: ${width}%; ${commonStyles}" ${id} ${classes}>
        ${(element.elements || []).map(child => renderElement(child)).join('')}
      </div>
    `;
  }

  if (element.elType === 'widget') {
    return renderWidget(element, commonStyles, id, classes);
  }

  return '';
}

function renderWidget(element: ElementorElement, commonStyles: string, id: string, classes: string): string {
  const settings = element.settings;
  const align = settings.align || 'left';
  const widgetType = element.widgetType;

  switch (widgetType) {
    case 'heading': {
      const tag = settings.header_size || 'h2';
      const title = settings.title || 'Heading';
      return `<div class="elementor-widget elementor-widget-heading align-${align}" ${id} ${classes} style="${commonStyles}">
        <${tag} class="elementor-heading">${escapeHtml(title)}</${tag}>
      </div>`;
    }

    case 'text-editor': {
      const content = settings.content || '<p>Text content</p>';
      return `<div class="elementor-widget elementor-widget-text-editor align-${align}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-text-editor">${content}</div>
      </div>`;
    }

    case 'button': {
      const text = settings.text || 'Click Here';
      const url = (settings.link as any)?.url || '#';
      return `<div class="elementor-widget elementor-widget-button align-${align}" ${id} ${classes} style="${commonStyles}">
        <a href="${escapeHtml(url)}" class="elementor-button">${escapeHtml(text)}</a>
      </div>`;
    }

    case 'image': {
      const url = (settings.image as any)?.url || 'https://via.placeholder.com/800x600';
      return `<div class="elementor-widget elementor-widget-image align-${align}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-image"><img src="${escapeHtml(url)}" alt="" /></div>
      </div>`;
    }

    case 'spacer': {
      const space = (settings.space as any)?.size || 50;
      return `<div class="elementor-widget elementor-widget-spacer" ${id} ${classes} style="height: ${space}px; ${commonStyles}"></div>`;
    }

    case 'divider': {
      return `<div class="elementor-widget elementor-widget-divider" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-divider"></div>
      </div>`;
    }

    case 'video': {
      const videoUrl = (settings.video as any)?.url || '';
      const embedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') 
        ? `https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}`
        : videoUrl;
      return `<div class="elementor-widget elementor-widget-video" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-video">
          <iframe src="${escapeHtml(embedUrl)}" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>`;
    }

    case 'icon': {
      const icon = settings.icon || '⭐';
      return `<div class="elementor-widget elementor-widget-icon align-${align}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-icon">${icon}</div>
      </div>`;
    }

    case 'icon-box': {
      const icon = settings.icon || '⭐';
      const title = settings.title || 'Icon Box';
      const description = settings.description || '';
      const position = settings.position || 'top';
      return `<div class="elementor-widget elementor-widget-icon-box ${position}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-icon-box">
          <div class="elementor-icon-box-icon">${icon}</div>
          <div class="elementor-icon-box-title">${escapeHtml(title)}</div>
          <div class="elementor-icon-box-description">${escapeHtml(description)}</div>
        </div>
      </div>`;
    }

    case 'image-box': {
      const imageUrl = (settings.image as any)?.url || 'https://via.placeholder.com/400x300';
      const title = settings.title || 'Image Box';
      const description = settings.description || '';
      return `<div class="elementor-widget elementor-widget-image-box" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-icon-box">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" style="max-width: 100%; margin-bottom: 15px;" />
          <div class="elementor-icon-box-title">${escapeHtml(title)}</div>
          <div class="elementor-icon-box-description">${escapeHtml(description)}</div>
        </div>
      </div>`;
    }

    case 'star-rating': {
      const rating = settings.rating || 5;
      const title = settings.title || '';
      return `<div class="elementor-widget elementor-widget-star-rating align-${align}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-star-rating">${'★'.repeat(rating as number)}${'☆'.repeat(5 - (rating as number))}</div>
        ${title ? `<div>${escapeHtml(title)}</div>` : ''}
      </div>`;
    }

    case 'accordion': {
      const items = (settings.items as any[]) || [];
      return `<div class="elementor-widget elementor-widget-accordion" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-accordion">
          ${items.map((item, i) => `
            <div class="elementor-accordion-item">
              <div class="elementor-accordion-title">${escapeHtml(item.title || `Item ${i + 1}`)}</div>
              <div class="elementor-accordion-content">${escapeHtml(item.content || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }

    case 'tabs': {
      const items = (settings.items as any[]) || [];
      return `<div class="elementor-widget elementor-widget-tabs" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-tabs">
          ${items.map((item, i) => `
            <div class="elementor-tab">
              <div class="elementor-tab-title">${escapeHtml(item.title || `Tab ${i + 1}`)}</div>
              <div class="elementor-tab-content">${escapeHtml(item.content || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }

    case 'toggle': {
      const items = (settings.items as any[]) || [];
      return `<div class="elementor-widget elementor-widget-toggle" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-toggle">
          ${items.map((item, i) => `
            <div class="elementor-toggle-item">
              <div class="elementor-toggle-title">${escapeHtml(item.title || `Toggle ${i + 1}`)}</div>
              <div class="elementor-toggle-content">${escapeHtml(item.content || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }

    case 'alert': {
      const type = settings.type || 'info';
      const title = settings.title || 'Alert';
      const description = settings.description || '';
      return `<div class="elementor-widget elementor-widget-alert" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-alert ${type}">
          <strong>${escapeHtml(title)}</strong><br />
          ${escapeHtml(description)}
        </div>
      </div>`;
    }

    case 'html': {
      const html = settings.html || '';
      return `<div class="elementor-widget elementor-widget-html" ${id} ${classes} style="${commonStyles}">
        ${html}
      </div>`;
    }

    case 'progress-bar': {
      const title = settings.title || 'Progress';
      const percent = settings.percent || 0;
      const displayPercentage = settings.display_percentage !== false;
      return `<div class="elementor-widget elementor-widget-progress" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-progress-title">${escapeHtml(title)}</div>
        <div class="elementor-progress-bar">
          <div class="elementor-progress-bar-inner" style="width: ${percent}%">
            ${displayPercentage ? `${percent}%` : ''}
          </div>
        </div>
      </div>`;
    }

    case 'counter': {
      const ending = settings.ending_number || 0;
      const title = settings.title || '';
      const prefix = settings.prefix || '';
      const suffix = settings.suffix || '';
      return `<div class="elementor-widget elementor-widget-counter align-${align}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-counter">${prefix}${ending}${suffix}</div>
        ${title ? `<div class="elementor-counter-title">${escapeHtml(title)}</div>` : ''}
      </div>`;
    }

    case 'testimonials': {
      const items = (settings.items as any[]) || [];
      return `<div class="elementor-widget elementor-widget-testimonials" ${id} ${classes} style="${commonStyles}">
        ${items.map(item => `
          <div class="elementor-testimonial">
            <div class="elementor-testimonial-content">"${escapeHtml(item.content || '')}"</div>
            <div class="elementor-testimonial-meta">
              ${item.image ? `<img class="elementor-testimonial-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || '')}" />` : ''}
              <div>
                <div style="font-weight: 600;">${escapeHtml(item.name || '')}</div>
                <div style="font-size: 14px; color: #666;">${escapeHtml(item.title || '')}</div>
                ${item.rating ? `<div class="elementor-star-rating">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</div>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
    }

    case 'image-carousel': {
      const images = (settings.images as any[]) || [];
      return `<div class="elementor-widget elementor-widget-carousel" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-carousel">
          ${images.map(img => `<img class="elementor-carousel-image" src="${escapeHtml(img.url || '')}" alt="${escapeHtml(img.alt || '')}" />`).join('')}
        </div>
      </div>`;
    }

    case 'google-maps': {
      const address = settings.address || 'New York, NY';
      const zoom = settings.zoom || 12;
      const height = settings.height || 400;
      const embedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(address as string)}&zoom=${zoom}`;
      return `<div class="elementor-widget elementor-widget-map" ${id} ${classes} style="${commonStyles}">
        <iframe width="100%" height="${height}" frameborder="0" style="border:0" src="${embedUrl}" allowfullscreen></iframe>
      </div>`;
    }

    case 'icon-list': {
      const items = (settings.items as any[]) || [];
      return `<div class="elementor-widget elementor-widget-icon-list" ${id} ${classes} style="${commonStyles}">
        <ul class="elementor-icon-list">
          ${items.map(item => `
            <li class="elementor-icon-list-item">
              <span class="elementor-icon-list-icon">${item.icon || '✓'}</span>
              <span class="elementor-icon-list-text">${escapeHtml(item.text || '')}</span>
            </li>
          `).join('')}
        </ul>
      </div>`;
    }

    case 'lottie': {
      const sourceUrl = settings.source_url || '';
      return `<div class="elementor-widget elementor-widget-lottie align-${align}" ${id} ${classes} style="${commonStyles}">
        <div style="background: #f0f0f0; padding: 40px; text-align: center; border-radius: 8px;">
          🎬 Lottie Animation<br />
          <small style="color: #666;">${escapeHtml(sourceUrl)}</small>
        </div>
      </div>`;
    }

    case 'social-icons': {
      const items = (settings.items as any[]) || [];
      const shape = settings.shape || 'square';
      return `<div class="elementor-widget elementor-widget-social-icons align-${align}" ${id} ${classes} style="${commonStyles}">
        <div class="elementor-social-icons">
          ${items.map(item => `
            <a href="${escapeHtml(item.url || '#')}" class="elementor-social-icon ${shape}" target="_blank" rel="noopener">
              ${getSocialIcon(item.network || 'link')}
            </a>
          `).join('')}
        </div>
      </div>`;
    }

    default:
      return `<div class="elementor-widget" ${id} ${classes} style="${commonStyles}">
        <div style="padding: 20px; background: #f9f9f9; border: 2px dashed #ddd; text-align: center;">
          Widget: ${widgetType || 'Unknown'}
        </div>
      </div>`;
  }
}

function formatSpacing(spacing: any): string {
  if (typeof spacing === 'string') return spacing;
  if (typeof spacing === 'object' && spacing !== null) {
    const { top = '0', right = '0', bottom = '0', left = '0', unit = 'px' } = spacing;
    return `${top}${unit} ${right}${unit} ${bottom}${unit} ${left}${unit}`;
  }
  return '0';
}

function escapeHtml(text: any): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : '';
}

function getSocialIcon(network: string): string {
  const icons: Record<string, string> = {
    facebook: 'f',
    twitter: '𝕏',
    instagram: '📷',
    linkedin: 'in',
    youtube: '▶',
    pinterest: 'P',
    github: 'GH',
  };
  return icons[network] || '🔗';
}
