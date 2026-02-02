import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

const GEMINI_VISION_MODEL = 'gemini-2.5-flash';
const MAX_REGIONS = 12;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    regions: {
      type: 'array',
      description: 'Distinct visual layers in the image (semantic elements)',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['image', 'text', 'background'],
            description: 'image = visual element layer, text = text overlay, background = base layer'
          },
          x: { type: 'integer', minimum: 0, maximum: 1000 },
          y: { type: 'integer', minimum: 0, maximum: 1000 },
          width: { type: 'integer', minimum: 1, maximum: 1000 },
          height: { type: 'integer', minimum: 1, maximum: 1000 },
          textContent: { type: 'string', description: 'For type text: the visible text. Empty otherwise.' }
        },
        required: ['type', 'x', 'y', 'width', 'height']
      },
      maxItems: MAX_REGIONS
    }
  },
  required: ['regions']
};

function parseDataUrl(imageUrl: string): { base64: string; mimeType: string } {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('imageUrl must be a data URL (data:...;base64,...)');
  return { mimeType: match[1].trim(), base64: match[2] };
}

export const POST: RequestHandler = async ({ request }) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY is not set.' }, { status: 500 });
  }

  let body: { imageUrl: string } = { imageUrl: '' };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { imageUrl } = body;
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:')) {
    return json({ error: 'imageUrl must be a data URL string' }, { status: 400 });
  }

  try {
    const { base64, mimeType } = parseDataUrl(imageUrl);
    const buffer = Buffer.from(base64, 'base64');

    const image = sharp(buffer);
    const { width: imgWidth, height: imgHeight } = await image.metadata();
    const width = (imgWidth ?? 1024) as number;
    const height = (imgHeight ?? 768) as number;

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze this image and list its distinct LAYERS (semantic elements) so we can extract them exactly from this image.
Rules:
- Return up to ${MAX_REGIONS} layers. Each layer is a region we will crop from THIS image (exact extraction).
- Use coordinates normalized to 0-1000: x, y = top-left; width, height = size. All integers.
- Include one "background" layer covering the full image (x=0, y=0, width=1000, height=1000).
- For text overlays use type "text" and set textContent to the visible text.
- For each visual element (object, shape, figure, logo) use type "image" with a tight bounding box around that element only.
- Prefer non-overlapping or minimal overlap. Each layer should be a logical unit we can crop and edit separately.`;

    const response = await ai.models.generateContent({
      model: GEMINI_VISION_MODEL,
      contents: [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt }
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: EXTRACTION_SCHEMA
      }
    });

    const text = response.text?.trim();
    if (!text) {
      return json({ error: 'No regions returned from vision model' }, { status: 422 });
    }

    const parsed = JSON.parse(text) as {
      regions: Array<{
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
        textContent?: string;
      }>;
    };
    const regions = Array.isArray(parsed.regions) ? parsed.regions.slice(0, MAX_REGIONS) : [];

    const layers: Array<{
      type: 'image' | 'text' | 'background';
      imageUrl: string;
      textContent: string;
      boundingBox: { x: number; y: number; width: number; height: number };
    }> = [];

    for (const r of regions) {
      const x = Math.round((r.x / 1000) * width);
      const y = Math.round((r.y / 1000) * height);
      const w = Math.max(1, Math.round((r.width / 1000) * width));
      const h = Math.max(1, Math.round((r.height / 1000) * height));

      const left = Math.max(0, Math.min(x, width - 1));
      const top = Math.max(0, Math.min(y, height - 1));
      const cropW = Math.min(w, width - left);
      const cropH = Math.min(h, height - top);

      let layerImageUrl = '';

      if (r.type !== 'text' && cropW > 0 && cropH > 0) {
        // Extract exact region from the main image (crop only; user can remove background manually in editor)
        const cropped = await image
          .clone()
          .extract({ left, top, width: cropW, height: cropH })
          .png()
          .toBuffer();

        layerImageUrl = `data:image/png;base64,${cropped.toString('base64')}`;
      }

      layers.push({
        type: r.type as 'image' | 'text' | 'background',
        imageUrl: layerImageUrl,
        textContent: (r.textContent ?? '').trim(),
        boundingBox: { x: left, y: top, width: cropW, height: cropH }
      });
    }

    return json({ layers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Layer extraction failed';
    console.error('extract-layers error:', err);
    return json({ error: message }, { status: 500 });
  }
};
