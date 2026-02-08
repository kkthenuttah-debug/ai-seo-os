# Visual Editor Documentation

## Overview

The Visual Editor is a comprehensive page building system that allows users to create and edit Elementor-compatible page layouts through a visual, drag-and-drop interface. It features a recursive element structure that mirrors Elementor's hierarchy: Sections → Columns → Widgets.

## Architecture

### Recursive Element Structure

The Visual Editor implements a fully recursive element tree where elements can contain other elements:

```
Section (elType: 'section')
  └─ Column (elType: 'column')
      ├─ Widget (elType: 'widget', widgetType: 'heading')
      ├─ Widget (elType: 'widget', widgetType: 'text-editor')
      └─ Widget (elType: 'widget', widgetType: 'button')
```

This hierarchy is enforced through:
- **Sections** can only contain **Columns**
- **Columns** can only contain **Widgets**
- **Widgets** are leaf nodes (no children)

### Core Components

#### 1. **VisualEditor** (Main Component)
- **Path**: `src/components/VisualEditor/VisualEditor.tsx`
- **Purpose**: Main container that coordinates all editor functionality
- **Features**:
  - History management (undo/redo with 50-state buffer)
  - Element CRUD operations
  - Import/Export JSON
  - Code view toggle
  - Save/Preview handlers

#### 2. **RecursiveElementTree**
- **Path**: `src/components/VisualEditor/RecursiveElementTree.tsx`
- **Purpose**: Recursively renders the element tree
- **Key Feature**: Uses recursion to handle unlimited nesting depth
- **Pattern**:
  ```tsx
  const renderElement = (element: ElementorElement): JSX.Element => {
    return (
      <ElementRenderer element={element}>
        {element.elements?.map(renderElement)}
      </ElementRenderer>
    );
  };
  ```

#### 3. **ElementRenderer**
- **Path**: `src/components/VisualEditor/ElementRenderer.tsx`
- **Purpose**: Renders individual elements with visual feedback
- **Features**:
  - Selection highlighting (blue for sections, green for columns, purple for widgets)
  - Hover states
  - Click-through element selection
  - Visual representation of each widget type

#### 4. **ElementToolbox**
- **Path**: `src/components/VisualEditor/ElementToolbox.tsx`
- **Purpose**: Provides drag-and-drop palette of elements
- **Elements**:
  - Layout: Section
  - Widgets: Heading, Text Editor, Button, Image, Spacer, Divider, Video, Star Rating, HTML

#### 5. **PropertiesPanel**
- **Path**: `src/components/VisualEditor/PropertiesPanel.tsx`
- **Purpose**: Context-sensitive property editor
- **Features**:
  - Element-specific property controls
  - Real-time updates
  - Delete/Duplicate actions

### Utility Functions

**Path**: `src/lib/elementor-utils.ts`

Core utilities for element manipulation:

- `createSection()` - Creates a new section with default column
- `createColumn()` - Creates a column with specified width
- `createWidget()` - Creates a widget with type-specific defaults
- `findElementById()` - Recursively searches for element by ID
- `findParentElement()` - Recursively finds parent of an element
- `updateElement()` - Recursively updates element settings
- `deleteElement()` - Recursively removes element from tree
- `duplicateElement()` - Deep clones element and generates new IDs
- `insertElement()` - Adds element at specific position
- `moveElement()` - Relocates element within tree
- `canAcceptChild()` - Validates parent-child relationships
- `countElements()` - Recursively counts elements by type

### Type System

**Path**: `src/types/elementor.ts`

Comprehensive TypeScript definitions:

```typescript
export interface ElementorElement {
  id: string;
  elType: ElementType;
  settings: ElementSettings;
  elements?: ElementorElement[];  // Recursive!
  widgetType?: WidgetType;
}

export interface ElementorData {
  version?: string;
  elements: ElementorElement[];
}
```

## Widget Types

The editor supports 9 widget types:

1. **Heading** - H1-H6 headers with alignment
2. **Text Editor** - Rich HTML content
3. **Button** - CTA buttons with links
4. **Image** - Image display
5. **Spacer** - Vertical spacing control
6. **Divider** - Horizontal line separator
7. **Video** - Video embed placeholder
8. **Star Rating** - Rating display
9. **HTML** - Custom HTML code

