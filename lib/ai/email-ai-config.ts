import { anthropic } from '@ai-sdk/anthropic';
import { TEMPLATE_VARIABLES, getVariablesForTemplate } from '@/lib/email/template-variables';

/**
 * Email AI Configuration
 *
 * Configures Claude 3.5 Sonnet for email template generation with appropriate
 * settings for creative yet structured content generation.
 */

export const emailAIConfig = {
  model: anthropic('claude-sonnet-4-5-20250929'),
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: `You are an expert email template designer for professional workplace communication platforms. Your task is to generate clean, modern, and accessible HTML email templates.

Guidelines:
- Use inline CSS for maximum email client compatibility
- Include responsive meta tags and viewport settings
- Use web-safe fonts (Arial, Helvetica, sans-serif)
- Ensure good color contrast for accessibility
- Keep HTML structure simple and table-based for email clients
- Include proper alt text for images
- Support both light and dark mode where possible
- Use semantic HTML where email clients support it
- Make the design clean, professional, and on-brand
- Ensure the template is mobile-friendly

Template Structure:
- Always include DOCTYPE, html, head, and body tags
- Include meta tags for charset, viewport, and email client compatibility
- Use tables for layout (email clients don't support flexbox/grid reliably)
- Include a max-width container (typically 600px) centered with margins
- Add proper padding and spacing for readability
- Use the provided brand color for primary actions and accents

Output only the complete HTML template without any markdown formatting or explanations.`,
};

/**
 * Build a context-aware prompt for email template generation
 */
export function buildPrompt(options: {
  prompt: string;
  templateType: string;
  workspaceName?: string;
  brandColor?: string;
  existingHtml?: string;
}): string {
  const { prompt, templateType, workspaceName, brandColor, existingHtml } = options;

  let contextPrompt = `Generate an HTML email template for: ${templateType}\n\n`;

  if (workspaceName) {
    contextPrompt += `Workspace: ${workspaceName}\n`;
  }

  if (brandColor) {
    contextPrompt += `Brand Color: ${brandColor} (use for primary buttons and accents)\n`;
  }

  // Add comprehensive list of available template variables
  contextPrompt += `\nAVAILABLE TEMPLATE VARIABLES:\n`;
  contextPrompt += `Use these variables in your template by wrapping them in double braces, e.g., {{recipientName}}\n\n`;

  const relevantVariables = getVariablesForTemplate(templateType);
  const allVariables = TEMPLATE_VARIABLES;

  // Show template-specific variables first
  if (relevantVariables.length > 0) {
    contextPrompt += `Recommended for ${templateType}:\n`;
    relevantVariables.forEach(v => {
      contextPrompt += `- {{${v.name}}}: ${v.description}\n`;
    });
    contextPrompt += `\n`;
  }

  // Show all available variables
  contextPrompt += `All available variables:\n`;
  allVariables.forEach(v => {
    const recommended = relevantVariables.some(rv => rv.name === v.name) ? ' (recommended for this type)' : '';
    contextPrompt += `- {{${v.name}}}: ${v.description}${recommended}\n`;
  });

  if (existingHtml) {
    contextPrompt += `\nExisting Template (modify based on user request):\n${existingHtml}\n\n`;
  }

  contextPrompt += `\nUser Request: ${prompt}\n\n`;
  contextPrompt += `IMPORTANT: Only use the template variables listed above. Do not create new variables.`;

  return contextPrompt;
}
