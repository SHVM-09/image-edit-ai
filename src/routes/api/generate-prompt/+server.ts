import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePromptWithGemini } from '$lib/services/promptBuilder.server';
import type { ImageSpec } from '$lib/models/imageInfo';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const spec = (await request.json()) as ImageSpec;
    const prompt = await generatePromptWithGemini(spec);
    return json({ prompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate prompt';
    return json({ error: message }, { status: 400 });
  }
};
