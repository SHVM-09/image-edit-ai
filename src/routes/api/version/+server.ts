import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertVersion } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  let body: {
    state: { canvas: unknown; elements: unknown };
    promptUsed?: string | null;
    editHistory?: string[];
  } = { state: { canvas: {}, elements: {} } };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { state, promptUsed, editHistory } = body;
  if (!state || typeof state !== 'object' || !state.canvas || !state.elements) {
    return json({ error: 'state must include canvas and elements' }, { status: 400 });
  }

  try {
    const result = insertVersion(state as { canvas: unknown; elements: unknown }, {
      promptUsed: promptUsed ?? null,
      editHistory: Array.isArray(editHistory) ? editHistory : undefined
    });
    return json({ id: result.id, createdAt: result.createdAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Version save failed';
    console.error('version save error:', err);
    return json({ error: message }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const { listVersions } = await import('$lib/server/db');
    const items = listVersions();
    return json({ versions: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'List failed';
    console.error('versions list error:', err);
    return json({ error: message }, { status: 500 });
  }
};
