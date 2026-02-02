import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sharp from 'sharp';

interface ElementInput {
  imageUrl: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  opacity?: number;
  rotation?: number;
  scale?: number;
  zIndex?: number;
}

function parseDataUrl(imageUrl: string): { base64: string; mimeType: string } {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('imageUrl must be a data URL (data:...;base64,...)');
  return { mimeType: match[1].trim(), base64: match[2] };
}

/** Apply opacity to RGBA buffer (multiply alpha channel). */
async function applyOpacityToBuffer(pngBuffer: Buffer, opacity: number): Promise<Buffer> {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const op = Math.max(0, Math.min(1, opacity));
  for (let i = 0; i < data.length; i += channels) {
    data[i + 3] = Math.round(data[i + 3] * op);
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels }
  })
    .png()
    .toBuffer();
}

export const POST: RequestHandler = async ({ request }) => {
  let body: { mainImageUrl: string; elements: ElementInput[] } = { mainImageUrl: '', elements: [] };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { mainImageUrl, elements } = body;
  if (!mainImageUrl || typeof mainImageUrl !== 'string' || !mainImageUrl.startsWith('data:')) {
    return json({ error: 'mainImageUrl must be a data URL string' }, { status: 400 });
  }

  const elementList = Array.isArray(elements) ? elements : [];

  try {
    const { base64, mimeType } = parseDataUrl(mainImageUrl);
    const mainBuffer = Buffer.from(base64, 'base64');
    let composite = sharp(mainBuffer);
    const meta = await composite.metadata();
    const width = (meta.width ?? 1024) as number;
    const height = (meta.height ?? 768) as number;

    const overlays: Array<{ input: Buffer; left: number; top: number }> = [];

    const sorted = [...elementList]
      .filter((el) => el.imageUrl && el.imageUrl.startsWith('data:'))
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    for (const el of sorted) {
      const x = Math.round(el.boundingBox.x);
      const y = Math.round(el.boundingBox.y);
      const w = Math.max(1, Math.round(el.boundingBox.width));
      const h = Math.max(1, Math.round(el.boundingBox.height));
      const scale = Math.max(0.1, Math.min(5, el.scale ?? 1));
      const rotation = Number(el.rotation ?? 0) % 360;
      const opacity = Math.max(0, Math.min(1, el.opacity ?? 1));

      if (x >= width || y >= height || w <= 0 || h <= 0) continue;

      const { base64: elBase64 } = parseDataUrl(el.imageUrl);
      const elBuffer = Buffer.from(elBase64, 'base64');

      const scaledW = Math.max(1, Math.round(w * scale));
      const scaledH = Math.max(1, Math.round(h * scale));

      let overlay = sharp(elBuffer)
        .resize(scaledW, scaledH, { fit: 'fill' })
        .png();

      if (rotation !== 0) {
        overlay = overlay.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
      }

      let overlayBuffer = await overlay.toBuffer();

      if (opacity < 1) {
        overlayBuffer = await applyOpacityToBuffer(overlayBuffer, opacity);
      }

      const overlayMeta = await sharp(overlayBuffer).metadata();
      const rotW = (overlayMeta.width ?? scaledW) as number;
      const rotH = (overlayMeta.height ?? scaledH) as number;
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      const left = Math.max(0, Math.round(centerX - rotW / 2));
      const top = Math.max(0, Math.round(centerY - rotH / 2));

      if (left + rotW <= 0 || top + rotH <= 0) continue;

      overlays.push({ input: overlayBuffer, left, top });
    }

    if (overlays.length > 0) {
      const compositeInput = overlays.map((o) => ({ input: o.input, left: o.left, top: o.top }));
      composite = composite.composite(compositeInput);
    }

    const outBuffer = await composite.png().toBuffer();
    const imageUrl = `data:image/png;base64,${outBuffer.toString('base64')}`;
    return json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recompose failed';
    console.error('recompose-image error:', err);
    return json({ error: message }, { status: 500 });
  }
};
