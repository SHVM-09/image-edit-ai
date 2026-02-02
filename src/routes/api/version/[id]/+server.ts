import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVersion } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: 'Missing id' }, { status: 400 });
  try {
    const state = getVersion(id);
    if (!state) return json({ error: 'Version not found' }, { status: 404 });
    return json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Load failed';
    console.error('version get error:', err);
    return json({ error: message }, { status: 500 });
  }
};
