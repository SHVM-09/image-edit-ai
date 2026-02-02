/**
 * Image generation service.
 * Uses gemini-2.5-flash-image for image-related operations.
 * Replace the default implementation with a real API (e.g. Gemini) when ready.
 */

export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export type ImageSize = '1:1' | '9:16' | '16:9' | 'custom';

export type ImageFormat = 'PNG' | 'JPG' | 'SVG';

export interface ImageService {
  generateImage(
    prompt: string,
    size: ImageSize,
    format: ImageFormat
  ): Promise<string>;

  regenerateImageWithChanges(
    prompt: string,
    editInstructions: string
  ): Promise<string>;
}

function mockImageUrl(label: string): string {
  return `https://placehold.co/800x600/1e3a5f/fff?text=${encodeURIComponent(label)}`;
}

const mockImageService: ImageService = {
  async generateImage(
    prompt: string,
    size: ImageSize,
    format: ImageFormat
  ): Promise<string> {
    // Mock: return placeholder URL. Replace with real Gemini/image API call.
    return mockImageUrl(`Generated (${size}, ${format})`);
  },

  async regenerateImageWithChanges(
    prompt: string,
    editInstructions: string
  ): Promise<string> {
    // Mock: return placeholder URL. Replace with real Gemini/image API call.
    return mockImageUrl('Regenerated with edits');
  }
};

/**
 * Default image service (mock). Swap for a real implementation when integrating API.
 *
 * Example real implementation:
 *   import { GoogleGenAI } from '@google/genai';
 *   const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
 *   const result = await ai.models.generateImages({ model: GEMINI_IMAGE_MODEL, ... });
 */
export const imageService: ImageService = mockImageService;