## Usage

### In Page Editor

The Visual Editor is integrated into the main PageEditor component as a tab:

```tsx
<PageEditor
  projectId="project-id"
  page={pageData}
  isOpen={true}
  onClose={handleClose}
  onSave={handleSave}
  mode="edit"
/>
```

Users can switch between:
- **Content** - Raw HTML/text editing
- **Visual Editor** - Visual page building ⭐ NEW
- **SEO & Meta** - SEO settings
- **Advanced** - JSON Elementor data

### Standalone Demo

Access the standalone demo at `/app/visual-editor-demo` to test the editor without page context.

## Features

### ✅ Implemented

- [x] Recursive element tree rendering
- [x] Section/Column/Widget hierarchy
- [x] Visual element selection and hover states
- [x] Context-sensitive properties panel
- [x] Undo/Redo (50 states)
- [x] Element duplication
- [x] Element deletion
- [x] JSON export/import
- [x] Code view toggle
- [x] Real-time property updates
- [x] 9 widget types with custom renderers
- [x] Column width adjustment
- [x] Section layout settings

### 🚧 Future Enhancements

- [ ] Drag-and-drop reordering
- [ ] Copy/paste elements
- [ ] Keyboard shortcuts
- [ ] Responsive breakpoint preview
- [ ] Color picker for styling
- [ ] Typography controls
- [ ] Background image support
- [ ] Animation settings
- [ ] Template library
- [ ] AI-powered layout suggestions

## Data Flow

```
User Action
    ↓
VisualEditor (state management)
    ↓
elementor-utils (manipulation)
    ↓
RecursiveElementTree (rendering)
    ↓
ElementRenderer (visual feedback)
    ↓
PropertiesPanel (property editing)
    ↓
Update Loop (via history management)
```

## Integration Points

### With PageEditor

```tsx
// PageEditor.tsx
<TabsContent value="visual" className="h-[600px] m-0">
  <VisualEditor
    initialData={JSON.parse(formData.elementorData)}
    onSave={(data) => {
      setFormData(prev => ({
        ...prev,
        elementorData: JSON.stringify(data, null, 2)
      }));
    }}
  />
</TabsContent>
```

### With Backend API

The editor produces Elementor-compatible JSON that can be:
1. Saved to `pages.elementor_data` in Supabase
2. Published to WordPress via REST API
3. Processed by `ElementorBuilderAgent` for AI enhancements

## Performance Considerations

### Recursion Depth

- Maximum practical depth: Section → Column → Widget (3 levels)
- Enforced through `canAcceptChild()` validation
- Prevents infinite recursion scenarios

### History Management

- Circular buffer limited to 50 states
- Deep cloning using `JSON.parse(JSON.stringify())`
- Memory efficient for typical page sizes (<1MB JSON)

### Re-rendering

- Uses `React.memo` potential for optimization
- Element selection triggers minimal re-renders
- Property updates are localized to affected subtree

## Troubleshooting

### "Widgets can only be added to columns"
- Ensure you've selected a column before adding widgets
- Sections must contain at least one column first

### JSON Import Fails
- Verify JSON structure matches ElementorData interface
- Check that all required fields (id, elType, settings) are present
- Use `validateElementorData()` utility for validation

### Elements Not Rendering
- Check browser console for React errors
- Verify element has valid `id` property
- Ensure `elType` matches allowed values

## Best Practices

1. **Always add columns to sections** before adding widgets
2. **Use meaningful widget settings** - they affect WordPress output
3. **Test JSON export/import** before deploying changes
4. **Leverage undo/redo** for experimentation
5. **Preview layouts** in different viewport sizes

## Contributing

When adding new widget types:

1. Add type to `WidgetType` in `src/types/elementor.ts`
2. Add default settings in `getDefaultWidgetSettings()`
3. Add renderer in `WidgetRenderer` component
4. Add icon and description in `ElementToolbox`
5. Add property controls in `PropertiesPanel`

## References

- [Elementor JSON Documentation](https://developers.elementor.com/docs/)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [Radix UI Primitives](https://www.radix-ui.com/)
