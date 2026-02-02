import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sharp from 'sharp';

function hexToRgba(hex: string): { r: number; g: number; b: number } {
  const match = hex.replace(/^#/, '').match(/.{2}/g);
  if (!match || match.length < 3) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(match[0], 16),
    g: parseInt(match[1], 16),
    b: parseInt(match[2], 16)
  };
}

export const POST: RequestHandler = async ({ request }) => {
  let body: { color?: string; width?: number; height?: number } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const color = (body.color ?? '#ffffff').toString().trim();
  const width = Math.max(1, Math.min(4096, Math.round(Number(body.width) || 1024)));
  const height = Math.max(1, Math.min(4096, Math.round(Number(body.height) || 768)));

  try {
    const { r, g, b } = hexToRgba(color);
    const buffer = Buffer.alloc(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      buffer[i * 3] = r;
      buffer[i * 3 + 1] = g;
      buffer[i * 3 + 2] = b;
    }
    const png = await sharp(buffer, {
      raw: { width, height, channels: 3 }
    })
      .png()
      .toBuffer();
    const imageUrl = `data:image/png;base64,${png.toString('base64')}`;
    return json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Solid background failed';
    console.error('solid-background error:', err);
    return json({ error: message }, { status: 500 });
  }
};
