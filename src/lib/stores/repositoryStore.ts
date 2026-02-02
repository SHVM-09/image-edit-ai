import type { StateSnapshot } from '$lib/stores/versionStore';
import { get } from 'svelte/store';
import { canvasTransformStore } from '$lib/stores/canvasTransformStore';
import { elementsStore } from '$lib/stores/elementsStore';

const STORAGE_KEY = 'image-edit-ai-repository';
const MAX_ITEMS = 100;

export interface RepositoryItem {
  id: string;
  createdAt: number;
  label?: string;
  snapshot: StateSnapshot;
}

function nextId(): string {
  return `repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadRepository(): RepositoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RepositoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRepository(items: RepositoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('repositoryStore: failed to write localStorage', e);
  }
}

/**
 * Save current canvas + elements state to repository (good images for reference).
 */
export function saveToRepository(label?: string): RepositoryItem {
  const snapshot: StateSnapshot = {
    canvas: get(canvasTransformStore),
    elements: get(elementsStore)
  };
  const item: RepositoryItem = {
    id: nextId(),
    createdAt: Date.now(),
    label: label ?? undefined,
    snapshot: JSON.parse(JSON.stringify(snapshot)) as StateSnapshot
  };
  const items = loadRepository();
  items.unshift(item);
  saveRepository(items.slice(0, MAX_ITEMS));
  return item;
}

/**
 * List repository items (id, createdAt, label) for UI.
 */
export function listRepository(): Omit<RepositoryItem, 'snapshot'>[] {
  return loadRepository().map(({ id, createdAt, label }) => ({ id, createdAt, label }));
}

/**
 * Get full snapshot by id (e.g. to restore or use as reference).
 */
export function getRepositoryItem(id: string): RepositoryItem | undefined {
  return loadRepository().find((item) => item.id === id);
}

/**
 * Remove item from repository.
 */
export function removeFromRepository(id: string): boolean {
  const items = loadRepository();
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  saveRepository(filtered);
  return true;
}
