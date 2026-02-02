import type { ImageSpec } from '$lib/models/imageInfo';

/**
 * Builds a well-structured LLM image generation prompt string from an ImageSpec.
 * Includes: purpose, message, elements, style, color scheme, aspect ratio, usage context.
 */
export function buildPromptFromSpec(spec: ImageSpec): string {
  const sections: string[] = [];

  // Purpose (from description)
  if (spec.description.trim()) {
    sections.push(`Purpose: ${spec.description.trim()}`);
  }

  // Message intent
  if (spec.messageIntent.trim()) {
    sections.push(`Message: ${spec.messageIntent.trim()}`);
  }

  // Visual elements (tags)
  if (spec.visualElements.length > 0) {
    sections.push(`Elements: ${spec.visualElements.join(', ')}`);
  }

  // Style hint (derived from usage context + description)
  const styleParts: string[] = [];
  if (spec.usageContext) {
    styleParts.push(`suitable for ${spec.usageContext.toLowerCase()}`);
  }
  if (styleParts.length > 0) {
    sections.push(`Style: ${styleParts.join(', ')}`);
  }

  // Color scheme
  if (spec.colorScheme.trim()) {
    sections.push(`Color scheme: ${spec.colorScheme.trim()}`);
  }

  // Aspect ratio
  sections.push(`Aspect ratio: ${spec.aspectRatio}`);

  // No text in generated image — text is added manually in the editor as layers
  sections.push('Important: The image must not contain any text, words, letters, or captions. Text can only be added manually later in the editor as separate layers.');

  // Usage context
  sections.push(`Usage context: ${spec.usageContext}`);

  // Reference URL as optional context
  if (spec.referenceUrl.trim()) {
    sections.push(`Reference: ${spec.referenceUrl.trim()}`);
  }

  return sections.join('\n');
}

/**
 * Beautifies a prompt string: normalizes whitespace, trims lines, removes empty lines.
 */
export function beautifyPrompt(prompt: string): string {
  return prompt
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Formats a prompt (or spec) for UI display in a confirmation/preview step.
 * Returns a readable, labeled string suitable for "Confirm prompt" UI.
 */
export function confirmPromptPreview(promptOrSpec: string | ImageSpec): string {
  const prompt =
    typeof promptOrSpec === 'string'
      ? promptOrSpec
      : buildPromptFromSpec(promptOrSpec);

  const lines = beautifyPrompt(prompt).split('\n');
  return lines
    .map((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const label = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        return `${label}\n  ${value}`;
      }
      return line;
    })
    .join('\n\n');
}
