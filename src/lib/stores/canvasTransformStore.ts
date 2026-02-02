import { writable } from 'svelte/store';

export interface CanvasTransformState {
  imageUrl: string | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

const initialState: CanvasTransformState = {
  imageUrl: null,
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1
};

export const canvasTransformStore = writable<CanvasTransformState>({
  ...initialState
});

export function setCanvasImage(url: string | null) {
  canvasTransformStore.update((s) => ({ ...s, imageUrl: url }));
}

export function setCanvasPosition(x: number, y: number) {
  canvasTransformStore.update((s) => ({ ...s, x, y }));
}

export function setCanvasScale(scale: number) {
  canvasTransformStore.update((s) => ({ ...s, scale }));
}

export function setCanvasRotation(rotation: number) {
  canvasTransformStore.update((s) => ({ ...s, rotation }));
}

export function setCanvasOpacity(opacity: number) {
  canvasTransformStore.update((s) => ({ ...s, opacity }));
}

export function resetCanvasTransform() {
  canvasTransformStore.set({ ...initialState });
}
