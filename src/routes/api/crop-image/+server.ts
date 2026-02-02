import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sharp from 'sharp';

function parseDataUrl(imageUrl: string): { base64: string; mimeType: string } {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('imageUrl must be a data URL (data:...;base64,...)');
  return { mimeType: match[1].trim(), base64: match[2] };
}

export const POST: RequestHandler = async ({ request }) => {
  let body: {
    imageUrl: string;
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  } = { imageUrl: '' };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { imageUrl, left = 0, top = 0, width = 1, height = 1 } = body;
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:')) {
    return json({ error: 'imageUrl must be a data URL string' }, { status: 400 });
  }

  const l = Math.max(0, Math.min(1, left));
  const t = Math.max(0, Math.min(1, top));
  const w = Math.max(0.01, Math.min(1, width));
  const h = Math.max(0.01, Math.min(1, height));

  try {
    const { base64 } = parseDataUrl(imageUrl);
    const buffer = Buffer.from(base64, 'base64');
    const image = sharp(buffer);
    const meta = await image.metadata();
    const imgW = (meta.width ?? 1024) as number;
    const imgH = (meta.height ?? 768) as number;

    const x = Math.round(l * imgW);
    const y = Math.round(t * imgH);
    const cropW = Math.max(1, Math.round(w * imgW));
    const cropH = Math.max(1, Math.round(h * imgH));

    const leftPx = Math.min(x, imgW - 1);
    const topPx = Math.min(y, imgH - 1);
    const finalW = Math.min(cropW, imgW - leftPx);
    const finalH = Math.min(cropH, imgH - topPx);

    const cropped = await image
      .extract({ left: leftPx, top: topPx, width: finalW, height: finalH })
      .png()
      .toBuffer();

    const dataUrl = `data:image/png;base64,${cropped.toString('base64')}`;
    return json({ imageUrl: dataUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Crop failed';
    console.error('crop-image error:', err);
    return json({ error: message }, { status: 500 });
  }
};
