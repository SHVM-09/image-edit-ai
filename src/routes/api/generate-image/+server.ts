import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY is not set. Add it to your .env file.' }, { status: 500 });
  }

  let body: { prompt: string; aspectRatio?: string } = { prompt: '' };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return json({ error: 'prompt is required' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const config: Record<string, unknown> = {
      responseModalities: ['TEXT', 'IMAGE']
    };
    if (body.aspectRatio) {
      config.imageConfig = { aspectRatio: body.aspectRatio };
    }
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: prompt.trim(),
      config
    });

    const res = response as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> } }>;
      data?: string;
    };
    let base64 = '';
    let mimeType = 'image/png';

    if (res.data) {
      base64 = res.data;
    } else if (res.candidates?.length && res.candidates[0].content?.parts?.length) {
      for (const part of res.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64 = part.inlineData.data;
          if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!base64) {
      return json({ error: 'No image generated. Try a different prompt or check GEMINI_API_KEY.' }, { status: 422 });
    }

    const imageUrl = `data:${mimeType};base64,${base64}`;
    return json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed';
    console.error('generate-image error:', err);
    return json({ error: message }, { status: 500 });
  }
};
