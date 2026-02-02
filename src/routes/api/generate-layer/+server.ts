import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY is not set.' }, { status: 500 });
  }

  let body: { prompt: string; width?: number; height?: number } = { prompt: '' };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, width: targetW, height: targetH } = body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return json({ error: 'prompt is required' }, { status: 400 });
  }

  const w = Math.max(1, Math.min(2048, Math.round(targetW ?? 256)));
  const h = Math.max(1, Math.min(2048, Math.round(targetH ?? 256)));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const layerPrompt = `${prompt.trim()} Single element or layer only, suitable for compositing. Approximate size ${w}x${h} pixels.`;
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: layerPrompt,
      config: { responseModalities: ['TEXT', 'IMAGE'] }
    });

    const res = response as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
    };
    let base64 = '';
    for (const part of res.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        base64 = part.inlineData.data;
        break;
      }
    }
    if (!base64) {
      return json({ error: 'No image generated for layer.' }, { status: 422 });
    }

    const buf = Buffer.from(base64, 'base64');
    const resized = await sharp(buf).resize(w, h, { fit: 'fill' }).png().toBuffer();
    const imageUrl = `data:image/png;base64,${resized.toString('base64')}`;
    return json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Layer generation failed';
    console.error('generate-layer error:', err);
    return json({ error: message }, { status: 500 });
  }
};
