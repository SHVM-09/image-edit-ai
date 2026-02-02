import { get, writable } from 'svelte/store';
import type { ImageElement } from '$lib/models/imageElement';
import {
  createEmptyBoundingBox,
  createEmptyPosition
} from '$lib/models/imageElement';

export interface ElementsState {
  mainImage: string | null;
  elementList: ImageElement[];
  selectedElement: string | null;
}

const initialState: ElementsState = {
  mainImage: null,
  elementList: [],
  selectedElement: null
};

function nextId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const elementsStore = writable<ElementsState>({ ...initialState });

export function setMainImage(url: string | null) {
  elementsStore.update((s) => ({ ...s, mainImage: url }));
}

export function addElement(
  partial: Partial<Omit<ImageElement, 'id'>> & { type: ImageElement['type'] }
): ImageElement {
  const element: ImageElement = {
    id: nextId(),
    type: partial.type,
    boundingBox: partial.boundingBox ?? createEmptyBoundingBox(),
    imageUrl: partial.imageUrl ?? '',
    originalImageUrl: partial.originalImageUrl ?? partial.imageUrl ?? '',
    textContent: partial.textContent ?? '',
    color: partial.color ?? '#000000',
    zIndex: partial.zIndex ?? 0,
    opacity: partial.opacity ?? 1,
    rotation: partial.rotation ?? 0,
    scale: partial.scale ?? 1,
    position: partial.position ?? createEmptyPosition(),
    fontSize: partial.fontSize ?? 16,
    fontFamily: partial.fontFamily ?? 'sans-serif'
  };
  elementsStore.update((s) => ({
    ...s,
    elementList: [...s.elementList, element]
  }));
  return element;
}

export function updateElement(id: string, updates: Partial<Omit<ImageElement, 'id'>>) {
  elementsStore.update((s) => ({
    ...s,
    elementList: s.elementList.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    )
  }));
}

export function removeElement(id: string) {
  elementsStore.update((s) => ({
    ...s,
    elementList: s.elementList.filter((el) => el.id !== id),
    selectedElement: s.selectedElement === id ? null : s.selectedElement
  }));
}

export function setSelectedElement(id: string | null) {
  elementsStore.update((s) => ({ ...s, selectedElement: id }));
}

export function getElementById(id: string): ImageElement | undefined {
  return get(elementsStore).elementList.find((el) => el.id === id);
}

/**
 * Reorder elementList: move element at fromIndex to toIndex.
 */
export function reorderElement(fromIndex: number, toIndex: number): void {
  elementsStore.update((s) => {
    const list = [...s.elementList];
    const [removed] = list.splice(fromIndex, 1);
    if (!removed) return s;
    list.splice(toIndex, 0, removed);
    return { ...s, elementList: list };
  });
}

export function resetElementsStore() {
  elementsStore.set({ ...initialState });
}
