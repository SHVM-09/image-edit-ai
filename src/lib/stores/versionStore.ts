import type { CanvasTransformState } from '$lib/stores/canvasTransformStore';
import type { ElementsState } from '$lib/stores/elementsStore';
import { canvasTransformStore } from '$lib/stores/canvasTransformStore';
import { elementsStore } from '$lib/stores/elementsStore';

const STORAGE_KEY = 'image-edit-ai-versions';
const MAX_VERSIONS = 50;

export interface StateSnapshot {
  canvas: CanvasTransformState;
  elements: ElementsState;
}

export interface VersionSnapshot extends StateSnapshot {
  id: string;
  createdAt: number;
}

export interface VersionSummary {
  id: string;
  createdAt: number;
}

function nextVersionId(): string {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadVersions(): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VersionSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: VersionSnapshot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch (e) {
    console.warn('versionStore: failed to write localStorage', e);
  }
}

/**
 * Save current-style state (canvas + elements) as a new version.
 * Uses localStorage. Keeps up to MAX_VERSIONS entries (oldest removed first).
 */
export function saveVersion(stateSnapshot: StateSnapshot): VersionSnapshot {
  const snapshot: VersionSnapshot = {
    ...stateSnapshot,
    id: nextVersionId(),
    createdAt: Date.now()
  };
  const versions = loadVersions();
  versions.unshift(snapshot);
  const trimmed = versions.slice(0, MAX_VERSIONS);
  saveVersions(trimmed);
  return snapshot;
}

/**
 * List saved versions (id + createdAt) for UI.
 */
export function listVersions(): VersionSummary[] {
  const versions = loadVersions();
  return versions.map((v) => ({ id: v.id, createdAt: v.createdAt }));
}

/**
 * Restore a version by id: applies snapshot to canvas + elements stores.
 * No-op if id not found.
 */
export function restoreVersion(id: string): boolean {
  const versions = loadVersions();
  const snapshot = versions.find((v) => v.id === id);
  if (!snapshot) return false;
  canvasTransformStore.set(JSON.parse(JSON.stringify(snapshot.canvas)));
  elementsStore.set(JSON.parse(JSON.stringify(snapshot.elements)));
  return true;
}
