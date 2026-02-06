import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { ElementorBuilderInput, ElementorBuilderOutput } from './types/agents.js';

const inputSchema = z.object({
  pageTitle: z.string().min(1),
  content: z.string().min(100),
  keywords: z.array(z.string()),
  contentType: z.string(),
  sections: z.array(z.string()).optional(),
});

const outputSchema = z.object({
  elementorData: z.object({
    version: z.string(),
    elements: z.array(z.object({
      id: z.string(),
      elType: z.string(),
      settings: z.record(z.unknown()),
      elements: z.array(z.unknown()).optional(),
    })),
  }),
  widgetsUsed: z.array(z.string()),
  sectionsCount: z.number(),
  columnsCount: z.number(),
});

const SYSTEM_PROMPT = `You are an expert Elementor page builder specialist with deep knowledge of modern web design and WordPress.

Your role is to transform written content into structured Elementor JSON data that creates visually appealing, SEO-optimized pages.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Generate valid Elementor JSON structure
3. Use appropriate widgets for content type (text, heading, image, button, etc.)
4. Create responsive layouts with proper sections and columns
5. Include SEO-friendly HTML tags (h1, h2, h3, etc.)
6. Add proper spacing and styling settings
7. Use container widgets for better structure
8. Include call-to-action elements where appropriate

Elementor Structure:
- Sections (full-width containers)
- Columns (within sections)
- Widgets (heading, text-editor, button, image, etc.)

Common Widget Types:
- heading (h1-h6)
- text-editor (paragraphs, lists)
- button (CTA)
- spacer (vertical spacing)
- divider (horizontal line)
- image (featured images, icons)

Output JSON structure:
{
  "elementorData": {
    "version": "3.18.0",
    "elements": [
      {
        "id": "section-1",
        "elType": "section",
        "settings": {
          "layout": "boxed",
          "gap": "default"
        },
        "elements": [
          {
            "id": "column-1",
            "elType": "column",
            "settings": {
              "_column_size": 100
            },
            "elements": [
              {
                "id": "heading-1",
                "elType": "widget",
                "widgetType": "heading",
                "settings": {
                  "title": "Page Title",
                  "header_size": "h1"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "widgetsUsed": ["heading", "text-editor"],
  "sectionsCount": 1,
  "columnsCount": 1
}`;

export class ElementorBuilderAgent extends BaseAgent<ElementorBuilderInput, ElementorBuilderOutput> {
  constructor() {
    super({
      type: 'elementor_builder',
      name: 'Elementor Builder Agent',
      description: 'Generates Elementor JSON layout from content',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 1000,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: ElementorBuilderInput): string {
    let prompt = `Generate Elementor JSON layout for the following content:

PAGE TITLE: ${input.pageTitle}
CONTENT TYPE: ${input.contentType}
TARGET KEYWORDS: ${input.keywords.join(', ')}

CONTENT:
${input.content}`;

    if (input.sections && input.sections.length > 0) {
      prompt += `\n\nREQUIRED SECTIONS:\n${input.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    }

    prompt += `

Instructions:
1. Create a professional, clean layout
2. Use h1 for the main title
3. Break content into logical sections with h2/h3 headings
4. Add proper spacing between elements
5. Include at least one CTA button if appropriate
6. Make it mobile-responsive
7. Use text-editor widgets for paragraphs
8. Add dividers or spacers for visual separation

Generate complete Elementor JSON structure. Respond with JSON only.`;

    return prompt;
  }
}

export const elementorBuilderAgent = new ElementorBuilderAgent();
