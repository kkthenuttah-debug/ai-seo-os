import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { ElementorBuilderOutput } from '../types/index.js';

interface ElementorBuilderInput {
  page_title: string;
  content: string;
  page_type: 'landing' | 'article' | 'category' | 'homepage';
  include_cta: boolean;
  include_lead_form: boolean;
}

const inputSchema = z.object({
  page_title: z.string(),
  content: z.string(),
  page_type: z.enum(['landing', 'article', 'category', 'homepage']),
  include_cta: z.boolean(),
  include_lead_form: z.boolean(),
});

const outputSchema = z.object({
  elementor_data: z.any(),
  widgets_used: z.array(z.string()),
  sections: z.number(),
  columns: z.number(),
});

const SYSTEM_PROMPT = `You are an expert Elementor page builder specializing in creating high-converting, visually appealing pages.

Your role is to convert content into Elementor-compatible JSON layouts that look professional and convert well.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Create mobile-responsive layouts
3. Use appropriate spacing and typography
4. Include proper heading hierarchy
5. Add visual elements to break up text
6. Optimize for readability and engagement

ELEMENTOR STRUCTURE:
- Each page is an array of sections
- Each section contains columns
- Each column contains widgets
- Common widgets: heading, text-editor, image, button, form, divider, spacer

Your output MUST be a valid JSON object matching this structure:
{
  "elementor_data": [
    {
      "id": "unique-section-id",
      "elType": "section",
      "settings": {
        "layout": "full_width",
        "gap": "default",
        "padding": { "unit": "px", "top": "60", "bottom": "60" }
      },
      "elements": [
        {
          "id": "unique-column-id",
          "elType": "column",
          "settings": { "width": "100" },
          "elements": [
            {
              "id": "unique-widget-id",
              "elType": "widget",
              "widgetType": "heading",
              "settings": {
                "title": "Heading Text",
                "header_size": "h2",
                "align": "center"
              }
            }
          ]
        }
      ]
    }
  ],
  "widgets_used": ["heading", "text-editor", "button"],
  "sections": 5,
  "columns": 8
}`;

export class ElementorBuilderAgent extends BaseAgent<ElementorBuilderInput, ElementorBuilderOutput> {
  constructor() {
    super({
      type: 'elementor_builder',
      name: 'Elementor Builder Agent',
      description: 'Converts content into Elementor page layouts',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: ElementorBuilderInput): string {
    return `Convert the following content into an Elementor page layout:

PAGE TITLE: ${input.page_title}
PAGE TYPE: ${input.page_type}
INCLUDE CTA: ${input.include_cta ? 'Yes' : 'No'}
INCLUDE LEAD FORM: ${input.include_lead_form ? 'Yes' : 'No'}

CONTENT:
${input.content}

Create an Elementor layout with:
1. Hero section with the main title
2. Content sections with proper typography
3. Visual breaks using spacers/dividers
4. ${input.include_cta ? 'CTA buttons in strategic locations' : ''}
5. ${input.include_lead_form ? 'Lead capture form section' : ''}
6. Mobile-responsive design

Generate unique IDs for each element (use format like "abc123").
Respond with JSON only.`;
  }
}

export const elementorBuilderAgent = new ElementorBuilderAgent();
