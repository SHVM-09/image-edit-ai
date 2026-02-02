import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertSave } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  let body: {
    label?: string;
    state: { canvas: unknown; elements: unknown };
    promptUsed?: string | null;
    editHistory?: string[];
  } = { state: { canvas: {}, elements: {} } };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { label, state, promptUsed, editHistory } = body;
  if (!state || typeof state !== 'object' || !state.canvas || !state.elements) {
    return json({ error: 'state must include canvas and elements' }, { status: 400 });
  }

  try {
    const result = insertSave(
      typeof label === 'string' ? label : undefined,
      state as { canvas: unknown; elements: unknown },
      { promptUsed: promptUsed ?? null, editHistory: Array.isArray(editHistory) ? editHistory : undefined }
    );
    return json({ id: result.id, createdAt: result.createdAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed';
    console.error('save error:', err);
    return json({ error: message }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const { listSaves } = await import('$lib/server/db');
    const items = listSaves();
    return json({ saves: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed';
    console.error('saves list error:', err);
    return json({ error: message }, { status: 500 });
  }
};
