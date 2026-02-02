import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

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

  let body: { imageUrl: string; editInstruction: string } = { imageUrl: '', editInstruction: '' };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { imageUrl, editInstruction } = body;
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:')) {
    return json({ error: 'imageUrl must be a data URL string' }, { status: 400 });
  }
  if (!editInstruction || typeof editInstruction !== 'string' || !editInstruction.trim()) {
    return json({ error: 'editInstruction is required' }, { status: 400 });
  }

  try {
    const { base64, mimeType } = parseDataUrl(imageUrl);

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [
        { inlineData: { mimeType, data: base64 } },
        { text: `Edit this image according to the following instruction. Output only the edited image, preserving size and composition where possible. Do not respond with text—output the image only.\n\nInstruction: ${editInstruction.trim()}` }
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    });

    const res = response as {
      data?: string;
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> } }>;
    };
    let outBase64 = '';
    let outMimeType = 'image/png';

    if (res.data) {
      outBase64 = res.data;
    } else if (res.candidates?.length && res.candidates[0].content?.parts?.length) {
      for (const part of res.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          outBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) outMimeType = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!outBase64) {
      const textPart = res.candidates?.[0]?.content?.parts?.find((p) => p.text);
      const hint = textPart?.text ? ` Model replied: ${textPart.text.slice(0, 100)}…` : '';
      return json({ error: `No edited image returned. Try a clearer instruction.${hint}` }, { status: 422 });
    }

    const editedImageUrl = `data:${outMimeType};base64,${outBase64}`;
    return json({ imageUrl: editedImageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Element edit failed';
    console.error('edit-element error:', err);
    return json({ error: message }, { status: 500 });
  }
};
