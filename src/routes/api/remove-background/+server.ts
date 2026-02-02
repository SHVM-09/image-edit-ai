import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeBackground } from '@imgly/background-removal-node';

function parseDataUrl(imageUrl: string): { base64: string; mimeType: string } {
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('imageUrl must be a data URL (data:...;base64,...)');
  return { mimeType: match[1].trim(), base64: match[2] };
}

export const POST: RequestHandler = async ({ request }) => {
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
    const inputBlob = new Blob([buffer], { type: mimeType || 'image/png' });

    const blob = await removeBackground(inputBlob, {
      model: 'medium',
      output: { format: 'image/png' }
    });

    const arrayBuffer = await blob.arrayBuffer();
    const outBase64 = Buffer.from(arrayBuffer).toString('base64');
    const resultUrl = `data:image/png;base64,${outBase64}`;
    return json({ imageUrl: resultUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Background removal failed';
    console.error('remove-background error:', err);
    return json({ error: message }, { status: 500 });
  }
};
