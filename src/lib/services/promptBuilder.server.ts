import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';
import { buildPromptFromSpec } from './promptBuilder';
import type { ImageSpec } from '$lib/models/imageInfo';

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Uses Gemini to produce a well-structured LLM image generation prompt from an ImageSpec.
 * Requires GEMINI_API_KEY in .env (or environment).
 */
export async function generatePromptWithGemini(spec: ImageSpec): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to your .env file.'
    );
  }

  const draft = buildPromptFromSpec(spec);

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an expert at writing prompts for AI image generation models.
Given structured image spec fields (purpose, message, elements, style, color scheme, aspect ratio, usage context),
output a single, well-crafted image generation prompt string that is concise and ready to be sent to an image model.
Do not include labels or section headers in the output—only the final prompt text.
Critical: The generated image must not contain any text, words, letters, captions, or typography. Text can only be added manually by the user in the editor as separate layers. Ensure the prompt explicitly states no text in the image.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Structured spec:\n${draft}\n\nGenerate the image generation prompt:`,
    config: { systemInstruction }
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned an empty prompt.');
  }

  return text;
}
